-- B4 v9 (20/05/2026) — Table tracking jobs Kling async via webhook fal.ai

CREATE TABLE IF NOT EXISTS studio_broll_pending_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES studio_projects(id) ON DELETE CASCADE,
  kling_request_id text NOT NULL UNIQUE,
  segment_indices int[] NOT NULL,
  durations int[] NOT NULL,
  prompts text[] NOT NULL,
  total_duration_s int NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_studio_broll_pending_jobs_request ON studio_broll_pending_jobs(kling_request_id);
CREATE INDEX IF NOT EXISTS idx_studio_broll_pending_jobs_project_status ON studio_broll_pending_jobs(project_id, status);

ALTER TABLE studio_broll_pending_jobs ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE studio_broll_pending_jobs IS
  'B4 v9 — tracking jobs Kling multi-shot async via webhook fal.ai. Studio-generate-broll-multishot INSERT pending. Studio-broll-webhook update completed/failed.';
