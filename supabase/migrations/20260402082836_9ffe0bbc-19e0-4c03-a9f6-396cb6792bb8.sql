
-- Table activity_kpis
CREATE TABLE public.activity_kpis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  week_start date NOT NULL,
  videos_published integer NOT NULL DEFAULT 0,
  messages_sent integer NOT NULL DEFAULT 0,
  replies_received integer NOT NULL DEFAULT 0,
  appointments integer NOT NULL DEFAULT 0,
  sales_made integer NOT NULL DEFAULT 0,
  ai_feedback text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, week_start)
);

ALTER TABLE public.activity_kpis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own kpis" ON public.activity_kpis
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "CEO can view all kpis" ON public.activity_kpis
  FOR SELECT USING (get_user_role() = 'ceo');

CREATE POLICY "Users can insert own kpis" ON public.activity_kpis
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own kpis" ON public.activity_kpis
  FOR UPDATE USING (user_id = auth.uid());

CREATE TRIGGER update_activity_kpis_updated_at
  BEFORE UPDATE ON public.activity_kpis
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Table activity_objectives
CREATE TABLE public.activity_objectives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kpi_key text NOT NULL UNIQUE,
  weekly_target integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.activity_objectives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read objectives" ON public.activity_objectives
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "CEO can manage objectives" ON public.activity_objectives
  FOR ALL TO authenticated
  USING (get_user_role() = 'ceo')
  WITH CHECK (get_user_role() = 'ceo');

CREATE TRIGGER update_activity_objectives_updated_at
  BEFORE UPDATE ON public.activity_objectives
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed objectives
INSERT INTO public.activity_objectives (kpi_key, weekly_target) VALUES
  ('videos', 7),
  ('messages', 500),
  ('replies', 10),
  ('appointments', 10),
  ('sales', 3);
