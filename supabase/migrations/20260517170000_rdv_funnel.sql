-- Sprint N - Funnel de prise de rendez-vous Calendly (qualification 5Q)
-- =====================================================================
-- Public funnel atteint apres la conference de Sidali. Capture les
-- coordonnees du lead AVANT les 5 questions de qualification (tous les
-- leads sont stockes, meme disqualifies, pour remarketing).
--
-- Flow :
--   Page /rdv (intro)
--     -> /rdv/coordonnees (insert rdv_funnel_leads, status='coords_only')
--     -> /rdv/questions (Q1..Q5 step-by-step, log dans rdv_funnel_answers)
--        -> NON  -> /rdv/disqualification/<a..e> (status='disqualified')
--        -> 5xOUI -> /rdv/calendly (status='qualified')
--           -> Calendly fire le webhook existant qui alimente la table
--              `calls` -> trigger AFTER INSERT essaie de matcher le lead
--              qualifie via raw_email/raw_phone et passe status='booked'.
--
-- Tables :
--   - rdv_funnel_leads : un row par soumission de coordonnees
--   - rdv_funnel_answers : log analytique des reponses Q1..Q5
--
-- Securite :
--   - Insert/update : reserves au service role uniquement (via edge function
--     `rdv-funnel-submit`). Aucun INSERT direct depuis le client.
--   - SELECT : CEO + collaborateur (consulteront un futur dashboard).

-- =====================================================================
-- TABLE : rdv_funnel_leads
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.rdv_funnel_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Coordonnees (capturees AVANT les questions)
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,                  -- normalise en lower() cote edge function
  phone TEXT NOT NULL,                  -- format E.164 (+33...)
  phone_country TEXT,                   -- code ISO 'FR', 'MA', etc.

  -- Etat dans le funnel
  status TEXT NOT NULL DEFAULT 'coords_only'
    CHECK (status IN ('coords_only', 'qualified', 'disqualified', 'booked')),
  disqualified_at_question SMALLINT
    CHECK (disqualified_at_question IS NULL OR disqualified_at_question BETWEEN 1 AND 5),
  qualified_at TIMESTAMPTZ,             -- rempli quand 5 OUI consecutifs
  booked_at TIMESTAMPTZ,                -- rempli par le trigger de reconciliation
  calendly_call_id UUID REFERENCES public.calls(id) ON DELETE SET NULL,

  -- Metadonnees techniques (debug, anti-spam, geo)
  ip TEXT,
  user_agent TEXT
);

CREATE INDEX IF NOT EXISTS rdv_funnel_leads_created_at_idx
  ON public.rdv_funnel_leads (created_at DESC);
CREATE INDEX IF NOT EXISTS rdv_funnel_leads_status_idx
  ON public.rdv_funnel_leads (status);
CREATE INDEX IF NOT EXISTS rdv_funnel_leads_email_idx
  ON public.rdv_funnel_leads (lower(email));
CREATE INDEX IF NOT EXISTS rdv_funnel_leads_phone_idx
  ON public.rdv_funnel_leads (phone);

COMMENT ON TABLE public.rdv_funnel_leads IS
  'Leads capturés par le funnel public /rdv (qualification 5Q avant Calendly). Tous les leads sont stockés (qualifiés ET disqualifiés) pour remarketing futur.';

-- Trigger pour maintenir updated_at
CREATE OR REPLACE FUNCTION public.rdv_funnel_leads_touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $func$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$func$;

DROP TRIGGER IF EXISTS rdv_funnel_leads_set_updated_at ON public.rdv_funnel_leads;
CREATE TRIGGER rdv_funnel_leads_set_updated_at
  BEFORE UPDATE ON public.rdv_funnel_leads
  FOR EACH ROW EXECUTE FUNCTION public.rdv_funnel_leads_touch_updated_at();

-- =====================================================================
-- TABLE : rdv_funnel_answers (log analytique)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.rdv_funnel_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.rdv_funnel_leads(id) ON DELETE CASCADE,
  question_index SMALLINT NOT NULL CHECK (question_index BETWEEN 1 AND 5),
  answer TEXT NOT NULL CHECK (answer IN ('yes', 'no')),
  answered_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS rdv_funnel_answers_lead_id_idx
  ON public.rdv_funnel_answers (lead_id);
CREATE INDEX IF NOT EXISTS rdv_funnel_answers_answered_at_idx
  ON public.rdv_funnel_answers (answered_at DESC);

