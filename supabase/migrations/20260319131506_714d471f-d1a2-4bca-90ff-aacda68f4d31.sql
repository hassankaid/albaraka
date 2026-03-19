
-- Create salary_periods table
CREATE TABLE public.salary_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  start_date date NOT NULL,
  end_date date DEFAULT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.salary_periods ENABLE ROW LEVEL SECURITY;

-- CEO can manage
CREATE POLICY "salary_periods_select_ceo" ON public.salary_periods
  FOR SELECT TO authenticated
  USING (get_user_role() = 'ceo');

CREATE POLICY "salary_periods_insert_ceo" ON public.salary_periods
  FOR INSERT TO authenticated
  WITH CHECK (get_user_role() = 'ceo');

CREATE POLICY "salary_periods_update_ceo" ON public.salary_periods
  FOR UPDATE TO authenticated
  USING (get_user_role() = 'ceo');

CREATE POLICY "salary_periods_delete_ceo" ON public.salary_periods
  FOR DELETE TO authenticated
  USING (get_user_role() = 'ceo');

-- Users can see their own
CREATE POLICY "salary_periods_select_own" ON public.salary_periods
  FOR SELECT TO authenticated
  USING (profile_id = auth.uid());

-- Updated_at trigger
CREATE TRIGGER update_salary_periods_updated_at
  BEFORE UPDATE ON public.salary_periods
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Migrate existing data: insert current active salaries with profile created_at as start_date
INSERT INTO public.salary_periods (profile_id, amount, start_date)
SELECT id, fixed_salary, COALESCE(created_at::date, CURRENT_DATE)
FROM public.profiles
WHERE fixed_salary_active = true AND fixed_salary IS NOT NULL AND fixed_salary > 0;
