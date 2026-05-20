// Studio Albaraka — Brique B5 v1 : webhook JSON2Video pour rendu final.
//
// JSON2Video callback cette function quand un movie est terminé. Payload
// type (json content-type) :
//   {
//     "width": 1080,
//     "height": 1920,
//     "duration": 32.5,
//     "size": 8412034,
//     "url": "https://assets.json2video.com/.../final.mp4",
//     "id": "studio_abc12345",        // notre movie.id custom
//     "client-data": {                 // <-- notre client-data
//       "project_id": "...",
//       "render_job_id": "...",
//       "caption_preset": "karaoke"
//     }
//   }
//
// En cas d'erreur de rendu, la payload contient `status: "error"` + `message`.
//
// On télécharge le MP4 depuis le CDN JSON2Video, on l'upload dans Storage
// au path {user_id}/projects/{project_id}/final.mp4, on update
// studio_projects.output_path + status = done, et on marque render_job
// completed.
//
// IMPORTANT : verify_jwt=false (JSON2Video n'a pas notre JWT). Validation
// via studio_render_jobs : si render_job_id inconnu ou déjà completed,
// on ignore.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
};

interface RenderJob {
  id: string;
  project_id: string;
  render_id: string;
  status: "pending" | "completed" | "failed";
}

interface J2vWebhookPayload {
  id?: string;
  url?: string;
  width?: number;
  height?: number;
  duration?: number;
  size?: number;
  status?: string;
  message?: string;
  movie?: {
    status?: string;
    url?: string;
    duration?: number;
    width?: number;
    height?: number;
    size?: number;
    message?: string;
  };
  "client-data"?: {
    project_id?: string;
    render_job_id?: string;
    caption_preset?: string;
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Parse webhook payload — JSON2Video peut envoyer en JSON ou urlencoded.
    // On accepte les deux pour être robuste.
    let body: J2vWebhookPayload;
    const contentType = req.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      body = (await req.json()) as J2vWebhookPayload;
    } else {
      const text = await req.text();
      try {
        body = JSON.parse(text) as J2vWebhookPayload;
      } catch {
        // Fallback urlencoded — JSON2Video l'envoie en form-data avec
        // potentiellement un payload sérialisé.
        const params = new URLSearchParams(text);
        body = Object.fromEntries(params) as J2vWebhookPayload;
        // client-data peut être stringifié
        const cd = (body as Record<string, unknown>)["client-data"];
        if (typeof cd === "string") {
          try {
            (body as Record<string, unknown>)["client-data"] = JSON.parse(cd);
          } catch {
            // ignore
          }
        }
      }
    }

    console.log(
      `[render-webhook] received · id=${body.id} · status=${body.status ?? body.movie?.status} · url=${body.url ?? body.movie?.url}`,
    );

    // Normalisation : JSON2Video a évolué entre v1 (flat) et v2 (nested
    // sous `movie`). On supporte les deux.
    const movieUrl = body.url ?? body.movie?.url;
    const movieDuration = body.duration ?? body.movie?.duration;
    const movieSize = body.size ?? body.movie?.size;
    const movieStatus = (body.status ?? body.movie?.status ?? "").toLowerCase();
    const movieError = body.message ?? body.movie?.message;

    const clientData = body["client-data"];
    if (!clientData || !clientData.render_job_id) {
      console.warn(
        `[render-webhook] payload sans client-data.render_job_id — ignoring`,
      );
      return json({ ok: true, ignored: true, reason: "no_client_data" });
    }

    // ─── Lookup render_job ──────────────────────────────────────
    const { data: job, error: lookupErr } = await supabaseAdmin
      .from("studio_render_jobs")
      .select("*")
      .eq("id", clientData.render_job_id)
      .maybeSingle();

    if (lookupErr) {
      console.error(`[render-webhook] lookup error: ${lookupErr.message}`);
      return json({ error: lookupErr.message }, 500);
    }
    if (!job) {
      console.warn(
        `[render-webhook] unknown render_job_id=${clientData.render_job_id} — ignoring`,
      );
      return json({ ok: true, ignored: true });
    }
    if (job.status !== "pending") {
      console.log(
        `[render-webhook] render_job already ${job.status} — idempotent ack`,
      );
      return json({ ok: true, already_processed: true });
    }

    const typedJob = job as RenderJob;

