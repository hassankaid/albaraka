CREATE POLICY "profiles_update_ceo"
ON public.profiles
FOR UPDATE
TO public
USING (get_user_role() = 'ceo')
WITH CHECK (get_user_role() = 'ceo');