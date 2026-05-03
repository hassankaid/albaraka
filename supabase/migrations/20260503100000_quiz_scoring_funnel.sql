-- Quiz Scoring funnel — nouveau tunnel de qualification multi-thank-you-pages.
--
-- Architecture :
--   1. Page Systemio capture (prénom/email/tél)
--   2. Page Systemio intermédiaire embed <iframe src=".../quiz-funnel?slug=...&prenom=...&email=...&tel=..."/>
--   3. À la fin du quiz, redirect vers la thank-you Systemio dédiée au tunnel.
--
-- Stockage :
--   - quiz_funnels : 1 ligne = 1 tunnel (slug, name, thank_you_url) gérée par le CEO via /admin/quiz-funnels
--   - funnel_quiz_responses : 1 ligne par soumission (réponses + score + catégorie)
--   - leads : 2 colonnes ajoutées (quiz_score, quiz_category) pour l'affichage rapide dans la liste

-- ─── Table : quiz_funnels ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.quiz_funnels (
  slug          text PRIMARY KEY CHECK (slug ~ '^[a-z0-9][a-z0-9-]{1,40}[a-z0-9]$'),
  name          text NOT NULL,
  thank_you_url text NOT NULL,
  active        boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.quiz_funnels IS
  'Tunnels de qualification Quiz Scoring. Chaque slug = un embed Systemio + une thank-you URL dédiée.';

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.touch_quiz_funnels_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_quiz_funnels_updated_at ON public.quiz_funnels;
CREATE TRIGGER trg_quiz_funnels_updated_at
BEFORE UPDATE ON public.quiz_funnels
FOR EACH ROW EXECUTE FUNCTION public.touch_quiz_funnels_updated_at();

-- RLS : lecture publique (la page /quiz-funnel doit pouvoir résoudre le slug
-- côté client en bypass auth). Écriture réservée au CEO.
ALTER TABLE public.quiz_funnels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS quiz_funnels_select_all ON public.quiz_funnels;
CREATE POLICY quiz_funnels_select_all
  ON public.quiz_funnels FOR SELECT
  USING (true);

DROP POLICY IF EXISTS quiz_funnels_ceo_write ON public.quiz_funnels;
CREATE POLICY quiz_funnels_ceo_write
  ON public.quiz_funnels FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ceo'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ceo'));

-- ─── Colonnes ajoutées sur leads ───────────────────────────────────────────
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS quiz_score    integer,
  ADD COLUMN IF NOT EXISTS quiz_category text;

COMMENT ON COLUMN public.leads.quiz_score    IS 'Score Quiz Scoring (0-70). NULL si pas issu du tunnel.';
COMMENT ON COLUMN public.leads.quiz_category IS 'Catégorie issue du score : chaud (56-70), tiede (39-55), froid (21-38), hors_cible (0-20).';

CREATE INDEX IF NOT EXISTS idx_leads_quiz_score
  ON public.leads (quiz_score DESC)
  WHERE quiz_score IS NOT NULL;

-- ─── Table : funnel_quiz_responses ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.funnel_quiz_responses (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id       uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  funnel_slug   text NOT NULL REFERENCES public.quiz_funnels(slug) ON DELETE RESTRICT,
  score         integer NOT NULL CHECK (score >= 0 AND score <= 70),
  category      text NOT NULL CHECK (category IN ('chaud', 'tiede', 'froid', 'hors_cible')),
  -- answers : { q1: "salarie_cdi", q2: "25_35", q3: "quitter_emploi", ... }
  answers       jsonb NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.funnel_quiz_responses IS
  'Réponses au Quiz Scoring (7 questions). Une ligne par soumission. La structure des questions est figée côté code.';

CREATE INDEX IF NOT EXISTS idx_funnel_quiz_responses_lead_id
  ON public.funnel_quiz_responses (lead_id);

CREATE INDEX IF NOT EXISTS idx_funnel_quiz_responses_funnel_slug
  ON public.funnel_quiz_responses (funnel_slug, created_at DESC);

-- RLS : lecture pour tous les staff (CEO + collab pour voir les réponses dans
-- le détail du lead qu'ils traitent). Écriture uniquement par service_role
-- (l'edge function submit-funnel-quiz). Les apporteurs ne voient pas les
-- réponses (ils n'ont pas accès aux leads CRM standard de toute façon).
ALTER TABLE public.funnel_quiz_responses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS funnel_quiz_responses_staff_read ON public.funnel_quiz_responses;
CREATE POLICY funnel_quiz_responses_staff_read
  ON public.funnel_quiz_responses FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role IN ('ceo', 'collaborateur')
  ));
