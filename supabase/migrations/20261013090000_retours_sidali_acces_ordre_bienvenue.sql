-- ─────────────────────────────────────────────────────────────────────────
-- Retours de Sidali du 13/10/2026 sur les parcours.
--
-- 1. ORDRE : Parcours Setting/Closing en premier (« c'est ce qui les débloque et
--    leur donne des résultats le plus vite »), puis Community Management, puis
--    Estimaction.
--
-- 2. VIDÉO DE BIENVENUE au début des deux parcours : le Ch. 1 « Introduction »
--    de la phase Fondations (mot de bienvenue de Sidali) est copié en tête de la
--    PARTIE 0 de chaque parcours, sous le titre « Bienvenue dans AL BARAKA ». Les
--    autres vidéos d'accueil Fondations « sautent ». Correspondance enregistrée :
--    les élèves qui l'avaient vue la retrouvent cochée (sans déblocage ni Discord).
--
-- 3. PASS RETIRÉ = PLUS AUCUN ACCÈS : « à partir du moment où je retire l'accès
--    au Pass, l'élève n'a plus accès à rien. Ni les parcours, ni Estimaction, ni
--    aucune formation. » Quand un élève a un pass retiré et plus aucun pass actif,
--    toutes ses inscriptions sont fermées (marquées « [coupure-pass] »). Si Sidali
--    lui rend un pass, ce que la coupure avait fermé est rouvert.
--
-- 4. AUTOMATIQUE : « dès qu'un élève passe en « perdu » dans les impayés, tous ses
--    accès sont retirés ». Quand une vente passe en 'lost', les pass actifs de
--    l'acheteur sont retirés et toutes ses inscriptions fermées (le déclencheur
--    ne vaut que pour les passages à venir ; les ventes déjà perdues : point 5).
--
-- 5. Ventes déjà « perdues » dont l'acheteur gardait un pass actif : pass retiré
--    (décision de Hassan du 13/10/2026, même règle que pour les autres).
--
-- 6. Application immédiate à tous les élèves dont le pass est retiré.
--    (Les annotations individuelles — retraits définitifs décidés par Sidali —
--    ont été posées hors dépôt : le dépôt est public, pas de données d'élèves ici.)
--
-- Les formations « à la carte » restent publiées et vendables ; leur affichage
-- (masquées sauf pour leurs acheteurs) est géré côté application.
-- ─────────────────────────────────────────────────────────────────────────

-- 1. Ordre ------------------------------------------------------------------
update public.formations set ordre = -3 where slug = 'parcours-setter-closer';
update public.formations set ordre = -2 where slug = 'parcours-community-management';
update public.formations set ordre = -1 where slug = 'estimaction';

-- 3. Coupure des accès ------------------------------------------------------
create or replace function public.acces_formations_coupe(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  -- Un pass a été retiré et aucun n'est actif : l'élève n'a plus accès à rien.
  select exists (select 1 from public.user_passes where user_id = p_user_id and revoked_at is not null)
     and not exists (select 1 from public.user_passes where user_id = p_user_id and revoked_at is null);
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
  return v_n;
end;
$$;

create or replace function public.synchroniser_formations_du_pass(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_liberty boolean;
  v_un_pass boolean;
begin
  select exists (select 1 from public.user_passes where user_id = p_user_id and pass_type = 'liberty' and revoked_at is null),
         exists (select 1 from public.user_passes where user_id = p_user_id and pass_type in ('al_baraka', 'liberty') and revoked_at is null)
    into v_liberty, v_un_pass;

  -- formations réservées Liberty (inchangé)
  if v_liberty then
    insert into public.formation_enrollments (user_id, formation_id, source, granted_at)
    select p_user_id, f.id, 'auto_pass', now()
    from public.formations f
    where f.access_mode = 'liberty_only' and f.status = 'published'
    on conflict (user_id, formation_id) do update set revoked_at = null;
  else
    update public.formation_enrollments fe set revoked_at = now()
    from public.formations f
    where f.id = fe.formation_id and fe.user_id = p_user_id and fe.source = 'auto_pass'
      and fe.revoked_at is null and f.access_mode = 'liberty_only';
  end if;

  -- parcours donnés par le pass (Al Baraka ou Liberty)
  if v_un_pass then
    insert into public.formation_enrollments (user_id, formation_id, source, granted_at)
    select p_user_id, f.id, 'auto_pass', now()
    from public.formations f
    where f.access_mode = 'pass' and f.status = 'published'
    on conflict (user_id, formation_id) do update set revoked_at = null;

    -- Pass rendu : on rouvre ce que la coupure avait fermé (Estimaction, achats
    -- à la carte…), en gardant la trace dans les notes.
    update public.formation_enrollments
    set revoked_at = null,
        notes = replace(notes, '[coupure-pass]', '[rouvert le ' || to_char(now(), 'DD/MM/YYYY') || ', coupé]')
    where user_id = p_user_id and revoked_at is not null and notes like '%[coupure-pass]%';
  else
    update public.formation_enrollments fe set revoked_at = now()
    from public.formations f
    where f.id = fe.formation_id and fe.user_id = p_user_id and fe.source = 'auto_pass'
      and fe.revoked_at is null and f.access_mode = 'pass';
  end if;

  -- Règle de Sidali (13/10/2026) : pass retiré = plus aucun accès.
  if public.acces_formations_coupe(p_user_id) then
    perform public.couper_acces_formations(p_user_id, 'pass retiré');
  end if;
end;
$$;

-- Une nouvelle formation libre n'est pas ouverte aux élèves coupés.
create or replace function public.auto_enroll_all_users_to_new_free_formation()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if new.access_mode = 'free' and new.status = 'published' then
    insert into public.formation_enrollments (user_id, formation_id, source, granted_at)
    select p.id, new.id, 'auto_free', now()
    from public.profiles p
    where p.is_active = true
      and not public.acces_formations_coupe(p.id)
    on conflict do nothing;
  end if;
  return new;
end;
$$;

-- 4. Vente passée en « perdu » → accès retirés ---------------------------------
create or replace function public.couper_acces_si_vente_perdue()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_eleve uuid;
  v_motif text;
begin
  if new.payment_status is distinct from 'lost' or old.payment_status is not distinct from 'lost' then
    return new;
  end if;

  v_eleve := coalesce(
    new.buyer_profile_id,
    (select p.id from public.contacts c join public.profiles p on lower(p.email) = lower(c.email)
     where c.id = new.contact_id limit 1));
  if v_eleve is null or public.is_ceo(v_eleve) then
    return new;
  end if;

  v_motif := 'vente « ' || coalesce(new.product, '?') || ' » passée en perdu';

  -- Le retrait des pass déclenche synchroniser_formations_du_pass, qui coupe tout.
  update public.user_passes
  set revoked_at = now(),
      notes = concat_ws(' · ', nullif(notes, ''), 'retiré automatiquement : ' || v_motif || ' le ' || to_char(now(), 'DD/MM/YYYY'))
  where user_id = v_eleve and revoked_at is null;

  -- Acheteur sans pass (formation à la carte) : on coupe aussi.
  perform public.couper_acces_formations(v_eleve, v_motif);
  return new;
end;
$$;

drop trigger if exists sales_couper_acces_si_perdu on public.sales;
create trigger sales_couper_acces_si_perdu
  after update of payment_status on public.sales
  for each row execute function public.couper_acces_si_vente_perdue();

-- 2. Vidéo de bienvenue en tête des deux parcours ----------------------------
do $$
declare
  v_source uuid;
  v_module record;
  v_chapitre uuid;
  v_video record;
  v_copie_video uuid;
begin
  select pc.id into v_source
  from public.parcours_chapitres pc
  join public.parcours_phases ph on ph.id = pc.phase_id
  join public.parcours p on p.id = ph.parcours_id
  where p.slug = 'al-baraka' and ph.numero = 1 and pc.numero = 1;
  if v_source is null then
    raise exception 'vidéo de bienvenue (Fondations, Ch. 1) introuvable';
  end if;

  perform set_config('app.parcours_reprise', 'on', true);

  for v_module in
    select m.id from public.formation_modules m join public.formations f on f.id = m.formation_id
    where f.slug in ('parcours-setter-closer', 'parcours-community-management') and m.ordre = 0
  loop
    if exists (select 1 from public.formation_chapitres where module_id = v_module.id and titre = 'Bienvenue dans AL BARAKA') then
      continue;
    end if;

    insert into public.formation_chapitres (module_id, titre, description, ordre, status, duree_estimee_minutes)
    select v_module.id, 'Bienvenue dans AL BARAKA',
           E'• Bienvenue dans AL BARAKA — mot de bienvenue de Sidali\n• Ta mission en tant qu''affilié : tu changes des vies, pas juste tu vends',
           (select coalesce(min(ordre), 0) - 1 from public.formation_chapitres where module_id = v_module.id),
           'published', duree_estimee_minutes
    from public.parcours_chapitres where id = v_source
    returning id into v_chapitre;

    for v_video in select * from public.parcours_chapitre_videos where chapitre_id = v_source order by ordre loop
      insert into public.chapitre_videos (chapitre_id, titre, url, vimeo_id, ordre, duree_secondes, notes)
      values (v_chapitre, v_video.titre, v_video.url, v_video.vimeo_id, v_video.ordre, v_video.duree_secondes, v_video.notes)
      returning id into v_copie_video;
      insert into public.chapitre_ressources (chapitre_id, titre, type, url, ordre, video_id)
      select v_chapitre, titre, type, url, ordre, v_copie_video from public.parcours_chapitre_ressources
      where chapitre_id = v_source and video_id = v_video.id;
    end loop;

    insert into public.parcours_correspondances_chapitres (copie_id, source_chapitre_id, source_parcours_chapitre_id)
    values (v_chapitre, null, v_source);

    -- Reprise : ceux qui l'avaient vue dans l'ancien parcours la retrouvent cochée.
    insert into public.chapitre_progress (user_id, chapitre_id, completed_at)
    select pp.user_id, v_chapitre, pp.completed_at
    from public.parcours_chapitre_progress pp
    where pp.chapitre_id = v_source
    on conflict do nothing;
  end loop;

  perform set_config('app.parcours_reprise', 'off', true);
end $$;

-- 5. Ventes déjà « perdues » dont l'acheteur gardait un pass -----------------
update public.user_passes up
set revoked_at = now(),
    notes = concat_ws(' · ', nullif(up.notes, ''), 'retiré le 13/10/2026 (décision Hassan) : vente déjà passée en perdu')
from public.profiles p
where p.id = up.user_id and up.revoked_at is null and not public.is_ceo(p.id)
  and exists (select 1 from public.sales s where s.payment_status = 'lost'
              and (s.buyer_profile_id = p.id
                   or s.contact_id in (select c.id from public.contacts c where lower(c.email) = lower(p.email))));

-- 6. Application aux élèves dont le pass est déjà retiré ---------------------
do $$
declare
  u record;
begin
  for u in
    select distinct user_id from public.user_passes up
    where up.revoked_at is not null and public.acces_formations_coupe(up.user_id)
  loop
    perform public.couper_acces_formations(u.user_id, 'pass retiré');
  end loop;
end $$;
