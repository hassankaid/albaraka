-- ─────────────────────────────────────────────────────────────────────────
-- Discord : un élève dont l'accès est suspendu (pass retiré ou vente « perdue »,
-- règle du 13/10/2026) perd ses rôles Discord et ne les récupère plus.
--
-- 1. couper_acces_formations appelle la fonction discord-retirer-roles (qui ne
--    fait rien si l'élève n'est pas réellement coupé) dès qu'il a des rôles actifs.
-- 2. get_formation_progress renvoie 0 pour un élève coupé : la synchro Discord
--    quotidienne, la vérification à la connexion et la liaison du compte (qui
--    exigent 100 %) ne lui redonnent donc aucun rôle. Il ne voit plus aucune
--    formation de toute façon ; ses chapitres vus restent en base et la
--    progression réapparaît dès qu'un pass lui est rendu.
-- 3. Retrait immédiat pour les élèves déjà coupés qui ont encore des rôles.
-- ─────────────────────────────────────────────────────────────────────────

create or replace function public.get_formation_progress(p_user_id uuid, p_formation_id uuid)
returns numeric
language sql
stable
security definer
set search_path to 'public'
as $function$
  with total as (
    select count(*)::numeric as nb
    from public.formation_chapitres c
    join public.formation_modules m on m.id = c.module_id
    where m.formation_id = p_formation_id
      and c.status = 'published'
      and m.status = 'published'
  ),
  done as (
    select count(*)::numeric as nb
    from public.chapitre_progress cp
    join public.formation_chapitres c on c.id = cp.chapitre_id
    join public.formation_modules m on m.id = c.module_id
    where m.formation_id = p_formation_id
      and cp.user_id = p_user_id
      and c.status = 'published'
      and m.status = 'published'
  )
  select case
    -- Accès suspendu (pass retiré, impayé) : rien n'est « terminé » pour lui.
    when public.acces_formations_coupe(p_user_id) then 0
    when (select nb from total) = 0 then 0
    else round((select nb from done) / (select nb from total) * 100, 2)
  end;
$function$;

create or replace function public.retirer_roles_discord(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public', 'extensions'
as $$
declare
  v_anon_key text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0dnN6anpyeWFiamd4eW9idHljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwMDQwODYsImV4cCI6MjA4NzU4MDA4Nn0.Hck5qF0GQ9-KEMvJiuu10-i-9562mEWBOBuHMTG33ZY';
begin
  if not exists (select 1 from public.discord_role_grants
                 where user_id = p_user_id and revoked_at is null and status = 'success') then
    return;
  end if;
  perform net.http_post(
    url := 'https://ktvszjzryabjgxyobtyc.supabase.co/functions/v1/discord-retirer-roles',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || v_anon_key),
    body := jsonb_build_object('user_id', p_user_id));
end;
$$;

create or replace function public.couper_acces_formations(p_user_id uuid, p_motif text)
returns integer
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_n integer;
begin
  update public.formation_enrollments
  set revoked_at = now(),
      notes = concat_ws(' · ', nullif(notes, ''), '[coupure-pass] ' || p_motif || ' (' || to_char(now(), 'DD/MM/YYYY') || ')')
  where user_id = p_user_id and revoked_at is null;
  get diagnostics v_n = row_count;

  -- Rôles Discord retirés aussi (envoyé après la validation de la transaction).
  perform public.retirer_roles_discord(p_user_id);
  return v_n;
end;
$$;

-- 3. Élèves déjà coupés qui ont encore des rôles Discord
do $$
declare
  u record;
begin
  for u in
    select distinct g.user_id from public.discord_role_grants g
    where g.revoked_at is null and g.status = 'success' and public.acces_formations_coupe(g.user_id)
  loop
    perform public.retirer_roles_discord(u.user_id);
  end loop;
end $$;
