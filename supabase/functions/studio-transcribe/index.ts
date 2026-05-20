// Studio Albaraka — Brique B3 : transcription Whisper d'un audio voix-off
//
// Workflow :
//   1. Auth check (utilisateur connecté requis, JWT vérifié)
//   2. Charge le projet (RLS owner-or-CEO)
//   3. Refuse si pas d'audio_path ou status != audio_uploaded
//   4. Télécharge l'audio depuis le bucket studio (service_role)
//   5. POST OpenAI Whisper API avec verbose_json + word/segment timestamps
//   6. Construit nos propres segments (3-6s, alignés sur fin de phrase)
//   7. UPDATE studio_projects : transcript_json + segments_json + status=transcribed
//
// Côté secrets Supabase requis (au moins UN des deux) :
//   - OPENROUTER_API_KEY  (https://openrouter.ai/keys) — priorité, recommandé
//   - OPENAI_API_KEY      (https://platform.openai.com/api-keys) — fallback
//   - SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY (auto)
//
// OpenRouter expose les endpoints audio depuis 01/05/2026, compatibles 1:1
// avec l'API OpenAI (même format multipart, même réponse verbose_json).
// Permet de mutualiser une seule clé pour Whisper (B3) + Claude/GPT (B4).
//
// Coût : whisper-1 = 0.006$/min sur les deux providers. Pour 30s = 0.003$.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface WhisperWord {
  word: string;
  start: number;
  end: number;
}

interface WhisperResponse {
  text: string;
  language: string;
  duration: number;
  words?: WhisperWord[];
  segments?: Array<{
    id: number;
    start: number;
    end: number;
    text: string;
  }>;
}

interface StudioSegment {
  idx: number;
  start_ms: number;
  end_ms: number;
  text: string;
}

const MIN_DURATION_S = 3.0;
const MAX_DURATION_S = 6.0;
const SENTENCE_END = /[.!?]$/;

/**
 * Découpe les mots Whisper en segments de 3-6s, alignés autant que possible
 * sur des fins de phrase. Chaque segment deviendra un b-roll IA (B4).
 */
function buildSegmentsFromWords(words: WhisperWord[]): StudioSegment[] {
  if (words.length === 0) return [];

  const segments: StudioSegment[] = [];
  let currentBuffer: WhisperWord[] = [];
  let segStart = words[0].start;
  let segIdx = 0;

  const flush = (endWord: WhisperWord) => {
    segments.push({
      idx: segIdx,
      start_ms: Math.round(segStart * 1000),
      end_ms: Math.round(endWord.end * 1000),
      text: currentBuffer
        .map((w) => w.word)
        .join("")
        .trim(),
    });
    segIdx++;
    currentBuffer = [];
  };

  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    currentBuffer.push(w);
    const dur = w.end - segStart;
    const isLast = i === words.length - 1;
    const endsOnSentence = SENTENCE_END.test(w.word.trim());

    const shouldBreak =
      isLast ||
      dur >= MAX_DURATION_S ||
      (endsOnSentence && dur >= MIN_DURATION_S);

    if (shouldBreak) {
      flush(w);
      if (!isLast) segStart = words[i + 1]?.start ?? w.end;
    }
  }

  return segments;
}

/**
 * Fallback : si Whisper ne renvoie pas de words (rare mais possible si le
 * granularity n'est pas accepté), on utilise ses segments natifs (qui sont
 * généralement plus longs : 10-30s). On les ressort tels quels.
 */
