// Studio Albaraka — Brique B4 v8 : multi-shot Kling 3.0 Pro ASYNCHRONE
//
// V7 timeout-é à 150s (limite Supabase Edge Functions). Kling multi-shot
// prend 2-5 min → trop long pour réponse synchrone. V8 utilise
// EdgeRuntime.waitUntil() : on submit Kling (10s), on répond immédiatement
// au client avec { pending: true }, et le polling + download + persist
// continuent en background pendant jusqu'à 1h après le response.
//
// Frontend : reçoit "pending", maintient le spinner sur les segments du
// groupe, et polle la BDD via refetchInterval pour détecter quand
// broll_path apparaît.
//
// Chaque segment du groupe pointe vers la même vidéo via broll_path mais
// avec des offsets broll_start_ms / broll_end_ms différents. Le rendu
// final (B5) utilisera ces offsets pour découper la vidéo en sous-clips.
//
// Workflow :
//   1. Auth + ownership
//   2. Charge le projet + valide les segments du groupe (broll_prompt requis)
//   3. Compose multi_prompt array { prompt, duration } pour chaque segment
//   4. Submit Kling 3.0 Pro avec shot_type=customize
//   5. Poll + download MP4
//   6. Upload Storage à <user>/projects/<project>/broll_group_<minIdx>_<maxIdx>.mp4
//   7. Pour chaque segment du groupe : RPC atomique avec broll_path commune
//      + offsets calculés à partir des durations cumulées

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
  broll_start_ms?: number | null;
  broll_end_ms?: number | null;
}

// Kling 3.0 Pro contraintes : max 15s par appel, max ~6 shots
const FAL_T2V_URL = "https://queue.fal.run/fal-ai/kling-video/o3/pro/text-to-video";
const MAX_GROUP_DURATION_S = 15;
const MIN_SHOT_DURATION_S = 3;
const POLL_INTERVAL_MS = 3000;
const MAX_POLL_ATTEMPTS = 60; // Kling multi-shot peut prendre plus de temps

interface FalSubmitResponse {
  request_id: string;
  status?: string;
  status_url?: string;
  response_url?: string;
}

