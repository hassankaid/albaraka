-- Refonte Personal Brand selon doc Sidali :
--   - Étape 1 : profils Instagram (déjà existant)
--   - Étape 2 : prompt personnalisé (à confirmer après copie)
--   - Étape 3 : génération hebdomadaire 4 semaines (4 thèmes : Notoriété →
--     Crédibilité → Engagement → Conversion). Une génération/semaine/mois,
--     verrouillage progressif (S2 débloquée seulement quand S1 publiée),
--     anti-répétition d'un mois à l'autre via topics_history.
--
-- Mode = "pass" ou "liberty" selon le pass de l'utilisateur (user_passes.pass_type).
-- Section Offre du questionnaire affichée uniquement en mode liberty.

-- 1) Étendre user_personal_brand
ALTER TABLE public.user_personal_brand
  ADD COLUMN IF NOT EXISTS mode TEXT CHECK (mode IN ('pass', 'liberty')),
  ADD COLUMN IF NOT EXISTS step1_confirmed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS step2_confirmed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS topics_history JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ DEFAULT now();

-- 2) Nouvelle table : générations hebdomadaires
CREATE TABLE IF NOT EXISTS public.personal_brand_weeks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mode TEXT NOT NULL CHECK (mode IN ('pass', 'liberty')),
  month TEXT NOT NULL,                  -- "YYYY-MM"
  week_num INTEGER NOT NULL CHECK (week_num BETWEEN 1 AND 4),
  theme TEXT NOT NULL,
  scripts JSONB NOT NULL DEFAULT '[]'::jsonb,   -- 7 scripts
  stories JSONB NOT NULL DEFAULT '[]'::jsonb,   -- 7 jours × 3 = 21
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  published_at TIMESTAMPTZ,
  UNIQUE (user_id, mode, month, week_num)
);

CREATE INDEX IF NOT EXISTS personal_brand_weeks_user_month_idx
  ON public.personal_brand_weeks (user_id, mode, month);

ALTER TABLE public.personal_brand_weeks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pbw_select_own ON public.personal_brand_weeks;
CREATE POLICY pbw_select_own ON public.personal_brand_weeks
  FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ceo')
  );

DROP POLICY IF EXISTS pbw_insert_own ON public.personal_brand_weeks;
CREATE POLICY pbw_insert_own ON public.personal_brand_weeks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS pbw_update_own ON public.personal_brand_weeks;
CREATE POLICY pbw_update_own ON public.personal_brand_weeks
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS pbw_delete_own ON public.personal_brand_weeks;
CREATE POLICY pbw_delete_own ON public.personal_brand_weeks
  FOR DELETE USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ceo')
  );
