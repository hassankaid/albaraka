
SELECT cron.schedule(
  'recycle-stale-leads-daily',
  '0 3 * * *',
  $$
  SELECT net.http_post(
    url := 'https://ktvszjzryabjgxyobtyc.supabase.co/functions/v1/recycle-stale-leads',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0dnN6anpyeWFiamd4eW9idHljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwMDQwODYsImV4cCI6MjA4NzU4MDA4Nn0.Hck5qF0GQ9-KEMvJiuu10-i-9562mEWBOBuHMTG33ZY"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
