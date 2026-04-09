-- ============================================================================
-- Cron pg_cron : déclenche activity-weekly-recap chaque lundi matin
-- ============================================================================
-- 07:00 UTC = 08:00 Paris (heure d'hiver) / 09:00 Paris (heure d'été)
-- Génère le récap hebdomadaire pour chaque collaborateur de la semaine écoulée.
-- ============================================================================

SELECT cron.schedule(
  'activity-weekly-recap-monday',
  '0 7 * * 1',
  $$
  SELECT net.http_post(
    url := 'https://ktvszjzryabjgxyobtyc.supabase.co/functions/v1/activity-weekly-recap',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0dnN6anpyeWFiamd4eW9idHljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwMDQwODYsImV4cCI6MjA4NzU4MDA4Nn0.Hck5qF0GQ9-KEMvJiuu10-i-9562mEWBOBuHMTG33ZY"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
