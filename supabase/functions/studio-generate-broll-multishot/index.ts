// Studio Albaraka — Brique B4 v9 : multi-shot Kling 3.0 Pro via webhook fal.ai
//
// Architecture finale (après échec v7 timeout 150s et v8 EdgeRuntime.waitUntil()
// peu fiable) : on submit Kling avec un webhook_url qui pointe vers notre
// edge function studio-broll-webhook. fal.ai callback ce webhook quand le
// job termine, on persiste alors les segments. AUCUN polling synchrone.
//
// Workflow :
//   1. Auth + ownership
//   2. Validate segments + compose multi_prompt
//   3. Submit Kling avec webhook_url
//   4. INSERT studio_broll_pending_jobs (track le mapping request_id → segments)
//   5. Return immédiat au client { pending: true, kling_request_id }
//
// Le frontend polle ensuite la BDD via refetchInterval. Quand le webhook
// reçoit le callback fal.ai, il persiste les segments → ils apparaissent
// automatiquement dans le projet.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface StudioSegment {
  idx: number;
  start_ms: number;
  end_ms: number;
  text: string;
  broll_path?: string | null;
  broll_prompt?: string | null;
}

const FAL_T2V_URL = "https://queue.fal.run/fal-ai/kling-video/o3/pro/text-to-video";
const MAX_GROUP_DURATION_S = 15;
const MIN_SHOT_DURATION_S = 3;

interface FalSubmitResponse {
  request_id: string;
  status?: string;
  status_url?: string;
  response_url?: string;
}

async function submitMultiShotWithWebhook(
  multiPrompt: Array<{ prompt: string; duration: string }>,
  webhookUrl: string,
  falKey: string,
): Promise<FalSubmitResponse> {
  // fal.ai accepte webhook_url en query parameter sur le queue endpoint
  const urlWithWebhook = `${FAL_T2V_URL}?fal_webhook=${encodeURIComponent(webhookUrl)}`;

  const res = await fetch(urlWithWebhook, {
    method: "POST",
    headers: {
      Authorization: `Key ${falKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      multi_prompt: multiPrompt,
      shot_type: "customize",
      aspect_ratio: "9:16",
      generate_audio: false,
    }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(
      `fal.ai Kling submit a échoué (${res.status}): ${errText.slice(0, 300)}`,
    );
  }
  const data = (await res.json()) as FalSubmitResponse;
  if (!data?.request_id) throw new Error(`fal.ai sans request_id`);
  console.log(
    `[broll-multishot] Kling submit OK · request_id=${data.request_id} · webhook=${webhookUrl}`,
  );
  return data;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing authorization" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const falKey = Deno.env.get("FAL_KEY");
    if (!falKey) return json({ error: "FAL_KEY non configurée." }, 500);

    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await supabaseUser.auth.getUser();
    if (userErr || !user) return json({ error: "Non authentifié" }, 401);

    const { project_id, segment_indices } = await req.json();
    if (!project_id || typeof project_id !== "string")
      return json({ error: "project_id manquant" }, 400);
    if (!Array.isArray(segment_indices) || segment_indices.length === 0)
      return json({ error: "segment_indices doit être un array non vide" }, 400);
    if (segment_indices.length > 6)
      return json({ error: "Max 6 shots par appel Kling multi-shot" }, 400);

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { data: project, error: projErr } = await supabaseAdmin
      .from("studio_projects")
      .select("id, user_id, segments_json, status")
      .eq("id", project_id)
      .maybeSingle();
    if (projErr) return json({ error: `Erreur BDD : ${projErr.message}` }, 500);
    if (!project) return json({ error: "Projet introuvable" }, 404);

    if (project.user_id !== user.id) {
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();
      if (profile?.role !== "ceo") return json({ error: "Accès refusé" }, 403);
    }

    const allSegments = (project.segments_json ?? []) as StudioSegment[];
    const groupSegments: StudioSegment[] = [];
    for (const idx of segment_indices) {
      const seg = allSegments.find((s) => s.idx === idx);
      if (!seg) return json({ error: `Segment idx=${idx} introuvable` }, 404);
      if (!seg.broll_prompt || seg.broll_prompt.trim().length === 0) {
        return json(
          {
            error: `Segment ${idx} n'a pas de broll_prompt — lance d'abord 'Planifier'`,
          },
          400,
        );
      }
      groupSegments.push(seg);
    }

    // Calcule les durations
    let durations = groupSegments.map((s) => {
      const d = (s.end_ms - s.start_ms) / 1000;
      return Math.max(MIN_SHOT_DURATION_S, Math.round(d));
    });
    let totalDur = durations.reduce((a, b) => a + b, 0);
    if (totalDur > MAX_GROUP_DURATION_S) {
      const scale = MAX_GROUP_DURATION_S / totalDur;
      durations = durations.map((d) =>
        Math.max(MIN_SHOT_DURATION_S, Math.floor(d * scale)),
      );
      totalDur = durations.reduce((a, b) => a + b, 0);
      if (totalDur < MAX_GROUP_DURATION_S && durations.length > 0) {
        durations[durations.length - 1] += MAX_GROUP_DURATION_S - totalDur;
        totalDur = MAX_GROUP_DURATION_S;
      }
    }

    const multiPrompt = groupSegments.map((s, i) => ({
      prompt: s.broll_prompt!,
      duration: String(durations[i]),
    }));

    // Webhook URL pointe vers notre edge function studio-broll-webhook
    const webhookUrl = `${supabaseUrl}/functions/v1/studio-broll-webhook`;

    console.log(
      `[broll-multishot] project=${project_id} group=[${segment_indices.join(",")}] · ${multiPrompt.length} shots × ${durations.join("+")}s = ${totalDur}s · webhook=${webhookUrl}`,
    );

    // SUBMIT avec webhook (fal callbackera quand terminé, on n'attend plus rien)
    const submitData = await submitMultiShotWithWebhook(multiPrompt, webhookUrl, falKey);

    // INSERT pending_job pour que le webhook puisse retrouver le contexte
    const { error: insertErr } = await supabaseAdmin
      .from("studio_broll_pending_jobs")
      .insert({
        project_id,
        kling_request_id: submitData.request_id,
        segment_indices,
        durations,
        prompts: groupSegments.map((s) => s.broll_prompt!),
        total_duration_s: totalDur,
        status: "pending",
      });
    if (insertErr) {
      console.error(
        `[broll-multishot] pending_job INSERT échoué: ${insertErr.message}`,
      );
      // Le job tournera chez fal mais le webhook ne saura pas quoi en faire.
      // On retourne quand même le request_id pour debug.
    }

    return json({
      success: true,
      pending: true,
      kling_request_id: submitData.request_id,
      segment_indices,
      group_duration_s: totalDur,
      model: "kling-3.0-pro-multishot",
      webhook_url: webhookUrl,
      message: "Job submitted with webhook. fal.ai will callback when done.",
    });
  } catch (e) {
    console.error("[broll-multishot] uncaught", e);
    return json({ error: (e as Error)?.message ?? "Erreur inconnue" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
