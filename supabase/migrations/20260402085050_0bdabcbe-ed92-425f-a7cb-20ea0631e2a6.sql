-- Allow all authenticated users to read activity_kpis (for leaderboard)
CREATE POLICY "Authenticated can read all kpis"
ON public.activity_kpis
FOR SELECT
TO authenticated
USING (true);