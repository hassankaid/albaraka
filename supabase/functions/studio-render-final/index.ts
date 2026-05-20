// Studio Albaraka — Brique B5 v1 : rendu final MP4 9:16 via JSON2Video.
//
// Architecture (calque B4 v9 pour réutiliser le pattern webhook stable) :
//   1. Auth + ownership
//   2. Valide que tous les segments ont un broll_path
//   3. Génère signed URLs Storage (audio voix-off + b-rolls)
//   4. Construit le movie JSON2Video :
//        - 1 scène par segment (video element avec seek+duration)
//        - 1 audio movie-level = voix-off
//        - 1 subtitles movie-level (Whisper re-transcription par JSON2Video,
//          word-by-word selon le preset choisi)
//        - exports[0].destinations = webhook → studio-render-webhook
//        - client-data = { project_id, render_job_id } pour corrélation
//   5. POST https://api.json2video.com/v2/movies (x-api-key header)
//   6. INSERT studio_render_jobs (status pending)
//   7. Return { pending: true, render_id }
//
// Le frontend polle ensuite studio_render_jobs via refetchInterval. Quand
// JSON2Video callback notre webhook, on download le MP4, on l'upload dans
// Storage, on set studio_projects.output_path → la vidéo apparaît dans l'UI.

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

type CaptionPreset = "karaoke" | "classic" | "hormozi";

const J2V_ENDPOINT = "https://api.json2video.com/v2/movies";

// ── Presets de sous-titres ─────────────────────────────────────────
// Les 3 styles couvrent les besoins viraux mainstream. On peut en ajouter
// d'autres plus tard (Mr Beast, Ali Abdaal, etc.). Le mapping respecte la
// spec JSON2Video : style + font-family + font-size + word-color + line-color
// + outline + position + max-words-per-line + all-caps.
const CAPTION_PRESETS: Record<CaptionPreset, Record<string, unknown>> = {
  // Karaoke (style Iman Gadzhi / Submagic default) — bloc 3-4 mots, mot
  // courant surligné en or.
  karaoke: {
    style: "boxed-word",
    "font-family": "Montserrat",
    "font-size": 90,
    "font-weight": 800,
    "word-color": "#F5D547",
    "line-color": "#FFFFFF",
    "outline-color": "#000000",
    "outline-width": 4,
    "shadow-color": "#000000",
    "shadow-offset": 3,
    position: "mid-bottom-center",
    "max-words-per-line": 4,
    "all-caps": true,
  },
  // Classique (style YouTube Shorts standard) — 5-6 mots, texte blanc
  // outliné noir, pas de couleur de surbrillance.
  classic: {
    style: "classic-progressive",
    "font-family": "Montserrat",
    "font-size": 70,
    "font-weight": 700,
    "line-color": "#FFFFFF",
    "outline-color": "#000000",
    "outline-width": 4,
    position: "mid-bottom-center",
    "max-words-per-line": 6,
    "all-caps": false,
  },
  // Hormozi (style Alex Hormozi / Mr Beast viral) — 1 mot à la fois,
  // ÉNORME, jaune saturé, centré, shadow épaisse.
  hormozi: {
    style: "classic-one-word",
    "font-family": "Anton",
    "font-size": 130,
    "font-weight": 900,
    "word-color": "#FFEB3B",
    "line-color": "#FFFFFF",
    "outline-color": "#000000",
    "outline-width": 6,
    "shadow-color": "#000000",
    "shadow-offset": 5,
    position: "center-center",
    "max-words-per-line": 1,
    "all-caps": true,
  },
};

