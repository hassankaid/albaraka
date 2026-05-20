// Studio Albaraka — Brique B4 : génération d'un b-roll IA pour UN segment.
//
// Workflow appelé par le front pour chaque segment (parallèle ou séquentiel) :
//   1. Auth + ownership check
//   2. Charge le projet + le segment ciblé (segment_idx)
//   3. Claude haiku (via OpenRouter) génère un prompt visuel en anglais
//      (15-25 mots, format 9:16, cinématique, ton halal/Al Baraka)
//   4. fal.ai Seedance 1.0 Pro Fast génère le clip (queue + polling)
//   5. Télécharge le MP4 depuis fal CDN
//   6. Upload dans bucket studio à <user_id>/projects/<project_id>/broll_<idx>.mp4
//   7. UPDATE studio_projects.segments_json[idx] avec broll_path + broll_prompt
//   8. Si tous les segments ont broll_path → status = broll_ready
//
// Secrets Supabase requis :
//   - OPENROUTER_API_KEY   (Claude pour les prompts visuels)
//   - FAL_KEY              (génération vidéo Seedance via fal.ai)
//   - SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY (auto)
//
// Coût : 720p 5s = ~$0.05/clip · prompt Claude haiku = ~$0.001/segment.

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

// Modèle fal.ai à utiliser. Pro Fast = bon compromis prix/qualité (720p, 5s = ~$0.05).
const FAL_MODEL = "fal-ai/bytedance/seedance/v1/pro/fast/text-to-video";
const FAL_QUEUE_URL = `https://queue.fal.run/${FAL_MODEL}`;

// Polling : 60 essais × 3s = 180s max (Edge Function timeout = 150s, on est juste).
const POLL_INTERVAL_MS = 3000;
const MAX_POLL_ATTEMPTS = 50;

const VISUAL_PROMPT_SYSTEM = `Tu génères un prompt court (15-25 mots EN ANGLAIS) pour une IA de génération vidéo (Seedance) à partir d'une phrase d'une vidéo Reel/TikTok d'un apporteur AL BARAKA (entrepreneur musulman français, contenu halal, ton authentique).

CONTRAINTES STRICTES :
- 15 à 25 mots maximum
- EN ANGLAIS (les IA vidéo comprennent mieux)
- Format vertical 9:16 cinématique
- Pas de texte affiché à l'écran (no text overlay)
- Personnages musulmans crédibles si présents (vêtements modestes, ambiance halal)
- Évite : alcool, animaux haram, scènes de fête non halal, références politiques
- Privilégie : lumière naturelle (golden hour, matin, mosquée), Maroc/Maghreb/villes européennes, ambiance contemplative ou pro

EXEMPLES (format-cible) :
"A young muslim entrepreneur on a Marrakech rooftop at sunrise, looking at the Atlas mountains, cinematic golden hour, soft warm light, photo-realistic"
"Hands typing on a laptop in a quiet modern café, espresso cup beside, morning light through window, cinematic close-up, shallow depth of field"
"A father holding his son at the airport gate at dawn, both smiling softly, modern terminal interior, soft natural light, cinematic medium shot"

Réponds UNIQUEMENT avec le prompt brut. Pas de guillemets, pas d'explication, pas de "Voici…".`;

