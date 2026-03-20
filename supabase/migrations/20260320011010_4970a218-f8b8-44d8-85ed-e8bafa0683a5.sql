-- Drop the overly permissive collaborateur policy
DROP POLICY IF EXISTS "leads_select_collab" ON public.leads;

-- Collaborateurs can only see:
-- 1. Leads assigned to them
-- 2. Unassigned leads that are NOT recycled (for the "À affecter" tab)
CREATE POLICY "leads_select_collab" ON public.leads
  FOR SELECT TO public
  USING (
    get_user_role() = 'collaborateur'
    AND (
      assigned_to = auth.uid()
      OR (assigned_to IS NULL AND status != 'a_recycler')
    )
  );