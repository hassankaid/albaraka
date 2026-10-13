-- ─────────────────────────────────────────────────────────────────────────
-- Discord : un élève coupé (pass retiré ou vente « perdue ») est aussi retiré du
-- serveur, pas seulement de ses rôles (Hassan, 13/10/2026 ; Sidali le faisait à
-- la main). discord-retirer-roles retire les rôles puis le membre ; elle est
-- désormais appelée dès qu'un compte Discord est lié, même sans rôle actif.
-- Quand l'élève régularise, Sidali le réinvite.
-- ─────────────────────────────────────────────────────────────────────────

create or replace function public.retirer_roles_discord(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public', 'extensions'
as $$
declare
  v_anon_key text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0dnN6anpyeWFiamd4eW9idHljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwMDQwODYsImV4cCI6MjA4NzU4MDA4Nn0.Hck5qF0GQ9-KEMvJiuu10-i-9562mEWBOBuHMTG33ZY';
begin
  if not exists (select 1 from public.discord_links where user_id = p_user_id and unlinked_at is null) then
    return;
  end if;
  perform net.http_post(
    url := 'https://ktvszjzryabjgxyobtyc.supabase.co/functions/v1/discord-retirer-roles',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || v_anon_key),
    body := jsonb_build_object('user_id', p_user_id));
end;
$$;

-- Élèves déjà coupés dont le compte Discord est lié : retrait du serveur.
do $$
declare
  u record;
begin
  for u in
    select l.user_id from public.discord_links l
    where l.unlinked_at is null and public.acces_formations_coupe(l.user_id)
  loop
    perform public.retirer_roles_discord(u.user_id);
  end loop;
end $$;
