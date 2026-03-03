
-- RLS policies for payments table
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- CEO can do everything
CREATE POLICY "payments_select_ceo" ON public.payments FOR SELECT TO authenticated
USING (get_user_role() = 'ceo');

CREATE POLICY "payments_insert_ceo" ON public.payments FOR INSERT TO authenticated
WITH CHECK (get_user_role() = 'ceo');

CREATE POLICY "payments_update_ceo" ON public.payments FOR UPDATE TO authenticated
USING (get_user_role() = 'ceo');

CREATE POLICY "payments_delete_ceo" ON public.payments FOR DELETE TO authenticated
USING (get_user_role() = 'ceo');

-- Collaborateurs can view
CREATE POLICY "payments_select_collab" ON public.payments FOR SELECT TO authenticated
USING (get_user_role() = 'collaborateur');