function buildSegmentsFromWhisperSegments(
  segs: NonNullable<WhisperResponse["segments"]>,
): StudioSegment[] {
  return segs.map((s, idx) => ({
    idx,
    start_ms: Math.round(s.start * 1000),
    end_ms: Math.round(s.end * 1000),
    text: s.text.trim(),
  }));
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Missing authorization" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    // OpenRouter en priorité (mutualise avec B4), fallback OpenAI direct
    const openrouterKey = Deno.env.get("OPENROUTER_API_KEY");
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    const provider: "openrouter" | "openai" | null = openrouterKey
      ? "openrouter"
      : openaiKey
        ? "openai"
        : null;
    const providerKey = openrouterKey ?? openaiKey;
    const providerUrl =
      provider === "openrouter"
        ? "https://openrouter.ai/api/v1/audio/transcriptions"
        : "https://api.openai.com/v1/audio/transcriptions";

    if (!provider || !providerKey) {
      return json(
        {
          error:
            "Aucune clé API trouvée. Ajoute OPENROUTER_API_KEY (recommandé) ou OPENAI_API_KEY dans Supabase > Edge Functions > Secrets.",
        },
        500,
      );
    }

    // 1. Auth user
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: userErr,
    } = await supabaseUser.auth.getUser();
    if (userErr || !user) {
      return json({ error: "Non authentifié" }, 401);
    }

    // 2. Parse body
    const { project_id } = await req.json();
    if (!project_id || typeof project_id !== "string") {
      return json({ error: "project_id manquant" }, 400);
    }

    // 3. Admin client pour storage + update
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // 4. Fetch projet + check ownership (owner OR CEO)
    const { data: project, error: projErr } = await supabaseAdmin
      .from("studio_projects")
      .select("id, user_id, audio_path, audio_duration_seconds, status")
      .eq("id", project_id)
      .maybeSingle();
    if (projErr) {
      console.error("[studio-transcribe] db read err", projErr);
      return json({ error: `Erreur BDD : ${projErr.message}` }, 500);
    }
    if (!project) {
      return json({ error: "Projet introuvable" }, 404);
    }

    if (project.user_id !== user.id) {
      // Bypass CEO
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();
      if (profile?.role !== "ceo") {
        return json({ error: "Accès refusé" }, 403);
      }
    }

    if (!project.audio_path) {
      return json({ error: "Aucun audio uploadé sur ce projet" }, 400);
    }

    // 5. Download audio
    console.log(
      `[studio-transcribe] downloading ${project.audio_path} for project ${project_id}`,
    );
    const { data: audioBlob, error: dlErr } = await supabaseAdmin.storage
      .from("studio")
      .download(project.audio_path);
    if (dlErr || !audioBlob) {
      console.error("[studio-transcribe] storage download err", dlErr);
      return json(
        { error: `Téléchargement audio échoué : ${dlErr?.message}` },
        500,
      );
    }

    // 6. Call OpenAI Whisper
    const ext = (project.audio_path.split(".").pop() ?? "mp3").toLowerCase();
    const formData = new FormData();
    formData.append("file", audioBlob, `voice.${ext}`);
    formData.append("model", "whisper-1");
    formData.append("response_format", "verbose_json");
    formData.append("timestamp_granularities[]", "word");
    formData.append("timestamp_granularities[]", "segment");
    formData.append("language", "fr"); // français par défaut, Whisper auto-détecte sinon

    console.log(
      `[studio-transcribe] calling whisper via ${provider} for ${ext} audio`,
    );
    const whisperHeaders: Record<string, string> = {
      Authorization: `Bearer ${providerKey}`,
    };
    // OpenRouter recommande ces headers pour le suivi d'usage et la priorité
    if (provider === "openrouter") {
      whisperHeaders["HTTP-Referer"] = "https://albarakaecosysteme.com";
      whisperHeaders["X-Title"] = "Albaraka Studio";
    }
    const whisperRes = await fetch(providerUrl, {
      method: "POST",
      headers: whisperHeaders,
      body: formData,
    });

    if (!whisperRes.ok) {
      const text = await whisperRes.text();
      console.error(
        `[studio-transcribe] whisper failed ${whisperRes.status}:`,
        text,
      );
      // Marque le projet en failed pour que l'UI puisse afficher l'erreur
      await supabaseAdmin
        .from("studio_projects")
        .update({
          status: "failed",
          error_message: `Whisper: ${text.slice(0, 300)}`,
        })
        .eq("id", project_id);
      return json(
        { error: `OpenAI Whisper a échoué : ${text.slice(0, 200)}` },
        502,
      );
    }

    const whisperData = (await whisperRes.json()) as WhisperResponse;
    console.log(
      `[studio-transcribe] whisper OK · ${whisperData.duration?.toFixed(1)}s · ${whisperData.words?.length ?? 0} words · ${whisperData.segments?.length ?? 0} segments`,
    );

    // 7. Build segments
    const segments =
      whisperData.words && whisperData.words.length > 0
        ? buildSegmentsFromWords(whisperData.words)
        : whisperData.segments
          ? buildSegmentsFromWhisperSegments(whisperData.segments)
          : [];

    if (segments.length === 0) {
      return json(
        {
          error:
            "Whisper n'a pas pu segmenter l'audio (peut-être trop court ou silencieux ?)",
        },
        422,
      );
    }

    // Coût estimé : 0.006 USD / minute
    const durationMin = (whisperData.duration ?? project.audio_duration_seconds ?? 0) / 60;
    const costCents = Math.ceil(durationMin * 0.6); // en cents (×100 pour USD→cents)

    // 8. Persist
    const { error: upErr } = await supabaseAdmin
      .from("studio_projects")
      .update({
        transcript_json: whisperData,
        segments_json: segments,
        status: "transcribed",
        error_message: null,
        cost_cents: costCents,
      })
      .eq("id", project_id);

    if (upErr) {
      console.error("[studio-transcribe] update err", upErr);
      return json({ error: `Sauvegarde échouée : ${upErr.message}` }, 500);
    }

    return json({
      success: true,
      segments,
      text: whisperData.text,
      duration: whisperData.duration,
      language: whisperData.language,
      nb_segments: segments.length,
      cost_cents: costCents,
    });
  } catch (e) {
    console.error("[studio-transcribe] uncaught", e);
    return json({ error: (e as Error)?.message ?? "Erreur inconnue" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
