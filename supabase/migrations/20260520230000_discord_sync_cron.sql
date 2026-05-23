-- D4 v1 (20/05/2026) — Cron quotidien pour discord-sync
--
-- Filet de sécurité : tous les jours à 4h du matin, on relance la sync
-- pour tous les users liés. Ça rattrape :
--   - Les users qui ont rejoint le serveur après avoir lié leur Discord
--     (is_guild_member: false → true)
--   - Les triggers qui ont échoué pour raison transitoire (Discord down, rate limit)
--   - Les utilisateurs revenus sur Discord après avoir quitté
--
-- L'edge function discord-sync fait elle-même les checks d'idempotence
-- (déjà granted, progress < 100%, etc.) donc on peut le lancer sans risque.

SELECT cron.schedule(
  'discord-sync-daily',
  '0 4 * * *',  -- 4h du matin tous les jours
  $$
  SELECT net.http_post(
    url := 'https://ktvszjzryabjgxyobtyc.supabase.co/functions/v1/discord-sync',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0dnN6anpyeWFiamd4eW9idHljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwMDQwODYsImV4cCI6MjA4NzU4MDA4Nn0.Hck5qF0GQ9-KEMvJiuu10-i-9562mEWBOBuHMTG33ZY"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