async function generateVisualPrompt(
  segmentText: string,
  openrouterKey: string,
): Promise<string> {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openrouterKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://albarakaecosysteme.com",
      "X-Title": "Albaraka Studio",
    },
    body: JSON.stringify({
      model: "anthropic/claude-3.5-haiku",
      max_tokens: 200,
      temperature: 0.7,
      messages: [
        { role: "system", content: VISUAL_PROMPT_SYSTEM },
        {
          role: "user",
          content: `Phrase à illustrer : "${segmentText}"\n\nPrompt visuel anglais :`,
        },
      ],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Claude (prompt visuel) a échoué: ${errText.slice(0, 200)}`);
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content?.trim();
  if (!content || typeof content !== "string") {
    throw new Error("Claude a renvoyé une réponse vide");
  }
  // Strip d'éventuels guillemets ou backticks au début/fin
  return content.replace(/^["'`]+|["'`]+$/g, "").trim();
}

interface FalSubmitResponse {
  request_id: string;
  status?: string;
  status_url?: string;
  response_url?: string;
  cancel_url?: string;
  gateway_request_id?: string;
}

async function submitFalJob(
  prompt: string,
  durationSec: number,
  falKey: string,
): Promise<FalSubmitResponse> {
  // Seedance accepte 3-12s, on clamp pour la sécurité
  const safeDuration = Math.max(3, Math.min(12, Math.round(durationSec)));

  const res = await fetch(FAL_QUEUE_URL, {
    method: "POST",
    headers: {
      Authorization: `Key ${falKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt,
      aspect_ratio: "9:16",
      resolution: "720p",
      duration: String(safeDuration),
      enable_safety_checker: true,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`fal.ai submit a échoué (${res.status}): ${errText.slice(0, 200)}`);
  }

  const data = (await res.json()) as FalSubmitResponse;
  if (!data?.request_id) {
    throw new Error(`fal.ai a renvoyé une réponse sans request_id: ${JSON.stringify(data).slice(0, 200)}`);
  }
  console.log(
    `[generate-broll] fal.ai submit OK · request_id=${data.request_id} · status_url=${data.status_url ?? "(none)"} · response_url=${data.response_url ?? "(none)"}`,
  );
  return data;
}

interface FalStatusResponse {
  status: "IN_QUEUE" | "IN_PROGRESS" | "COMPLETED" | "FAILED" | string;
  request_id?: string;
  response_url?: string;
  status_url?: string;
  queue_position?: number;
  logs?: Array<{ message: string; timestamp: string }>;
}

async function pollFalJob(
  submitResponse: FalSubmitResponse,
  falKey: string,
): Promise<{ videoUrl: string; seed?: number }> {
  // On utilise les URLs renvoyées par fal.ai dans la réponse de submit
  // (plutôt que de les reconstruire), c'est plus robuste face aux changements
  // de routing côté fal.
  const statusUrl =
    submitResponse.status_url ??
    `${FAL_QUEUE_URL}/requests/${submitResponse.request_id}/status`;
  const resultUrl =
    submitResponse.response_url ??
    `${FAL_QUEUE_URL}/requests/${submitResponse.request_id}`;

  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));

    const statusRes = await fetch(statusUrl, {
      headers: { Authorization: `Key ${falKey}` },
    });
    if (!statusRes.ok) {
      const t = await statusRes.text();
      // Log le statut HTTP + l'URL utilisée pour debug
      console.error(
        `[generate-broll] status check failed ${statusRes.status} on ${statusUrl} · body=${t.slice(0, 300)}`,
      );
      throw new Error(
        `fal.ai status check a échoué (HTTP ${statusRes.status}): ${
          t.slice(0, 200) || "réponse vide"
        }`,
      );
    }
    const statusData = (await statusRes.json()) as FalStatusResponse;

    console.log(
      `[generate-broll] poll ${attempt + 1}/${MAX_POLL_ATTEMPTS} · status=${statusData.status} · queue=${statusData.queue_position ?? "-"}`,
    );

    if (statusData.status === "COMPLETED") {
      const resultRes = await fetch(resultUrl, {
        headers: { Authorization: `Key ${falKey}` },
      });
      if (!resultRes.ok) {
        const t = await resultRes.text();
        throw new Error(`fal.ai result a échoué (HTTP ${resultRes.status}): ${t.slice(0, 200)}`);
      }
      const resultData = await resultRes.json();
      const videoUrl = resultData?.video?.url;
      if (!videoUrl) {
        throw new Error(`fal.ai n'a pas renvoyé d'URL vidéo: ${JSON.stringify(resultData).slice(0, 200)}`);
      }
      return { videoUrl, seed: resultData?.seed };
    }

    if (statusData.status === "FAILED") {
      throw new Error(`fal.ai a marqué le job FAILED: ${JSON.stringify(statusData).slice(0, 300)}`);
    }
  }

  throw new Error(`fal.ai timeout après ${MAX_POLL_ATTEMPTS * POLL_INTERVAL_MS}ms`);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing authorization" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const openrouterKey = Deno.env.get("OPENROUTER_API_KEY");
    const falKey = Deno.env.get("FAL_KEY");

    if (!openrouterKey) {
      return json(
        { error: "OPENROUTER_API_KEY non configurée dans Supabase Secrets." },
        500,
      );
    }
    if (!falKey) {
      return json(
        {
          error:
            "FAL_KEY non configurée. Crée une clé sur https://fal.ai/dashboard/keys et ajoute-la dans Supabase > Edge Functions > Secrets.",
        },
        500,
      );
    }

    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: userErr,
    } = await supabaseUser.auth.getUser();
    if (userErr || !user) return json({ error: "Non authentifié" }, 401);

    const { project_id, segment_idx } = await req.json();
    if (!project_id || typeof project_id !== "string") {
      return json({ error: "project_id manquant" }, 400);
    }
    if (typeof segment_idx !== "number") {
      return json({ error: "segment_idx manquant ou invalide" }, 400);
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
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();
      if (profile?.role !== "ceo") {
        return json({ error: "Accès refusé" }, 403);
      }
    }

    const segments = (project.segments_json ?? []) as StudioSegment[];
    const segment = segments.find((s) => s.idx === segment_idx);
    if (!segment) {
      return json(
        { error: `Segment idx=${segment_idx} introuvable (${segments.length} segments)` },
        404,
      );
    }
    if (!segment.text || segment.text.trim().length === 0) {
      return json({ error: "Le segment a un texte vide" }, 400);
    }

    console.log(
      `[generate-broll] project=${project_id} seg=${segment_idx} text="${segment.text.slice(0, 80)}..."`,
    );

    // 1. Génère le prompt visuel via Claude
    const visualPrompt = await generateVisualPrompt(segment.text, openrouterKey);
    console.log(`[generate-broll] visual prompt: "${visualPrompt}"`);

    // 2. Submit fal.ai job (récupère request_id + status_url + response_url)
    const segmentDurationSec = (segment.end_ms - segment.start_ms) / 1000;
    const submitData = await submitFalJob(visualPrompt, segmentDurationSec, falKey);

    // 3. Poll jusqu'à complétion via les URLs fournies par fal.ai
    const { videoUrl, seed } = await pollFalJob(submitData, falKey);
    console.log(`[generate-broll] video URL ready (seed=${seed}): ${videoUrl}`);

    // 4. Download le MP4
    const videoRes = await fetch(videoUrl);
    if (!videoRes.ok) {
      throw new Error(`Téléchargement vidéo fal.ai échoué: ${videoRes.status}`);
    }
    const videoBlob = await videoRes.blob();

    // 5. Upload Supabase Storage
    const brollPath = `${project.user_id}/projects/${project_id}/broll_${segment_idx}.mp4`;
    const { error: upErr } = await supabaseAdmin.storage
      .from("studio")
      .upload(brollPath, videoBlob, {
        contentType: "video/mp4",
        upsert: true,
      });
    if (upErr) {
      throw new Error(`Upload Storage échoué: ${upErr.message}`);
    }
    console.log(`[generate-broll] uploaded to ${brollPath}`);

    // 6. UPDATE segments_json + check si tous les segments sont prêts
    const updatedSegments = segments.map((s) =>
      s.idx === segment_idx
        ? { ...s, broll_path: brollPath, broll_prompt: visualPrompt }
        : s,
    );
    const allReady = updatedSegments.every((s) => !!s.broll_path);
    const newStatus = allReady ? "broll_ready" : project.status;

    const { error: updateErr } = await supabaseAdmin
      .from("studio_projects")
      .update({
        segments_json: updatedSegments,
        status: newStatus,
      } as any)
      .eq("id", project_id);
    if (updateErr) {
      throw new Error(`UPDATE BDD échoué: ${updateErr.message}`);
    }

    return json({
      success: true,
      segment_idx,
      broll_path: brollPath,
      broll_prompt: visualPrompt,
      seed: seed ?? null,
      all_ready: allReady,
      new_status: newStatus,
    });
  } catch (e) {
    console.error("[generate-broll] uncaught", e);
    return json({ error: (e as Error)?.message ?? "Erreur inconnue" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
