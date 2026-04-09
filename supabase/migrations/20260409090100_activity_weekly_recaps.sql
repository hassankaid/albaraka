-- ============================================================================
-- Table activity_weekly_recaps : récap hebdo généré chaque lundi par l'IA
-- ============================================================================

CREATE TABLE public.activity_weekly_recaps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  week_start date NOT NULL,
  recap_text text NOT NULL,
  stats jsonb NOT NULL DEFAULT '{}'::jsonb,
  dismissed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, week_start)
);

CREATE INDEX idx_activity_weekly_recaps_user
  ON public.activity_weekly_recaps (user_id, week_start DESC);

ALTER TABLE public.activity_weekly_recaps ENABLE ROW LEVEL SECURITY;

-- Lecture : son propre récap
CREATE POLICY "Users can view own weekly recaps" ON public.activity_weekly_recaps
  FOR SELECT USING (user_id = auth.uid());

-- Lecture : CEO voit tous les récaps (Sidali)
CREATE POLICY "CEO can view all weekly recaps" ON public.activity_weekly_recaps
  FOR SELECT USING (get_user_role() = 'ceo');

-- Update : seul l'utilisateur peut dismiss son propre récap
CREATE POLICY "Users can dismiss own weekly recaps" ON public.activity_weekly_recaps
  FOR UPDATE USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Insert : interdit côté client. L'edge function activity-weekly-recap utilise
-- la service role key qui bypass la RLS. Aucune policy INSERT n'est nécessaire.
