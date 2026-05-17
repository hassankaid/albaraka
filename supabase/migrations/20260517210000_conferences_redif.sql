-- Sprint S (17/05/2026) — Funnel redif conference
-- Module qui permet a Sidali :
--   1. Pre-creer un lien par conference (1 par dimanche) en BDD avec un token unique
--   2. Configurer le replay (URL Zoom + passcode + duree + Calendly) une fois la conf passee
--   3. Copier le lien quand status='ready' et le partager sur WhatsApp
-- Cote prospect : page publique /redif/:token affiche 3 etapes (thanks → replay → confirm + Calendly)

-- ============================================================================
-- TABLE conferences
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.conferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conference_date DATE NOT NULL UNIQUE,
  token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled', 'ready', 'archived')),
  replay_url TEXT,
  replay_code TEXT,
  video_duration_min INTEGER DEFAULT 90,
  calendly_url TEXT,
  ready_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS conferences_status_date_idx
  ON public.conferences (status, conference_date DESC);
CREATE INDEX IF NOT EXISTS conferences_date_idx
  ON public.conferences (conference_date DESC);

COMMENT ON TABLE public.conferences IS
  'Sprint S 17/05/2026 : 1 row par conference (date unique). Pre-creees en avance, status=scheduled tant que Sidali n''a pas renseigne le replay. Devient status=ready quand replay_url + replay_code + video_duration_min + calendly_url sont tous remplis → le lien devient copiable cote admin et la page /redif/:token devient consultable cote prospect.';

CREATE OR REPLACE FUNCTION public.conferences_touch_and_compute_status()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  IF NEW.status = 'scheduled'
     AND NEW.replay_url IS NOT NULL AND TRIM(NEW.replay_url) <> ''
     AND NEW.replay_code IS NOT NULL AND TRIM(NEW.replay_code) <> ''
     AND NEW.video_duration_min IS NOT NULL AND NEW.video_duration_min > 0
     AND NEW.calendly_url IS NOT NULL AND TRIM(NEW.calendly_url) <> ''
  THEN
    NEW.status := 'ready';
    NEW.ready_at := COALESCE(NEW.ready_at, now());
  END IF;
  IF NEW.status = 'ready'
     AND (NEW.replay_url IS NULL OR TRIM(NEW.replay_url) = ''
          OR NEW.replay_code IS NULL OR TRIM(NEW.replay_code) = ''
          OR NEW.video_duration_min IS NULL OR NEW.video_duration_min <= 0
          OR NEW.calendly_url IS NULL OR TRIM(NEW.calendly_url) = '')
  THEN
    NEW.status := 'scheduled';
    NEW.ready_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS conferences_touch_status ON public.conferences;
CREATE TRIGGER conferences_touch_status
  BEFORE INSERT OR UPDATE ON public.conferences
  FOR EACH ROW EXECUTE FUNCTION public.conferences_touch_and_compute_status();

-- ============================================================================
-- RLS
-- ============================================================================
ALTER TABLE public.conferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS conferences_select_ceo ON public.conferences;
CREATE POLICY conferences_select_ceo
  ON public.conferences FOR SELECT
  TO authenticated
  USING (public.get_user_role() = 'ceo');

DROP POLICY IF EXISTS conferences_update_ceo ON public.conferences;
CREATE POLICY conferences_update_ceo
  ON public.conferences FOR UPDATE
  TO authenticated
  USING (public.get_user_role() = 'ceo')
  WITH CHECK (public.get_user_role() = 'ceo');

