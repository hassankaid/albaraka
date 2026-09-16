-- synchroniser_formations_du_pass() est SECURITY DEFINER et accepte un user_id
-- quelconque. Elle n'accorde que ce que le pass donne déjà, donc elle ne permet
-- aucune élévation de droits — mais elle n'a aucune raison d'être exposée dans
-- l'API publique. Seuls les déclencheurs en ont besoin, et ils l'appellent en
-- tant que propriétaire.
revoke all on function public.synchroniser_formations_du_pass(uuid) from public, anon, authenticated;
