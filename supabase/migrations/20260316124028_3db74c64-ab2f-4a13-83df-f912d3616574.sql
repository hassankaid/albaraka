CREATE POLICY "payments_update_notes_collab"
ON public.payments
FOR UPDATE
TO authenticated
USING (get_user_role() = 'collaborateur')
WITH CHECK (get_user_role() = 'collaborateur');