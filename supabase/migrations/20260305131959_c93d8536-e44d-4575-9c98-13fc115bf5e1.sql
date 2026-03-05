CREATE POLICY "Allow authenticated users to insert commissions"
ON public.commissions
FOR INSERT
TO authenticated
WITH CHECK (true);