COMMENT ON TABLE public.rdv_funnel_answers IS
  'Log analytique des réponses Q1..Q5. Un lead peut avoir plusieurs réponses pour la même question si il utilise le bouton retour depuis une page de disqualification (on garde l''historique).';

-- =====================================================================
-- RLS : tout passe par le service role (edge function)
-- =====================================================================
ALTER TABLE public.rdv_funnel_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rdv_funnel_answers ENABLE ROW LEVEL SECURITY;

-- Lecture : CEO + collaborateur (pour futur dashboard /admin/rdv-funnel).
-- On utilise la fonction `get_user_role()` deja en place dans le projet
-- (retourne le role du auth.uid() courant via profiles).
DROP POLICY IF EXISTS rdv_funnel_leads_select_staff ON public.rdv_funnel_leads;
CREATE POLICY rdv_funnel_leads_select_staff
  ON public.rdv_funnel_leads FOR SELECT
  TO authenticated
  USING (public.get_user_role() IN ('ceo', 'collaborateur'));

DROP POLICY IF EXISTS rdv_funnel_answers_select_staff ON public.rdv_funnel_answers;
CREATE POLICY rdv_funnel_answers_select_staff
  ON public.rdv_funnel_answers FOR SELECT
  TO authenticated
  USING (public.get_user_role() IN ('ceo', 'collaborateur'));

-- Aucune policy INSERT/UPDATE/DELETE : tout passe obligatoirement par le
-- service role (edge function rdv-funnel-submit). Le client public n'a
-- jamais d'acces direct a ces tables.

-- =====================================================================
-- TRIGGER : reconciliation automatique avec la table `calls`
-- =====================================================================
-- Quand le webhook Calendly insere un row dans `calls`, on cherche un
-- rdv_funnel_lead en status 'qualified' avec le meme email ou telephone
-- et on le passe en 'booked'. Idempotent : si deja booked, on ne touche pas.
--
-- Strategie de matching (par ordre de preference) :
--   1. raw_email (lower) match exact sur lower(email)
--   2. raw_phone match exact sur phone (E.164)
-- On prend le lead qualifie LE PLUS RECENT correspondant (cas rare de
-- doublons : meme personne qui referait le funnel).
CREATE OR REPLACE FUNCTION public.rdv_funnel_reconcile_with_calls()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $func$
DECLARE
  v_lead_id UUID;
  v_normalized_email TEXT;
BEGIN
  v_normalized_email := NULLIF(TRIM(LOWER(COALESCE(NEW.raw_email, ''))), '');

  -- Recherche d'un lead qualifie via email
  IF v_normalized_email IS NOT NULL THEN
    SELECT id INTO v_lead_id
    FROM public.rdv_funnel_leads
    WHERE status = 'qualified'
      AND lower(email) = v_normalized_email
    ORDER BY qualified_at DESC NULLS LAST, created_at DESC
    LIMIT 1;
  END IF;

  -- Fallback : recherche via telephone (E.164 strict)
  IF v_lead_id IS NULL AND NEW.raw_phone IS NOT NULL AND TRIM(NEW.raw_phone) <> '' THEN
    SELECT id INTO v_lead_id
    FROM public.rdv_funnel_leads
    WHERE status = 'qualified'
      AND phone = TRIM(NEW.raw_phone)
    ORDER BY qualified_at DESC NULLS LAST, created_at DESC
    LIMIT 1;
  END IF;

  IF v_lead_id IS NOT NULL THEN
    UPDATE public.rdv_funnel_leads
    SET status = 'booked',
        booked_at = COALESCE(booked_at, now()),
        calendly_call_id = NEW.id
    WHERE id = v_lead_id;
  END IF;

  RETURN NEW;
END;
$func$;

DROP TRIGGER IF EXISTS calls_reconcile_rdv_funnel ON public.calls;
CREATE TRIGGER calls_reconcile_rdv_funnel
  AFTER INSERT ON public.calls
  FOR EACH ROW EXECUTE FUNCTION public.rdv_funnel_reconcile_with_calls();

COMMENT ON FUNCTION public.rdv_funnel_reconcile_with_calls IS
  'Reconcilie automatiquement un nouveau booking Calendly (row inseree dans calls) avec un lead qualifie du funnel /rdv via email puis telephone. Met le lead en status=booked.';
