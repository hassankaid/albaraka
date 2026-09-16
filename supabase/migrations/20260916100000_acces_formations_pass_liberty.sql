-- Accès aux formations réservées au Pass Liberty (OFFER CREATION, COPYWRITING)
--
-- Constat du 16/09/2026 : ces deux formations sont publiées et marquées
-- access_mode = 'liberty_only'. Mais l'affichage exige EN PLUS une ligne dans
-- formation_enrollments, et rien ne pouvait en créer une : elles ne sont
-- référencées par aucun chapitre de parcours, donc unlock_formation_from_parcours()
-- les refuse ("formation not linked to any parcours"). Résultat : 10 détenteurs
-- du Pass Liberty, 0 inscrit à OFFER CREATION, 0 vidéo vue depuis sa mise en ligne.
-- Les élèves voyaient un cadenas et le message « se débloque plus loin de ton
-- parcours » — alors qu'il n'y avait pas de « plus loin ».
--
-- On applique donc au pass la mécanique déjà en place pour les formations
-- gratuites (auto_enroll_user_to_free_formations) : détenir le pass inscrit.

-- 1. Nouvelle provenance d'inscription, pour distinguer ce que le pass a donné
alter table public.formation_enrollments
  drop constraint formation_enrollments_source_check;

alter table public.formation_enrollments
  add constraint formation_enrollments_source_check check (
    source = any (array[
      'manual', 'systemeio', 'stripe', 'gift', 'coach_grant', 'import',
      'parcours', 'auto_free', 'a_la_carte', 'auto_cm_complete', 'auto_pass'
    ])
  );

-- 2. Aligner les inscriptions d'une personne sur le pass qu'elle détient
create or replace function public.synchroniser_formations_du_pass(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_a_le_pass boolean;
begin
  select exists (
    select 1 from public.user_passes
    where user_id = p_user_id
      and pass_type = 'liberty'
      and revoked_at is null
  ) into v_a_le_pass;

  if v_a_le_pass then
    -- Inscription à toutes les formations réservées Liberty. Une inscription
    -- existante est réactivée sans perdre sa provenance (un accès donné à la
    -- main reste 'manual').
    insert into public.formation_enrollments (user_id, formation_id, source, granted_at)
    select p_user_id, f.id, 'auto_pass', now()
    from public.formations f
    where f.access_mode = 'liberty_only'
      and f.status = 'published'
    on conflict (user_id, formation_id) do update
      set revoked_at = null;
  else
    -- Pass retiré : on ne retire que ce que le pass avait donné. Un accès
    -- accordé à la main survit.
    update public.formation_enrollments fe
    set revoked_at = now()
    from public.formations f
    where f.id = fe.formation_id
      and fe.user_id = p_user_id
      and fe.source = 'auto_pass'
      and fe.revoked_at is null
      and f.access_mode = 'liberty_only';
  end if;
end;
$$;

-- 3. À chaque pass accordé ou retiré
create or replace function public.trg_user_passes_formations()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if tg_op = 'DELETE' then
    perform public.synchroniser_formations_du_pass(old.user_id);
    return old;
  end if;
  perform public.synchroniser_formations_du_pass(new.user_id);
  return new;
end;
$$;

drop trigger if exists user_passes_sync_formations on public.user_passes;
create trigger user_passes_sync_formations
  after insert or update of revoked_at or delete on public.user_passes
  for each row execute function public.trg_user_passes_formations();

-- 4. À chaque nouvelle formation réservée Liberty : inscrire les membres en place.
--    Sans cela, une formation publiée après coup resterait invisible pour tous
--    ceux qui ont déjà le pass — c'est exactement ce qui vient d'arriver.
create or replace function public.trg_formations_liberty_inscrire()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if new.access_mode <> 'liberty_only' or new.status <> 'published' then
    return new;
  end if;

  insert into public.formation_enrollments (user_id, formation_id, source, granted_at)
  select up.user_id, new.id, 'auto_pass', now()
  from public.user_passes up
  where up.pass_type = 'liberty'
    and up.revoked_at is null
  on conflict (user_id, formation_id) do nothing;

  return new;
end;
$$;

drop trigger if exists formations_liberty_inscrire on public.formations;
create trigger formations_liberty_inscrire
  after insert or update of access_mode, status on public.formations
  for each row execute function public.trg_formations_liberty_inscrire();

-- 5. Rattrapage : les détenteurs actuels du Pass Liberty
do $$
declare
  r record;
begin
  for r in
    select distinct user_id
    from public.user_passes
    where pass_type = 'liberty' and revoked_at is null
  loop
    perform public.synchroniser_formations_du_pass(r.user_id);
  end loop;
end $$;