async function submitMultiShot(
  multiPrompt: Array<{ prompt: string; duration: string }>,
  falKey: string,
): Promise<FalSubmitResponse> {
  const res = await fetch(FAL_T2V_URL, {
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
    throw new Error(`fal.ai Kling multi-shot submit a échoué (${res.status}): ${errText.slice(0, 300)}`);
  }
  const data = (await res.json()) as FalSubmitResponse;
  if (!data?.request_id) {
    throw new Error(`fal.ai a renvoyé une réponse sans request_id`);
  }
  console.log(
    `[broll-multishot] Kling submit OK · request_id=${data.request_id} · ${multiPrompt.length} shots · status_url=${data.status_url ?? "(none)"}`,
  );
  return data;
}

async function pollKlingJob(
  submitResponse: FalSubmitResponse,
  falKey: string,
): Promise<{ videoUrl: string; seed?: number; duration?: number }> {
  const statusUrl =
    submitResponse.status_url ??
    `https://queue.fal.run/fal-ai/kling-video/requests/${submitResponse.request_id}/status`;
  const resultUrl =
    submitResponse.response_url ??
    `https://queue.fal.run/fal-ai/kling-video/requests/${submitResponse.request_id}`;

  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    const statusRes = await fetch(statusUrl, {
      headers: { Authorization: `Key ${falKey}` },
    });
    if (!statusRes.ok) {
      const t = await statusRes.text();
      throw new Error(
        `Status check échoué (HTTP ${statusRes.status}): ${t.slice(0, 200) || "vide"}`,
      );
    }
    const statusData = await statusRes.json();
    console.log(
      `[broll-multishot] poll ${attempt + 1}/${MAX_POLL_ATTEMPTS} status=${statusData.status} queue=${statusData.queue_position ?? "-"}`,
    );
    if (statusData.status === "COMPLETED") {
      const resultRes = await fetch(resultUrl, {
        headers: { Authorization: `Key ${falKey}` },
      });
      if (!resultRes.ok) {
        const t = await resultRes.text();
        throw new Error(`Result échoué (HTTP ${resultRes.status}): ${t.slice(0, 200)}`);
      }
      const resultData = await resultRes.json();
      const videoUrl = resultData?.video?.url;
      if (!videoUrl) throw new Error("Pas d'URL vidéo dans le résultat");
      return {
        videoUrl,
        seed: resultData?.seed,
        duration: resultData?.video?.duration,
      };
    }
    if (statusData.status === "FAILED") {
      throw new Error(`Kling FAILED: ${JSON.stringify(statusData).slice(0, 300)}`);
    }
  }
  throw new Error(`Timeout après ${MAX_POLL_ATTEMPTS * POLL_INTERVAL_MS}ms`);
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
    if (!project_id || typeof project_id !== "string") {
      return json({ error: "project_id manquant" }, 400);
    }
    if (!Array.isArray(segment_indices) || segment_indices.length === 0) {
      return json({ error: "segment_indices doit être un array non vide" }, 400);
    }
    if (segment_indices.length > 6) {
      return json({ error: "Max 6 shots par appel Kling multi-shot" }, 400);
    }

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
        .from("profiles").select("role").eq("id", user.id).maybeSingle();
      if (profile?.role !== "ceo") return json({ error: "Accès refusé" }, 403);
    }

    const allSegments = (project.segments_json ?? []) as StudioSegment[];
    const groupSegments: StudioSegment[] = [];
    for (const idx of segment_indices) {
      const seg = allSegments.find((s) => s.idx === idx);
      if (!seg) {
        return json({ error: `Segment idx=${idx} introuvable` }, 404);
      }
      if (!seg.broll_prompt || seg.broll_prompt.trim().length === 0) {
        return json(
          { error: `Segment ${idx} n'a pas de broll_prompt — lance d'abord "Planifier"` },
          400,
        );
      }
      groupSegments.push(seg);
    }

    // Calcule les durations : chacune = floor de la durée du segment original,
    // clampée à [MIN_SHOT_DURATION_S, ...], puis scale down si total > 15s.
    let durations = groupSegments.map((s) => {
      const d = (s.end_ms - s.start_ms) / 1000;
      return Math.max(MIN_SHOT_DURATION_S, Math.round(d));
    });
    let totalDur = durations.reduce((a, b) => a + b, 0);
    if (totalDur > MAX_GROUP_DURATION_S) {
      // Scale down proportionnellement à 15s tout en respectant le minimum
      const scale = MAX_GROUP_DURATION_S / totalDur;
      durations = durations.map((d) => Math.max(MIN_SHOT_DURATION_S, Math.floor(d * scale)));
      totalDur = durations.reduce((a, b) => a + b, 0);
      // Ajustement final : si on a perdu des secondes à cause du floor, on les
      // remet sur le dernier shot
      if (totalDur < MAX_GROUP_DURATION_S && durations.length > 0) {
        durations[durations.length - 1] += MAX_GROUP_DURATION_S - totalDur;
        totalDur = MAX_GROUP_DURATION_S;
      }
    }

    const multiPrompt = groupSegments.map((s, i) => ({
      prompt: s.broll_prompt!,
      duration: String(durations[i]),
    }));

    console.log(
      `[broll-multishot] project=${project_id} group=[${segment_indices.join(",")}] · ${multiPrompt.length} shots × ${durations.join("+")}s = ${totalDur}s total`,
    );

    // SUBMIT ONLY (synchrone, ~10s)
    const submitData = await submitMultiShot(multiPrompt, falKey);

    // BACKGROUND TASK : polling + download + upload + RPC persist
    // Cette tâche continue après que la fonction ait répondu au client.
    // Supabase Edge Functions accordent jusqu'à 1h en background via
    // EdgeRuntime.waitUntil(). On contourne ainsi le timeout 150s synchrone.
    const backgroundTask = async () => {
      try {
        console.log(
          `[broll-multishot bg] start polling for group=[${segment_indices.join(",")}]`,
        );
        const { videoUrl, seed, duration: actualDurationS } = await pollKlingJob(
          submitData,
          falKey,
        );
        console.log(
          `[broll-multishot bg] video ready · seed=${seed} · actual=${actualDurationS}s · expected=${totalDur}s`,
        );

        const videoRes = await fetch(videoUrl);
        if (!videoRes.ok) {
          throw new Error(`Téléchargement vidéo échoué: ${videoRes.status}`);
        }
        const videoBlob = await videoRes.blob();

        const minIdx = Math.min(...segment_indices);
        const maxIdx = Math.max(...segment_indices);
        const brollPath = `${project.user_id}/projects/${project_id}/broll_group_${minIdx}-${maxIdx}.mp4`;
        const { error: upErr } = await supabaseAdmin.storage
          .from("studio")
          .upload(brollPath, videoBlob, { contentType: "video/mp4", upsert: true });
        if (upErr) throw new Error(`Upload Storage échoué: ${upErr.message}`);
        console.log(`[broll-multishot bg] uploaded to ${brollPath}`);

        const scaleFactor =
          actualDurationS && actualDurationS > 0 ? actualDurationS / totalDur : 1;
        let cursorMs = 0;

        for (let i = 0; i < groupSegments.length; i++) {
          const shotDurationMs = Math.round(durations[i] * 1000 * scaleFactor);
          const startMs = cursorMs;
          const endMs = i === groupSegments.length - 1
            ? Math.round((actualDurationS ?? totalDur) * 1000)
            : cursorMs + shotDurationMs;
          cursorMs = endMs;

          const { error: rpcErr } = await supabaseAdmin.rpc(
            "update_studio_segment_broll" as any,
            {
              p_project_id: project_id,
              p_segment_idx: groupSegments[i].idx,
              p_broll_path: brollPath,
              p_broll_prompt: groupSegments[i].broll_prompt,
              p_broll_start_ms: startMs,
              p_broll_end_ms: endMs,
            },
          );
          if (rpcErr) {
            console.error(
              `[broll-multishot bg] RPC échouée pour segment ${groupSegments[i].idx}: ${rpcErr.message}`,
            );
          }
        }

        console.log(
          `[broll-multishot bg] persist OK · ${groupSegments.length} segments updated`,
        );
      } catch (e) {
        console.error(
          `[broll-multishot bg] FAILED for group [${segment_indices.join(",")}]:`,
          e,
        );
        // Optionnel : on pourrait écrire l'erreur dans la BDD pour
        // que le front la voie. Pour V1 on log seulement.
      }
    };

    // @ts-ignore — EdgeRuntime est injecté par le runtime Supabase
    EdgeRuntime.waitUntil(backgroundTask());

    // Réponse immédiate au client : le job tourne en background
    return json({
      success: true,
      pending: true,
      kling_request_id: submitData.request_id,
      segment_indices,
      group_duration_s: totalDur,
      model: "kling-3.0-pro-multishot",
      message: "Job submitted, polling in background. Refetch project to detect completion.",
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
