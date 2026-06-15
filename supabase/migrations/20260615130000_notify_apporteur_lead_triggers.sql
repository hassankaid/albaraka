-- Notifie l'apporteur (email) quand un lead arrive via SON funnel quiz.
-- 2 déclencheurs appelant l'edge function notify-apporteur-lead via pg_net (async,
-- non bloquant). Uniquement source='apporteur_quiz'. Toute erreur est avalée pour
-- ne jamais bloquer la capture / la complétion.
--   Email 1 (captured)  : à la création du lead (coordonnées).
--   Email 2 (completed) : quand la submission passe en 'quiz_completed' (profil + relance).

CREATE OR REPLACE FUNCTION public.tg_notify_apporteur_lead_captured()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://ktvszjzryabjgxyobtyc.supabase.co/functions/v1/notify-apporteur-lead',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0dnN6anpyeWFiamd4eW9idHljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwMDQwODYsImV4cCI6MjA4NzU4MDA4Nn0.Hck5qF0GQ9-KEMvJiuu10-i-9562mEWBOBuHMTG33ZY',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0dnN6anpyeWFiamd4eW9idHljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwMDQwODYsImV4cCI6MjA4NzU4MDA4Nn0.Hck5qF0GQ9-KEMvJiuu10-i-9562mEWBOBuHMTG33ZY'
    ),
    body := jsonb_build_object('kind', 'captured', 'lead_id', NEW.id),
    timeout_milliseconds := 8000
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.tg_notify_apporteur_lead_completed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://ktvszjzryabjgxyobtyc.supabase.co/functions/v1/notify-apporteur-lead',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0dnN6anpyeWFiamd4eW9idHljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwMDQwODYsImV4cCI6MjA4NzU4MDA4Nn0.Hck5qF0GQ9-KEMvJiuu10-i-9562mEWBOBuHMTG33ZY',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0dnN6anpyeWFiamd4eW9idHljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwMDQwODYsImV4cCI6MjA4NzU4MDA4Nn0.Hck5qF0GQ9-KEMvJiuu10-i-9562mEWBOBuHMTG33ZY'
    ),
    body := jsonb_build_object('kind', 'completed', 'submission_id', NEW.id),
    timeout_milliseconds := 8000
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_apporteur_lead_captured ON public.leads;
CREATE TRIGGER trg_notify_apporteur_lead_captured
AFTER INSERT ON public.leads
FOR EACH ROW
WHEN (NEW.source = 'apporteur_quiz' AND NEW.apporteur_id IS NOT NULL)
EXECUTE FUNCTION public.tg_notify_apporteur_lead_captured();

DROP TRIGGER IF EXISTS trg_notify_apporteur_lead_completed ON public.lead_quiz_submissions;
CREATE TRIGGER trg_notify_apporteur_lead_completed
AFTER UPDATE OF status ON public.lead_quiz_submissions
FOR EACH ROW
WHEN (NEW.status = 'quiz_completed' AND OLD.status IS DISTINCT FROM 'quiz_completed')
EXECUTE FUNCTION public.tg_notify_apporteur_lead_completed();
