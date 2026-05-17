-- Sprint S3 (17/05/2026) : replay_code devient optionnel
-- (YouTube/Vimeo/Loom n'ont pas de code d'acces, contrairement a Zoom)

CREATE OR REPLACE FUNCTION public.conferences_touch_and_compute_status()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  IF NEW.status = 'scheduled'
     AND NEW.replay_url IS NOT NULL AND TRIM(NEW.replay_url) <> ''
     -- replay_code est optionnel (Sprint S3) : YouTube/Vimeo/Loom n'en ont pas
     AND NEW.video_duration_min IS NOT NULL AND NEW.video_duration_min > 0
     AND NEW.calendly_url IS NOT NULL AND TRIM(NEW.calendly_url) <> ''
  THEN
    NEW.status := 'ready';
    NEW.ready_at := COALESCE(NEW.ready_at, now());
  END IF;
  IF NEW.status = 'ready'
     AND (NEW.replay_url IS NULL OR TRIM(NEW.replay_url) = ''
          OR NEW.video_duration_min IS NULL OR NEW.video_duration_min <= 0
          OR NEW.calendly_url IS NULL OR TRIM(NEW.calendly_url) = '')
  THEN
    NEW.status := 'scheduled';
    NEW.ready_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;
