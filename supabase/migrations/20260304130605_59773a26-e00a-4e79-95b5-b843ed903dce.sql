
CREATE POLICY "payments_select_apporteur"
ON public.payments
FOR SELECT
TO authenticated
USING (
  (get_user_role() = 'apporteur')
  AND (sale_id IN (
    SELECT s.id FROM public.sales s
    JOIN public.leads l ON l.id = s.lead_id
    WHERE l.apporteur_id = auth.uid()
  ))
);
