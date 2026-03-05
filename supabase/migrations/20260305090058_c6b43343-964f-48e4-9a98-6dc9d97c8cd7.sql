-- Allow CEO to delete leads
CREATE POLICY "leads_delete_ceo"
ON public.leads FOR DELETE
TO authenticated
USING (get_user_role() = 'ceo');

-- Allow CEO to delete calls
CREATE POLICY "calls_delete_ceo"
ON public.calls FOR DELETE
TO authenticated
USING (get_user_role() = 'ceo');

-- Allow CEO to delete contacts
CREATE POLICY "contacts_delete_ceo"
ON public.contacts FOR DELETE
TO authenticated
USING (get_user_role() = 'ceo');

-- Allow CEO to delete sales
CREATE POLICY "sales_delete_ceo"
ON public.sales FOR DELETE
TO authenticated
USING (get_user_role() = 'ceo');

-- Allow CEO to update contacts (already exists for team but let's ensure)
-- contacts_update_team already covers ceo