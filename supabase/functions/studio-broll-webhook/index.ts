// Studio Albaraka — Brique B4 v9 : webhook fal.ai pour multi-shot Kling 3.0
//
// fal.ai callback cette function quand un job Kling submis avec webhook_url
// est terminé (status OK ou ERROR). On lookup le pending_job correspondant,
// on télécharge la vidéo, on l'upload dans Storage, on update les segments
// du projet via la RPC atomique, et on marque le pending_job comme completed.
//
// IMPORTANT : verify_jwt=false. fal.ai n'a pas notre JWT. On vérifie la
// validité via la table studio_broll_pending_jobs (un request_id inconnu
// ou déjà completed est rejeté/ignoré).
//
// Idempotence : fal.ai peut retenter jusqu'à 10 fois en 2h si la première
// livraison échoue ou met >15s. On gère ça en check status=pending avant
// d'agir, et en early-return si status est déjà completed.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
};

interface FalWebhookPayload {
  request_id: string;
  gateway_request_id?: string;
  status: "OK" | "ERROR" | string;
  payload?: {
    video?: { url: string; duration?: number };
    seed?: number;
  };
  error?: string;
  payload_error?: string;
}

interface PendingJob {
  id: string;
  project_id: string;
  kling_request_id: string;
  segment_indices: number[];
  durations: number[];
  prompts: string[];
  total_duration_s: number;
  status: "pending" | "completed" | "failed";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    if (req.method !== "POST") {
      return json({ error: "Method not allowed" }, 405);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Parse webhook payload
    const body = (await req.json()) as FalWebhookPayload;
    console.log(
      `[broll-webhook] received fal callback · request_id=${body.request_id} status=${body.status}`,
    );

    if (!body.request_id) {
      return json({ error: "Missing request_id" }, 400);
    }

    // Lookup pending job (idempotence : on accepte aussi déjà completed/failed)
    const { data: job, error: lookupErr } = await supabaseAdmin
      .from("studio_broll_pending_jobs")
      .select("*")
      .eq("kling_request_id", body.request_id)
      .maybeSingle();

    if (lookupErr) {
      console.error(`[broll-webhook] lookup error: ${lookupErr.message}`);
      return json({ error: lookupErr.message }, 500);
    }
    if (!job) {
      // Inconnue → on retourne 200 pour éviter que fal retente. C'est sûrement
      // un webhook pour un job déjà supprimé (legacy).
      console.warn(`[broll-webhook] unknown request_id=${body.request_id}, ignoring`);
      return json({ ok: true, ignored: true });
    }
    if (job.status !== "pending") {
      // Déjà traité → idempotence, on accuse réception sans rien refaire
      console.log(`[broll-webhook] job already ${job.status}, idempotent ack`);
      return json({ ok: true, already_processed: true });
    }

    const typedJob = job as PendingJob;

    // ─── Cas ERROR ───────────────────────────────────────────────────
    if (body.status === "ERROR") {
      const errMsg =
        body.error ??
        body.payload_error ??
        JSON.stringify(body).slice(0, 300);
      console.error(`[broll-webhook] fal job FAILED: ${errMsg}`);
      await supabaseAdmin
        .from("studio_broll_pending_jobs")
        .update({
          status: "failed",
          error_message: errMsg.slice(0, 500),
          updated_at: new Date().toISOString(),
        })
        .eq("id", typedJob.id);
      return json({ ok: true, marked_failed: true });
    }

    // ─── Cas OK ─────────────────────────────────────────────────────
    const videoUrl = body.payload?.video?.url;
    if (!videoUrl) {
      const errMsg = `Webhook OK mais sans video.url: ${JSON.stringify(body.payload).slice(0, 200)}`;
      console.error(`[broll-webhook] ${errMsg}`);
      await supabaseAdmin
        .from("studio_broll_pending_jobs")
        .update({
          status: "failed",
          error_message: errMsg.slice(0, 500),
          updated_at: new Date().toISOString(),
        })
        .eq("id", typedJob.id);
      return json({ error: errMsg }, 422);
    }

    const actualDurationS = body.payload?.video?.duration;
    console.log(
      `[broll-webhook] OK · downloading ${videoUrl} for project=${typedJob.project_id} group=[${typedJob.segment_indices.join(",")}]`,
    );

    // Download vidéo depuis fal CDN
    const videoRes = await fetch(videoUrl);
    if (!videoRes.ok) {
      const errMsg = `Téléchargement vidéo fal échoué: HTTP ${videoRes.status}`;
      console.error(`[broll-webhook] ${errMsg}`);
      await supabaseAdmin
        .from("studio_broll_pending_jobs")
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
      console.error(`[broll-webhook] ${errMsg}`);
      await supabaseAdmin
        .from("studio_broll_pending_jobs")
        .update({
          status: "failed",
          error_message: errMsg,
          updated_at: new Date().toISOString(),
        })
        .eq("id", typedJob.id);
      return json({ error: errMsg }, 404);
    }

    // Upload Storage
    const minIdx = Math.min(...typedJob.segment_indices);
    const maxIdx = Math.max(...typedJob.segment_indices);
    const brollPath = `${project.user_id}/projects/${typedJob.project_id}/broll_group_${minIdx}-${maxIdx}.mp4`;
    const { error: upErr } = await supabaseAdmin.storage
      .from("studio")
      .upload(brollPath, videoBlob, {
        contentType: "video/mp4",
        upsert: true,
      });
    if (upErr) {
      const errMsg = `Upload Storage échoué: ${upErr.message}`;
      console.error(`[broll-webhook] ${errMsg}`);
      await supabaseAdmin
        .from("studio_broll_pending_jobs")
        .update({
          status: "failed",
          error_message: errMsg,
          updated_at: new Date().toISOString(),
        })
        .eq("id", typedJob.id);
      return json({ error: errMsg }, 500);
    }
    console.log(`[broll-webhook] uploaded to ${brollPath}`);

    // RPC update pour chaque segment du groupe
    const scaleFactor =
      actualDurationS && actualDurationS > 0
        ? actualDurationS / typedJob.total_duration_s
        : 1;
    let cursorMs = 0;
    for (let i = 0; i < typedJob.segment_indices.length; i++) {
      const segmentIdx = typedJob.segment_indices[i];
      const shotDurationMs = Math.round(typedJob.durations[i] * 1000 * scaleFactor);
      const startMs = cursorMs;
      const endMs =
        i === typedJob.segment_indices.length - 1
          ? Math.round((actualDurationS ?? typedJob.total_duration_s) * 1000)
          : cursorMs + shotDurationMs;
      cursorMs = endMs;

      const { error: rpcErr } = await supabaseAdmin.rpc(
        "update_studio_segment_broll" as any,
        {
          p_project_id: typedJob.project_id,
          p_segment_idx: segmentIdx,
          p_broll_path: brollPath,
          p_broll_prompt: typedJob.prompts[i],
          p_broll_start_ms: startMs,
          p_broll_end_ms: endMs,
        },
      );
      if (rpcErr) {
        console.error(
          `[broll-webhook] RPC failed for segment ${segmentIdx}: ${rpcErr.message}`,
        );
      }
    }

    // Mark job as completed
    await supabaseAdmin
      .from("studio_broll_pending_jobs")
      .update({
        status: "completed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", typedJob.id);

    console.log(
      `[broll-webhook] persist OK · ${typedJob.segment_indices.length} segments updated`,
    );

    return json({
      ok: true,
      broll_path: brollPath,
      segments: typedJob.segment_indices,
    });
  } catch (e) {
    console.error("[broll-webhook] uncaught", e);
    return json({ error: (e as Error)?.message ?? "Erreur inconnue" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
