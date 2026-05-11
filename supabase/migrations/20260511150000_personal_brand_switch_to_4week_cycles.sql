-- Refacto : le cycle Personal Brand n'est plus un "mois calendaire"
-- (qui démarrait au 1er du mois) mais un cycle GLISSANT de 4 semaines.
-- Un cycle démarre quand l'élève re-confirme étapes 1 + 2 puis génère sa S1.
-- Il dure jusqu'à ce que la S4 soit publiée → cycle terminé → l'élève peut
-- démarrer un nouveau cycle (avec re-confirmation).
--
-- Justification : un apporteur peut commencer son cycle le 15 mai et le
-- finir le 12 juin. Forcer un alignement calendaire serait artificiel.

ALTER TABLE public.user_personal_brand
  ADD COLUMN IF NOT EXISTS current_cycle_id UUID,
  ADD COLUMN IF NOT EXISTS current_cycle_started_at TIMESTAMPTZ;

DROP TABLE IF EXISTS public.personal_brand_weeks CASCADE;

CREATE TABLE public.personal_brand_weeks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mode TEXT NOT NULL CHECK (mode IN ('pass', 'liberty')),
  cycle_id UUID NOT NULL,
  cycle_started_at TIMESTAMPTZ NOT NULL,
  week_num INTEGER NOT NULL CHECK (week_num BETWEEN 1 AND 4),
  theme TEXT NOT NULL,
  scripts JSONB NOT NULL DEFAULT '[]'::jsonb,
  stories JSONB NOT NULL DEFAULT '[]'::jsonb,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  published_at TIMESTAMPTZ,
  UNIQUE (user_id, cycle_id, week_num)
);

CREATE INDEX personal_brand_weeks_user_cycle_idx
  ON public.personal_brand_weeks (user_id, cycle_id);

ALTER TABLE public.personal_brand_weeks ENABLE ROW LEVEL SECURITY;

CREATE POLICY pbw_select_own ON public.personal_brand_weeks
  FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ceo')
  );
CREATE POLICY pbw_insert_own ON public.personal_brand_weeks
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY pbw_update_own ON public.personal_brand_weeks
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY pbw_delete_own ON public.personal_brand_weeks
  FOR DELETE USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ceo')
  );
