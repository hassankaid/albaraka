-- B5 v1 (20/05/2026) — Table tracking jobs JSON2Video pour le rendu final MP4
--
-- Mêmes principes que studio_broll_pending_jobs (B4 v9) : on submit le movie
-- JSON2Video avec un exports[].destinations webhook qui pointe vers notre
-- edge function studio-render-webhook. JSON2Video callback quand le rendu
-- est terminé (status done/error). On retrouve le job par render_id et on
-- persiste l'URL du MP4 final.

CREATE TABLE IF NOT EXISTS studio_render_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES studio_projects(id) ON DELETE CASCADE,
  render_id text NOT NULL UNIQUE,
  caption_preset text NOT NULL DEFAULT 'karaoke',
  status text NOT NULL DEFAULT 'pending',
  error_message text,
  duration_s numeric,
  size_bytes bigint,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_studio_render_jobs_render ON studio_render_jobs(render_id);
CREATE INDEX IF NOT EXISTS idx_studio_render_jobs_project_status ON studio_render_jobs(project_id, status);

ALTER TABLE studio_render_jobs ENABLE ROW LEVEL SECURITY;

-- RLS : owner ou CEO peut SELECT. Pas d'INSERT/UPDATE direct (service_role
-- only via edge functions).
DROP POLICY IF EXISTS "render_jobs_select_owner" ON studio_render_jobs;
CREATE POLICY "render_jobs_select_owner"
  ON studio_render_jobs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM studio_projects p
      WHERE p.id = studio_render_jobs.project_id
        AND (
          p.user_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'ceo'
          )
        )
    )
  );

COMMENT ON TABLE studio_render_jobs IS
  'B5 v1 — tracking jobs JSON2Video pour rendu final MP4. studio-render-final INSERT pending, studio-render-webhook update completed/failed + set studio_projects.output_path.';