    // ─── Cas ERROR ──────────────────────────────────────────────
    const isError =
      movieStatus === "error" || movieStatus === "failed" || !movieUrl;
    if (isError) {
      const errMsg =
        movieError ??
        `Rendu JSON2Video échoué (status=${movieStatus || "unknown"})`;
      console.error(`[render-webhook] FAILED: ${errMsg}`);

      await supabaseAdmin
        .from("studio_render_jobs")
        .update({
          status: "failed",
          error_message: errMsg.slice(0, 500),
          updated_at: new Date().toISOString(),
        })
        .eq("id", typedJob.id);

      await supabaseAdmin
        .from("studio_projects")
        .update({
          status: "failed",
          error_message: `Rendu final : ${errMsg.slice(0, 200)}`,
          updated_at: new Date().toISOString(),
        })
        .eq("id", typedJob.project_id);

      return json({ ok: true, marked_failed: true });
    }

    // ─── Cas OK ─────────────────────────────────────────────────
    console.log(
      `[render-webhook] OK · downloading ${movieUrl} for project=${typedJob.project_id}`,
    );

    const videoRes = await fetch(movieUrl!);
    if (!videoRes.ok) {
      const errMsg = `Téléchargement MP4 JSON2Video échoué: HTTP ${videoRes.status}`;
      console.error(`[render-webhook] ${errMsg}`);
      await supabaseAdmin
        .from("studio_render_jobs")
        .update({
          status: "failed",
          error_message: errMsg,
          updated_at: new Date().toISOString(),
        })
        .eq("id", typedJob.id);
      return json({ error: errMsg }, 500);
    }
    const videoBlob = await videoRes.blob();

    // Récupère le user_id du projet pour le path Storage
    const { data: project, error: projErr } = await supabaseAdmin
      .from("studio_projects")
      .select("user_id")
      .eq("id", typedJob.project_id)
      .maybeSingle();
    if (projErr || !project) {
      const errMsg = `Projet ${typedJob.project_id} introuvable: ${projErr?.message ?? "null"}`;
      console.error(`[render-webhook] ${errMsg}`);
      await supabaseAdmin
        .from("studio_render_jobs")
        .update({
          status: "failed",
          error_message: errMsg,
          updated_at: new Date().toISOString(),
        })
        .eq("id", typedJob.id);
      return json({ error: errMsg }, 404);
    }

    // Upload Storage — on inclut le render_job_id pour permettre plusieurs
    // rendus successifs (l'élève peut tester karaoke puis hormozi). Le path
    // "current" pointe toujours vers le dernier rendu via output_path.
    const finalPath = `${project.user_id}/projects/${typedJob.project_id}/final_${typedJob.id}.mp4`;
    const { error: upErr } = await supabaseAdmin.storage
      .from("studio")
      .upload(finalPath, videoBlob, {
        contentType: "video/mp4",
        upsert: true,
      });
    if (upErr) {
      const errMsg = `Upload Storage échoué: ${upErr.message}`;
      console.error(`[render-webhook] ${errMsg}`);
      await supabaseAdmin
        .from("studio_render_jobs")
        .update({
          status: "failed",
          error_message: errMsg,
          updated_at: new Date().toISOString(),
        })
        .eq("id", typedJob.id);
      return json({ error: errMsg }, 500);
    }
    console.log(`[render-webhook] uploaded to ${finalPath}`);

    // UPDATE studio_projects : output_path + status done
    const { error: projUpErr } = await supabaseAdmin
      .from("studio_projects")
      .update({
        output_path: finalPath,
        output_duration_seconds: movieDuration ?? null,
        status: "done",
        error_message: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", typedJob.project_id);
    if (projUpErr) {
      console.error(
        `[render-webhook] update studio_projects échoué: ${projUpErr.message}`,
      );
    }

    // Mark render_job completed
    await supabaseAdmin
      .from("studio_render_jobs")
      .update({
        status: "completed",
        duration_s: movieDuration ?? null,
        size_bytes: movieSize ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", typedJob.id);

    console.log(
      `[render-webhook] persist OK · project=${typedJob.project_id} · ${movieDuration}s · ${movieSize}B`,
    );

    return json({
      ok: true,
      final_path: finalPath,
      duration_s: movieDuration,
    });
  } catch (e) {
    console.error("[render-webhook] uncaught", e);
    return json({ error: (e as Error)?.message ?? "Erreur inconnue" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
