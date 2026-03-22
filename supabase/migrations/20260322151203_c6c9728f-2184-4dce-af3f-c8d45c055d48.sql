-- Drop the old unified collab policy
DROP POLICY IF EXISTS "leads_select_collab" ON public.leads;

-- Confirmed collaborators: see their assigned leads + unassigned non-recycler leads
CREATE POLICY "leads_select_collab_confirmed" ON public.leads
FOR SELECT TO public
USING (
  get_user_role() = 'collaborateur'
  AND (
    assigned_to = auth.uid()
    OR (
      assigned_to IS NULL
      AND status <> 'a_recycler'
      AND EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
        AND collaborateur_level = 'confirme'
      )
    )
  )
);

-- Intermediate collaborators: only see leads explicitly assigned to them
CREATE POLICY "leads_select_collab_intermediaire" ON public.leads
FOR SELECT TO public
USING (
  get_user_role() = 'collaborateur'
  AND assigned_to = auth.uid()
);