async function signedUrl(
  supabaseAdmin: ReturnType<typeof createClient>,
  path: string,
  expiresIn = 7200, // 2h — large pour laisser le temps au rendu JSON2Video
): Promise<string> {
  const { data, error } = await supabaseAdmin.storage
    .from("studio")
    .createSignedUrl(path, expiresIn);
  if (error || !data?.signedUrl) {
    throw new Error(
      `Signed URL échoué pour ${path}: ${error?.message ?? "no url"}`,
    );
  }
  return data.signedUrl;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing authorization" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const j2vKey = Deno.env.get("JSON2VIDEO_API_KEY");
    if (!j2vKey) return json({ error: "JSON2VIDEO_API_KEY non configurée." }, 500);

    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await supabaseUser.auth.getUser();
    if (userErr || !user) return json({ error: "Non authentifié" }, 401);

    const { project_id, caption_preset } = await req.json();
    if (!project_id || typeof project_id !== "string")
      return json({ error: "project_id manquant" }, 400);

    const preset: CaptionPreset =
      caption_preset === "classic" || caption_preset === "hormozi"
        ? caption_preset
        : "karaoke";

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // ─── Charge projet + check ownership ─────────────────────────
    const { data: project, error: projErr } = await supabaseAdmin
      .from("studio_projects")
      .select(
        "id, user_id, audio_path, audio_duration_seconds, segments_json, transcript_json, status",
      )
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

    if (!project.audio_path) {
      return json(
        { error: "Voix-off manquante — upload l'audio avant le rendu." },
        400,
      );
    }

    const segments = (project.segments_json ?? []) as StudioSegment[];
    if (segments.length === 0) {
      return json(
        { error: "Aucun segment — lance la transcription avant le rendu." },
        400,
      );
    }

    // Tous les segments doivent avoir un broll_path. Si un seul manque,
    // on refuse pour éviter un MP4 avec des trous noirs.
    const missing = segments.filter((s) => !s.broll_path);
    if (missing.length > 0) {
      return json(
        {
          error: `B-rolls manquants pour ${missing.length} segment(s). Termine la génération avant le rendu.`,
          missing_indices: missing.map((s) => s.idx),
        },
        400,
      );
    }

    // ─── Signed URLs ──────────────────────────────────────────────
    const audioUrl = await signedUrl(supabaseAdmin, project.audio_path);

    // Cache les signed URLs par broll_path pour éviter de re-signer la même
    // vidéo plusieurs fois (segments d'un même groupe Kling partagent
    // broll_path).
    const brollUrlCache = new Map<string, string>();
    async function getBrollUrl(path: string): Promise<string> {
      const cached = brollUrlCache.get(path);
      if (cached) return cached;
      const url = await signedUrl(supabaseAdmin, path);
      brollUrlCache.set(path, url);
      return url;
    }

    // ─── Construit les scenes JSON2Video ─────────────────────────
    // 1 scène par segment, ordre = idx croissant. Pour chaque segment :
    //   - duration = (end_ms - start_ms) / 1000
    //   - video element avec seek = broll_start_ms / 1000 si offsets dispo
    //     (multi-shot Kling group), sinon seek = 0 (single-shot legacy).
    //   - cover toute la durée du segment (pas de gaps).
    const orderedSegments = [...segments].sort((a, b) => a.idx - b.idx);

    const scenes = [];
    for (const seg of orderedSegments) {
      const segDuration = Math.max(0.5, (seg.end_ms - seg.start_ms) / 1000);
      const brollPath = seg.broll_path!;
      const brollUrl = await getBrollUrl(brollPath);

      // Offsets multi-shot (B4 v7+) ou single-shot legacy ?
      const hasOffsets =
        typeof seg.broll_start_ms === "number" &&
        typeof seg.broll_end_ms === "number";
      const seek = hasOffsets ? (seg.broll_start_ms as number) / 1000 : 0;
      const brollDur = hasOffsets
        ? (seg.broll_end_ms as number) / 1000 - seek
        : segDuration;

      scenes.push({
        comment: `seg ${seg.idx} · ${seg.text.slice(0, 60)}`,
        duration: segDuration,
        elements: [
          {
            type: "video",
            src: brollUrl,
            seek,
            // duration ici = durée à utiliser dans la scène. On cap à
            // segDuration pour éviter de déborder, et si broll < segDuration
            // on laisse JSON2Video freeze sur la dernière frame (default).
            duration: Math.min(brollDur, segDuration),
            "fit-mode": "cover",
            volume: 0, // mute le son du b-roll, on garde uniquement la voix-off
          },
        ],
      });
    }

    // ─── Movie-level elements : audio voix-off + sous-titres ──────
    const audioDuration =
      project.audio_duration_seconds ??
      orderedSegments[orderedSegments.length - 1].end_ms / 1000;

    // Langue : on lit transcript_json.language si dispo, sinon "fr"
    const transcript = (project.transcript_json ?? {}) as { language?: string };
    const lang = transcript.language ?? "fr";

    const movieElements: Array<Record<string, unknown>> = [
      {
        type: "audio",
        src: audioUrl,
        duration: audioDuration,
      },
      {
        type: "subtitles",
        // Pas de captions URL → JSON2Video re-transcrit avec son propre
        // Whisper. On lui passe la langue pour qu'il pioche le bon modèle.
        // Coût : compté dans nos crédits JSON2Video (Whisper inclus).
        model: "whisper",
        language: lang,
        settings: CAPTION_PRESETS[preset],
      },
    ];

    // ─── INSERT render_job AVANT le submit pour avoir l'ID dans client-data
    const { data: renderJob, error: insertErr } = await supabaseAdmin
      .from("studio_render_jobs")
      .insert({
        project_id,
        render_id: `placeholder-${crypto.randomUUID()}`, // sera UPDATE après submit
        caption_preset: preset,
        status: "pending",
      })
      .select("id")
      .single();
    if (insertErr || !renderJob) {
      return json(
        { error: `INSERT render_job échoué: ${insertErr?.message}` },
        500,
      );
    }

    // ─── Build movie JSON ────────────────────────────────────────
    const webhookUrl = `${supabaseUrl}/functions/v1/studio-render-webhook`;
    const moviePayload = {
      // 9:16 vertical — 1080×1920
      resolution: "instagram-story",
      quality: "high",
      // ID logique pour debug côté JSON2Video
      id: `studio_${project_id.slice(0, 8)}`,
      // client-data : remonté tel quel dans le webhook payload pour qu'on
      // retrouve le render_job sans devoir muxer par render_id.
      "client-data": {
        project_id,
        render_job_id: renderJob.id,
        caption_preset: preset,
      },
      scenes,
      elements: movieElements,
      exports: [
        {
          destinations: [
            {
              type: "webhook",
              endpoint: webhookUrl,
            },
          ],
        },
      ],
    };

    console.log(
      `[render-final] project=${project_id} preset=${preset} · ${scenes.length} scenes · audio=${audioDuration}s · webhook=${webhookUrl}`,
    );

    // ─── POST JSON2Video ─────────────────────────────────────────
    const res = await fetch(J2V_ENDPOINT, {
      method: "POST",
      headers: {
        "x-api-key": j2vKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(moviePayload),
    });
    if (!res.ok) {
      const errText = await res.text();
      // Cleanup le render_job si le submit échoue
      await supabaseAdmin
        .from("studio_render_jobs")
        .update({
          status: "failed",
          error_message: `JSON2Video submit ${res.status}: ${errText.slice(0, 400)}`,
          updated_at: new Date().toISOString(),
        })
        .eq("id", renderJob.id);
      return json(
        {
          error: `JSON2Video a refusé le movie (${res.status}): ${errText.slice(0, 300)}`,
        },
        500,
      );
    }
    const data = (await res.json()) as {
      success: boolean;
      project: string;
      message?: string;
    };
    if (!data?.success || !data?.project) {
      await supabaseAdmin
        .from("studio_render_jobs")
        .update({
          status: "failed",
          error_message: `JSON2Video sans project_id: ${JSON.stringify(data).slice(0, 300)}`,
          updated_at: new Date().toISOString(),
        })
        .eq("id", renderJob.id);
      return json({ error: "JSON2Video sans project_id valide" }, 500);
    }

    // UPDATE le render_id réel
    await supabaseAdmin
      .from("studio_render_jobs")
      .update({
        render_id: data.project,
        updated_at: new Date().toISOString(),
      })
      .eq("id", renderJob.id);

    // Bascule le projet en processing
    await supabaseAdmin
      .from("studio_projects")
      .update({
        status: "processing",
        error_message: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", project_id);

    console.log(
      `[render-final] submit OK · render_id=${data.project} · render_job=${renderJob.id}`,
    );

    return json({
      success: true,
      pending: true,
      render_id: data.project,
      render_job_id: renderJob.id,
      caption_preset: preset,
      nb_scenes: scenes.length,
      audio_duration_s: audioDuration,
      message: "Rendu lancé. JSON2Video callback quand terminé.",
    });
  } catch (e) {
    console.error("[render-final] uncaught", e);
    return json({ error: (e as Error)?.message ?? "Erreur inconnue" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
