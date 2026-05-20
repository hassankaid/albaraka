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
// Deux endpoints selon qu'on a une image de référence (i2v) ou pas (t2v) :
const FAL_T2V_MODEL = "fal-ai/bytedance/seedance/v1/pro/fast/text-to-video";
const FAL_I2V_MODEL = "fal-ai/bytedance/seedance/v1/pro/fast/image-to-video";
const FAL_T2V_URL = `https://queue.fal.run/${FAL_T2V_MODEL}`;
const FAL_I2V_URL = `https://queue.fal.run/${FAL_I2V_MODEL}`;

// Polling : 60 essais × 3s = 180s max (Edge Function timeout = 150s, on est juste).
const POLL_INTERVAL_MS = 3000;
const MAX_POLL_ATTEMPTS = 50;

const VISUAL_PROMPT_SYSTEM = `Tu es un directeur de la photographie qui transforme UNE phrase de voix-off en prompt visuel pour une IA de génération vidéo (Seedance). Le résultat doit COLLER LITTÉRALEMENT à ce que dit la phrase — pas un décor générique.

MÉTHODE :
1. Identifie le SUJET CONCRET de la phrase (ce qui se passe, qui parle, à qui, où, quand).
2. Choisis UNE scène visuelle qui illustre directement ce sujet. Sois littéral, pas symbolique.
3. Décris cette scène en 18-28 mots en ANGLAIS photo-réaliste.

CONTRAINTES TECHNIQUES :
- 18 à 28 mots EN ANGLAIS
- Format vertical 9:16, photo-realistic, cinematic, shallow depth of field si possible
- AUCUN texte affiché à l'écran (no text overlay, no captions, no signs)
- Spécifie l'éclairage (natural light, golden hour, overcast, soft ambient, neon...)
- Spécifie le cadrage (close-up, medium shot, wide shot, over-the-shoulder, hands shot...)
- Pas d'alcool, pas d'animaux haram, pas de tenues clairement non-modestes, pas de symboles politiques
- Diversité raciale réaliste si personnages : ne par défaut blanc, le sujet est un entrepreneur musulman français mais le scenario peut montrer n'importe quel humain
- N'ajoute PAS d'éléments culturels (Maroc, mosquée, Atlas, etc.) sauf si la phrase les évoque explicitement

EXEMPLES :

Phrase : "Mon père s'est fait licencier après 12 ans dans la même boîte"
→ A middle-aged man in a worn suit walking out of an office building at dusk, holding a small cardboard box, exhausted face, soft overcast light, cinematic medium shot

Phrase : "Je veux pouvoir prier à l'heure sans demander la permission"
→ A young man checking his watch then unrolling a prayer mat on a balcony at golden hour, soft warm light, peaceful expression, cinematic medium shot, shallow depth of field

Phrase : "On dînait en famille, tout le monde rigolait"
→ A family of five sharing dinner around a wooden table, warm soft light from above, laughter and gestures, cinematic medium shot, photo-realistic interior

Phrase : "Le marché halal pèse 2.5 trillions de dollars en 2026"
→ Bustling modern food market with colorful spice stalls and customers shopping, warm afternoon light, cinematic wide shot, photo-realistic, shallow depth of field

Phrase : "Y'a un truc que personne ne te dira jamais"
→ Close-up of two hands gripping a coffee cup at a wooden table, steam rising softly, blurred warm background, cinematic close-up, natural window light, photo-realistic

Réponds UNIQUEMENT avec le prompt brut, en une seule ligne. Pas de guillemets, pas de préfixe, pas d'explication.`;

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
  imageUrl: string | null,
): Promise<FalSubmitResponse> {
  // Seedance accepte 3-12s, on clamp pour la sécurité
  const safeDuration = Math.max(3, Math.min(12, Math.round(durationSec)));

  // Switch text-to-video / image-to-video selon présence d'une image anchor
  const endpoint = imageUrl ? FAL_I2V_URL : FAL_T2V_URL;
  const body: Record<string, unknown> = {
    prompt,
    aspect_ratio: "9:16",
    resolution: "720p",
    duration: String(safeDuration),
    enable_safety_checker: true,
  };
  if (imageUrl) {
    body.image_url = imageUrl;
  }

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Key ${falKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
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
    `[generate-broll] fal.ai submit OK (${imageUrl ? "i2v" : "t2v"}) · request_id=${data.request_id} · status_url=${data.status_url ?? "(none)"} · response_url=${data.response_url ?? "(none)"}`,
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
    `${FAL_T2V_URL}/requests/${submitResponse.request_id}/status`;
  const resultUrl =
    submitResponse.response_url ??
    `${FAL_T2V_URL}/requests/${submitResponse.request_id}`;

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
      .select("id, user_id, segments_json, status, reference_image_path")
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

    // 1. Récupère le prompt visuel :
    //    - Si le segment a un broll_prompt déjà planifié (par studio-plan-brolls
    //      ou édité manuellement) → on le réutilise. Évite la régénération
    //      isolée et préserve la cohérence narrative globale.
    //    - Sinon (fallback) on génère un prompt en silo via Claude haiku.
    let visualPrompt = (segment.broll_prompt ?? "").trim();
    if (!visualPrompt) {
      visualPrompt = await generateVisualPrompt(segment.text, openrouterKey);
      console.log(`[generate-broll] generated prompt: "${visualPrompt}"`);
    } else {
      console.log(`[generate-broll] using planned prompt: "${visualPrompt}"`);
    }

    // 2. Si le projet a une image de référence, on récupère une URL signée
    //    courte (15 min, fal.ai télécharge l'image en quelques secondes).
    let referenceImageUrl: string | null = null;
    if (project.reference_image_path) {
      const { data: signed, error: signedErr } = await supabaseAdmin.storage
        .from("studio")
        .createSignedUrl(project.reference_image_path, 900);
      if (signedErr || !signed?.signedUrl) {
        console.error(
          `[generate-broll] signed URL for reference image failed:`,
          signedErr,
        );
      } else {
        referenceImageUrl = signed.signedUrl;
        console.log(`[generate-broll] using reference image (i2v mode)`);
      }
    }

    // 3. Submit fal.ai job (text-to-video OU image-to-video selon référence)
    const segmentDurationSec = (segment.end_ms - segment.start_ms) / 1000;
    const submitData = await submitFalJob(
      visualPrompt,
      segmentDurationSec,
      falKey,
      referenceImageUrl,
    );

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

    // 6. UPDATE atomique via RPC (évite race condition quand N calls parallèles
    // tournent simultanément — chaque call locke la row via FOR UPDATE).
    const { data: rpcData, error: rpcErr } = await supabaseAdmin.rpc(
      "update_studio_segment_broll" as any,
      {
        p_project_id: project_id,
        p_segment_idx: segment_idx,
        p_broll_path: brollPath,
        p_broll_prompt: visualPrompt,
      },
    );
    if (rpcErr) {
      throw new Error(`RPC update atomique a échoué: ${rpcErr.message}`);
    }
    const allReady = (rpcData as any)?.all_ready === true;

    console.log(`[generate-broll] persist OK · all_ready=${allReady}`);

    return json({
      success: true,
      segment_idx,
      broll_path: brollPath,
      broll_prompt: visualPrompt,
      seed: seed ?? null,
      all_ready: allReady,
      new_status: allReady ? "broll_ready" : project.status,
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
