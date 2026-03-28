
-- 1. coach_types
CREATE TABLE public.coach_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  theme_color TEXT NOT NULL,
  theme_bg TEXT,
  assigned_coach_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  sub_modes TEXT[],
  is_active BOOLEAN DEFAULT true,
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_coach_types_active ON public.coach_types(is_active) WHERE is_active = true;
CREATE INDEX idx_coach_types_order ON public.coach_types(display_order);

-- 2. coach_steps
CREATE TABLE public.coach_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_type_id UUID NOT NULL REFERENCES public.coach_types(id) ON DELETE CASCADE,
  step_number INT NOT NULL,
  step_id TEXT NOT NULL,
  label TEXT NOT NULL,
  title TEXT NOT NULL,
  objective TEXT,
  tips TEXT[],
  is_active BOOLEAN DEFAULT true,
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(coach_type_id, step_number)
);

CREATE INDEX idx_coach_steps_type ON public.coach_steps(coach_type_id);
CREATE INDEX idx_coach_steps_order ON public.coach_steps(coach_type_id, display_order);

-- 3. coach_criteria
CREATE TABLE public.coach_criteria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  step_id UUID NOT NULL REFERENCES public.coach_steps(id) ON DELETE CASCADE,
  criteria_text TEXT NOT NULL,
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_coach_criteria_step ON public.coach_criteria(step_id);
CREATE INDEX idx_coach_criteria_order ON public.coach_criteria(step_id, display_order);

-- 4. coach_script_refs
CREATE TABLE public.coach_script_refs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  step_id UUID NOT NULL REFERENCES public.coach_steps(id) ON DELETE CASCADE,
  sub_mode TEXT,
  script_lines TEXT[] NOT NULL,
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_coach_script_refs_step ON public.coach_script_refs(step_id);
CREATE INDEX idx_coach_script_refs_submode ON public.coach_script_refs(step_id, sub_mode);

-- 5. coach_debrief_options
CREATE TABLE public.coach_debrief_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  step_id UUID NOT NULL REFERENCES public.coach_steps(id) ON DELETE CASCADE,
  debrief_label TEXT NOT NULL,
  options TEXT[] NOT NULL,
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_coach_debrief_step ON public.coach_debrief_options(step_id);
CREATE INDEX idx_coach_debrief_order ON public.coach_debrief_options(step_id, display_order);

-- Triggers updated_at
CREATE TRIGGER update_coach_types_updated_at
  BEFORE UPDATE ON public.coach_types
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_coach_steps_updated_at
  BEFORE UPDATE ON public.coach_steps
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_coach_criteria_updated_at
  BEFORE UPDATE ON public.coach_criteria
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_coach_script_refs_updated_at
  BEFORE UPDATE ON public.coach_script_refs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_coach_debrief_options_updated_at
  BEFORE UPDATE ON public.coach_debrief_options
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE public.coach_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_script_refs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_debrief_options ENABLE ROW LEVEL SECURITY;

-- SELECT for all authenticated
CREATE POLICY "Authenticated users can read coach_types" ON public.coach_types FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read coach_steps" ON public.coach_steps FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read coach_criteria" ON public.coach_criteria FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read coach_script_refs" ON public.coach_script_refs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read coach_debrief_options" ON public.coach_debrief_options FOR SELECT TO authenticated USING (true);

-- ALL for CEO
CREATE POLICY "CEO can manage coach_types" ON public.coach_types FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'ceo'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'ceo'));

CREATE POLICY "CEO can manage coach_steps" ON public.coach_steps FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'ceo'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'ceo'));

CREATE POLICY "CEO can manage coach_criteria" ON public.coach_criteria FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'ceo'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'ceo'));

CREATE POLICY "CEO can manage coach_script_refs" ON public.coach_script_refs FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'ceo'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'ceo'));

CREATE POLICY "CEO can manage coach_debrief_options" ON public.coach_debrief_options FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'ceo'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'ceo'));
