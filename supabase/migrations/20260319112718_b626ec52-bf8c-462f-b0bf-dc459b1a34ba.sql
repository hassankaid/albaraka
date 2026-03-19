
CREATE TABLE public.fixed_charges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  frequency text NOT NULL DEFAULT 'monthly',
  category text NOT NULL DEFAULT 'subscription',
  is_active boolean NOT NULL DEFAULT true,
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.fixed_charges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fixed_charges_select_ceo" ON public.fixed_charges
  FOR SELECT TO authenticated
  USING (get_user_role() = 'ceo');

CREATE POLICY "fixed_charges_insert_ceo" ON public.fixed_charges
  FOR INSERT TO authenticated
  WITH CHECK (get_user_role() = 'ceo');

CREATE POLICY "fixed_charges_update_ceo" ON public.fixed_charges
  FOR UPDATE TO authenticated
  USING (get_user_role() = 'ceo');

CREATE POLICY "fixed_charges_delete_ceo" ON public.fixed_charges
  FOR DELETE TO authenticated
  USING (get_user_role() = 'ceo');

CREATE TRIGGER update_fixed_charges_updated_at
  BEFORE UPDATE ON public.fixed_charges
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
