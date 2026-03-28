
-- 1. Colonne is_coach sur profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_coach BOOLEAN DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_profiles_is_coach ON public.profiles(is_coach) WHERE is_coach = true;
COMMENT ON COLUMN public.profiles.is_coach IS 'Indique si ce collaborateur peut coacher des élèves. Défini par le CEO.';

-- 2. coaching_sessions
CREATE TABLE public.coaching_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_type_id UUID NOT NULL REFERENCES public.coach_types(id) ON DELETE RESTRICT,
  coach_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  student_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  sub_mode TEXT,
  session_number INT NOT NULL DEFAULT 1,
  session_date DATE NOT NULL,
  global_score DECIMAL(3,2),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'completed')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_coaching_sessions_coach ON public.coaching_sessions(coach_user_id);
CREATE INDEX idx_coaching_sessions_student ON public.coaching_sessions(student_user_id);
CREATE INDEX idx_coaching_sessions_type ON public.coaching_sessions(coach_type_id);
CREATE INDEX idx_coaching_sessions_date ON public.coaching_sessions(session_date DESC);
CREATE INDEX idx_coaching_sessions_status ON public.coaching_sessions(status);
CREATE INDEX idx_coaching_sessions_student_date ON public.coaching_sessions(student_user_id, session_date DESC);
CREATE INDEX idx_coaching_sessions_coach_date ON public.coaching_sessions(coach_user_id, session_date DESC);

-- 3. coaching_scores
CREATE TABLE public.coaching_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.coaching_sessions(id) ON DELETE CASCADE,
  step_id UUID NOT NULL REFERENCES public.coach_steps(id) ON DELETE RESTRICT,
  criteria_scores INT[] NOT NULL DEFAULT '{}',
  debrief_responses TEXT[] DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(session_id, step_id)
);

CREATE INDEX idx_coaching_scores_session ON public.coaching_scores(session_id);
CREATE INDEX idx_coaching_scores_step ON public.coaching_scores(step_id);

-- 4. Triggers updated_at
CREATE TRIGGER update_coaching_sessions_updated_at
  BEFORE UPDATE ON public.coaching_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_coaching_scores_updated_at
  BEFORE UPDATE ON public.coaching_scores
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 5. Fonction calcul score global
CREATE OR REPLACE FUNCTION public.calculate_session_global_score(p_session_id UUID)
RETURNS DECIMAL(3,2)
LANGUAGE plpgsql
STABLE
SET search_path TO 'public'
AS $$
DECLARE
  v_total DECIMAL;
  v_count INT;
  v_score DECIMAL(3,2);
BEGIN
  SELECT COALESCE(SUM(s), 0), COALESCE(COUNT(s), 0)
  INTO v_total, v_count
  FROM (
    SELECT unnest(criteria_scores) as s
    FROM coaching_scores
    WHERE session_id = p_session_id
    AND criteria_scores IS NOT NULL
    AND array_length(criteria_scores, 1) > 0
  ) scores
  WHERE s > 0;

  IF v_count > 0 THEN
    v_score := ROUND((v_total / v_count)::DECIMAL, 2);
  ELSE
    v_score := NULL;
  END IF;

  RETURN v_score;
END;
$$;

-- 6. Trigger auto-update score global
CREATE OR REPLACE FUNCTION public.update_session_global_score()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE coaching_sessions
  SET global_score = calculate_session_global_score(
    COALESCE(NEW.session_id, OLD.session_id)
  )
  WHERE id = COALESCE(NEW.session_id, OLD.session_id);

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trigger_update_global_score
  AFTER INSERT OR UPDATE OR DELETE ON public.coaching_scores
  FOR EACH ROW EXECUTE FUNCTION public.update_session_global_score();

-- 7. RLS
ALTER TABLE public.coaching_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coaching_scores ENABLE ROW LEVEL SECURITY;

-- coaching_sessions policies
CREATE POLICY "Authenticated users can read all coaching_sessions"
  ON public.coaching_sessions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Coaches can create coaching_sessions"
  ON public.coaching_sessions FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND (profiles.is_coach = true OR profiles.role = 'ceo'))
    AND coach_user_id = auth.uid()
  );

CREATE POLICY "Coach or CEO can update coaching_sessions"
  ON public.coaching_sessions FOR UPDATE TO authenticated
  USING (
    coach_user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'ceo')
  )
  WITH CHECK (
    coach_user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'ceo')
  );

CREATE POLICY "Only CEO can delete coaching_sessions"
  ON public.coaching_sessions FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'ceo'));

-- coaching_scores policies
CREATE POLICY "Authenticated users can read all coaching_scores"
  ON public.coaching_scores FOR SELECT TO authenticated USING (true);

CREATE POLICY "Coach can create coaching_scores for their sessions"
  ON public.coaching_scores FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.coaching_sessions cs
      WHERE cs.id = session_id
      AND (cs.coach_user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'ceo'))
    )
  );

CREATE POLICY "Coach can update coaching_scores for their sessions"
  ON public.coaching_scores FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.coaching_sessions cs
      WHERE cs.id = session_id
      AND (cs.coach_user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'ceo'))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.coaching_sessions cs
      WHERE cs.id = session_id
      AND (cs.coach_user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'ceo'))
    )
  );

CREATE POLICY "Only CEO can delete coaching_scores"
  ON public.coaching_scores FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'ceo'));