-- ============================================================================
-- RPC 1 : generate_weekly_conferences
-- ============================================================================
CREATE OR REPLACE FUNCTION public.generate_weekly_conferences(
  p_start_date DATE,
  p_end_date DATE,
  p_weekday INTEGER DEFAULT 0,
  p_default_calendly_url TEXT DEFAULT NULL
)
RETURNS TABLE(created_count INTEGER, skipped_count INTEGER, total_in_range INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_current DATE;
  v_created INT := 0;
  v_skipped INT := 0;
  v_total INT := 0;
  v_token TEXT;
  v_attempts INT;
BEGIN
  IF p_end_date < p_start_date THEN
    RAISE EXCEPTION 'p_end_date must be >= p_start_date';
  END IF;
  IF p_weekday < 0 OR p_weekday > 6 THEN
    RAISE EXCEPTION 'p_weekday must be 0..6 (0=Sunday)';
  END IF;

  v_current := p_start_date;
  WHILE v_current <= p_end_date LOOP
    IF EXTRACT(DOW FROM v_current)::INT = p_weekday THEN
      v_total := v_total + 1;
      IF EXISTS (SELECT 1 FROM public.conferences WHERE conference_date = v_current) THEN
        v_skipped := v_skipped + 1;
      ELSE
        v_attempts := 0;
        LOOP
          v_attempts := v_attempts + 1;
          v_token := 'ALB-CF-' || UPPER(SUBSTRING(REPLACE(gen_random_uuid()::TEXT, '-', ''), 1, 8));
          EXIT WHEN NOT EXISTS (SELECT 1 FROM public.conferences WHERE token = v_token);
          IF v_attempts > 5 THEN
            RAISE EXCEPTION 'token_generation_failed for date %', v_current;
          END IF;
        END LOOP;

        INSERT INTO public.conferences (conference_date, token, status, calendly_url)
        VALUES (v_current, v_token, 'scheduled', p_default_calendly_url);
        v_created := v_created + 1;
      END IF;
    END IF;
    v_current := v_current + INTERVAL '1 day';
  END LOOP;

  RETURN QUERY SELECT v_created, v_skipped, v_total;
END;
$$;

GRANT EXECUTE ON FUNCTION public.generate_weekly_conferences(DATE, DATE, INTEGER, TEXT) TO authenticated;

COMMENT ON FUNCTION public.generate_weekly_conferences IS
  'Sprint S 17/05/2026 : pre-cree des conferences en masse pour chaque occurrence du weekday (default dimanche=0) dans une plage de dates. Idempotent.';

-- ============================================================================
-- RPC 2 : lookup_conference_replay (PUBLIQUE)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.lookup_conference_replay(p_token TEXT)
RETURNS TABLE(
  conference_date DATE,
  replay_url TEXT,
  replay_code TEXT,
  video_duration_min INTEGER,
  calendly_url TEXT,
  is_valid BOOLEAN,
  reason TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_normalized TEXT;
  v_rec public.conferences%ROWTYPE;
BEGIN
  v_normalized := UPPER(TRIM(COALESCE(p_token, '')));
  IF v_normalized = '' THEN
    RETURN QUERY SELECT NULL::DATE, NULL::TEXT, NULL::TEXT, 0, NULL::TEXT, FALSE, 'token_required'::TEXT;
    RETURN;
  END IF;

  SELECT * INTO v_rec FROM public.conferences WHERE token = v_normalized;
  IF v_rec.id IS NULL THEN
    RETURN QUERY SELECT NULL::DATE, NULL::TEXT, NULL::TEXT, 0, NULL::TEXT, FALSE, 'not_found'::TEXT;
    RETURN;
  END IF;

  IF v_rec.status = 'archived' THEN
    RETURN QUERY SELECT v_rec.conference_date, NULL::TEXT, NULL::TEXT, 0, NULL::TEXT, FALSE, 'archived'::TEXT;
    RETURN;
  END IF;

  IF v_rec.status <> 'ready' THEN
    RETURN QUERY SELECT v_rec.conference_date, NULL::TEXT, NULL::TEXT, 0, NULL::TEXT, FALSE, 'replay_not_ready'::TEXT;
    RETURN;
  END IF;

  RETURN QUERY SELECT
    v_rec.conference_date,
    v_rec.replay_url,
    v_rec.replay_code,
    v_rec.video_duration_min,
    v_rec.calendly_url,
    TRUE,
    NULL::TEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.lookup_conference_replay(TEXT) TO anon, authenticated;

COMMENT ON FUNCTION public.lookup_conference_replay IS
  'Sprint S 17/05/2026 : lookup public d''une conference par token. Retourne les infos replay si status=ready, sinon is_valid=false avec un reason.';

-- ============================================================================
-- Pre-creation des dimanches 17/05/2026 → 31/12/2026 (= 33 conferences)
-- ============================================================================
SELECT * FROM public.generate_weekly_conferences(
  '2026-05-17'::DATE,
  '2026-12-31'::DATE,
  0,
  'https://calendly.com/d/cvyb-4ts-83b/rediffusion-conference'
);
