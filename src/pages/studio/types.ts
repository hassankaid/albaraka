/**
 * Studio Albaraka — types locaux.
 *
 * Tant que `src/integrations/supabase/types.ts` n'est pas régénéré pour
 * inclure `studio_projects`, on type ici en explicite. À nettoyer en V2.
 */

export type StudioProjectStatus =
  | "draft"
  | "audio_uploaded"
  | "transcribed"
  | "broll_ready"
  | "processing"
  | "done"
  | "failed";

export type StudioProjectSource = "manual" | "personal_brand";

/**
 * Lien de provenance vers Personal Brand. Stocké en jsonb dans
 * `studio_projects.source_personal_brand`. Permet à l'élève de revenir
 * sur la semaine d'origine + de marquer le script comme "produit en vidéo"
 * en V2 (non implémenté en B1).
 */
export interface PersonalBrandSourceRef {
  week_row_id: string;
  week_num: 1 | 2 | 3 | 4;
  script_day: number; // 1..7
  mode: "pass" | "liberty";
}

/**
 * Un segment timestamp + son b-roll associé. Rempli progressivement :
 *   - B3 : start_ms, end_ms, text
 *   - B4 : broll_path, broll_prompt
 */
export interface StudioSegment {
  idx: number;
  start_ms: number;
  end_ms: number;
  text: string;
  broll_path?: string | null;
  broll_prompt?: string | null;
}

/**
 * Transcription Whisper brute. Forme exacte dépend du modèle (B3).
 * On garde flexible pour l'instant.
 */
export interface StudioTranscript {
  words?: Array<{ word: string; start: number; end: number }>;
  language?: string;
  duration?: number;
  text?: string;
}

export interface StudioProject {
  id: string;
  user_id: string;
  title: string | null;
  status: StudioProjectStatus;
  source: StudioProjectSource;
  source_personal_brand: PersonalBrandSourceRef | null;
  script_text: string | null;
  audio_path: string | null;
  audio_duration_seconds: number | null;
  transcript_json: StudioTranscript | null;
  segments_json: StudioSegment[] | null;
  output_path: string | null;
  output_duration_seconds: number | null;
  job_id: string | null;
  error_message: string | null;
  cost_cents: number;
  created_at: string;
  updated_at: string;
}

export const STATUS_LABEL: Record<StudioProjectStatus, string> = {
  draft: "Brouillon",
  audio_uploaded: "Audio uploadé",
  transcribed: "Transcrit",
  broll_ready: "B-rolls prêts",
  processing: "En cours de rendu",
  done: "Terminée",
  failed: "Échec",
};

export const STATUS_TONE: Record<
  StudioProjectStatus,
  "default" | "primary" | "warning" | "success" | "danger"
> = {
  draft: "default",
  audio_uploaded: "primary",
  transcribed: "primary",
  broll_ready: "primary",
  processing: "warning",
  done: "success",
  failed: "danger",
};
