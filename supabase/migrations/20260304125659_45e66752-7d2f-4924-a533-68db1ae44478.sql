
CREATE POLICY "sales_select_apporteur_via_lead"
ON public.sales
FOR SELECT
TO authenticated
USING (
  (get_user_role() = 'apporteur') 
  AND (lead_id IN (
    SELECT id FROM public.leads WHERE apporteur_id = auth.uid()
  ))
);
