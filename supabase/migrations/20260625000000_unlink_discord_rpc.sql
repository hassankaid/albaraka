-- Fix : le bouton "Délier Discord" faisait un UPDATE client-side sur discord_links,
-- mais la table n'a qu'une policy RLS SELECT (discord_links_select_own). L'UPDATE
-- était donc filtré silencieusement (0 ligne, sans erreur) => la liaison n'etait
-- jamais revoquee. RPC SECURITY DEFINER qui pose unlinked_at uniquement pour la
-- ligne active de l'utilisateur courant (auth.uid()). Le front appelle cette RPC.

create or replace function public.unlink_discord()
returns void
language sql
security definer
set search_path = public
as $$
  update public.discord_links
  set unlinked_at = now(), updated_at = now()
  where user_id = auth.uid() and unlinked_at is null;
$$;

revoke all on function public.unlink_discord() from public;
grant execute on function public.unlink_discord() to authenticated;
