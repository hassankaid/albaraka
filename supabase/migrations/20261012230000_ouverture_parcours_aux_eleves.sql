-- ─────────────────────────────────────────────────────────────────────────
-- Ouverture des parcours Community Management et Setting/Closing aux élèves
-- (vocal de Sidali du 12/10/2026, décisions de Hassan le même jour).
--
-- Période de transition : les anciennes formations et l'ancien « Parcours Al Baraka »
-- RESTENT visibles ; les deux parcours s'ajoutent, en tête de la liste.
--
-- 1. Accès : mode « pass ». Les deux parcours sont publiés et donnés à tout détenteur
--    d'un Pass Al Baraka ou Liberty actif (synchroniser_formations_du_pass, déclenché à
--    chaque pass accordé ou retiré). Le reste du Pass Liberty ne change pas.
-- 2. Correspondances : chaque chapitre des parcours est relié au chapitre d'origine dont
--    il est la copie (même vidéo) : formations d'origine et phases du Parcours Al Baraka.
--    Le Setting des parcours est un contenu nouveau (nouvelles vidéos) : sans origine.
--    Les quiz sont reliés par leur titre (quiz de chapitre, ou de fin de formation).
-- 3. Reprise : la progression et les quiz validés des chapitres d'origine sont reportés.
-- 4. Pendant la transition, ce qui est fait d'un côté est coché de l'autre.
-- 5. Déblocages, une fois par élève et par partie terminée :
--      Setting/Closing P1 Setting   → page activité + liens de paiement + rôle Discord Setting
--      Setting/Closing P2 Closing   → rôle Discord Closing
--      Community Mgmt P3 Marketing  → quiz d'organisation + rôle Discord Marketing
--      Community Mgmt P4 CM         → inscription à la formation Administratif
--    (les mêmes règles que pour les formations d'origine, debloquer_fin_de_formation).
-- ─────────────────────────────────────────────────────────────────────────

-- 1. le mode d'accès « pass »
alter table public.formations drop constraint if exists formations_access_mode_check;
alter table public.formations add constraint formations_access_mode_check
  check (access_mode = any (array['parcours', 'free', 'liberty_only', 'al_baraka_only', 'pass']));

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
  else
    update public.formation_enrollments fe set revoked_at = now()
    from public.formations f
    where f.id = fe.formation_id and fe.user_id = p_user_id and fe.source = 'auto_pass'
      and fe.revoked_at is null and f.access_mode = 'pass';
  end if;
end;
$$;

-- 2. correspondances chapitres et quiz (lecture réservée aux fonctions)
create table if not exists public.parcours_correspondances_chapitres (
  copie_id uuid not null references public.formation_chapitres(id) on delete cascade,
  source_chapitre_id uuid references public.formation_chapitres(id) on delete cascade,
  source_parcours_chapitre_id uuid references public.parcours_chapitres(id) on delete cascade,
  check ((source_chapitre_id is null) <> (source_parcours_chapitre_id is null))
);
create unique index if not exists parcours_corr_chap_f on public.parcours_correspondances_chapitres (copie_id, source_chapitre_id);
create unique index if not exists parcours_corr_chap_p on public.parcours_correspondances_chapitres (copie_id, source_parcours_chapitre_id);
create index if not exists parcours_corr_chap_src_f on public.parcours_correspondances_chapitres (source_chapitre_id);
create index if not exists parcours_corr_chap_src_p on public.parcours_correspondances_chapitres (source_parcours_chapitre_id);

create table if not exists public.parcours_correspondances_quiz (
  copie_quiz_id uuid not null references public.quizzes(id) on delete cascade,
  source_quiz_id uuid not null references public.quizzes(id) on delete cascade,
  primary key (copie_quiz_id, source_quiz_id)
);
create index if not exists parcours_corr_quiz_src on public.parcours_correspondances_quiz (source_quiz_id);

create table if not exists public.parcours_parties_terminees (
  user_id uuid not null references auth.users(id) on delete cascade,
  module_id uuid not null references public.formation_modules(id) on delete cascade,
  termine_le timestamptz not null default now(),
  primary key (user_id, module_id)
);

alter table public.parcours_correspondances_chapitres enable row level security;
alter table public.parcours_correspondances_quiz enable row level security;
alter table public.parcours_parties_terminees enable row level security;
drop policy if exists parcours_parties_terminees_lire on public.parcours_parties_terminees;
create policy parcours_parties_terminees_lire on public.parcours_parties_terminees for select to authenticated
  using (user_id = auth.uid() or public.is_ceo(auth.uid()));
revoke all on public.parcours_correspondances_chapitres, public.parcours_correspondances_quiz from anon, authenticated;

with copies as (
  select c.id, (select v.url from public.chapitre_videos v where v.chapitre_id = c.id order by v.ordre limit 1) video
  from public.formation_chapitres c
  join public.formation_modules m on m.id = c.module_id
  join public.formations f on f.id = m.formation_id
  where f.slug in ('parcours-community-management', 'parcours-setter-closer')
), sources as (
  select c.id, (select v.url from public.chapitre_videos v where v.chapitre_id = c.id order by v.ordre limit 1) video
  from public.formation_chapitres c
  join public.formation_modules m on m.id = c.module_id
  join public.formations f on f.id = m.formation_id
  where f.slug not in ('parcours-community-management', 'parcours-setter-closer')
)
insert into public.parcours_correspondances_chapitres (copie_id, source_chapitre_id)
select co.id, s.id from copies co join sources s on s.video = co.video
where co.video is not null
on conflict do nothing;

with copies as (
  select c.id, (select v.url from public.chapitre_videos v where v.chapitre_id = c.id order by v.ordre limit 1) video
  from public.formation_chapitres c
  join public.formation_modules m on m.id = c.module_id
  join public.formations f on f.id = m.formation_id
  where f.slug in ('parcours-community-management', 'parcours-setter-closer')
), sources as (
  select c.id, (select v.url from public.parcours_chapitre_videos v where v.chapitre_id = c.id order by v.ordre limit 1) video
  from public.parcours_chapitres c
  join public.parcours_phases ph on ph.id = c.phase_id
  join public.parcours p on p.id = ph.parcours_id
  where p.slug = 'al-baraka'
)
insert into public.parcours_correspondances_chapitres (copie_id, source_parcours_chapitre_id)
select co.id, s.id from copies co join sources s on s.video = co.video
where co.video is not null
on conflict do nothing;

-- quiz de chapitre : même titre, dans le chapitre d'origine
insert into public.parcours_correspondances_quiz (copie_quiz_id, source_quiz_id)
select qc.id, qs.id
from public.parcours_correspondances_chapitres corr
join public.quizzes qc on qc.chapitre_id = corr.copie_id
join public.quizzes qs on qs.chapitre_id = corr.source_chapitre_id and trim(qs.titre) = trim(qc.titre)
on conflict do nothing;
-- « Validation finale » : le quiz de fin de la formation d'origine, même titre
insert into public.parcours_correspondances_quiz (copie_quiz_id, source_quiz_id)
select qc.id, qs.id
from public.quizzes qc
join public.formation_chapitres c on c.id = qc.chapitre_id
join public.formation_modules m on m.id = c.module_id
join public.formations f on f.id = m.formation_id
join public.quizzes qs on qs.chapitre_id is null and qs.module_id is null and trim(qs.titre) = trim(qc.titre)
where f.slug in ('parcours-community-management', 'parcours-setter-closer')
on conflict do nothing;

-- 3. reprise de la progression (sans déclencher Discord ni la synchronisation)
set local app.parcours_reprise = 'on';

insert into public.chapitre_progress (user_id, chapitre_id, completed_at)
select cp.user_id, corr.copie_id, min(cp.completed_at)
from public.chapitre_progress cp
join public.parcours_correspondances_chapitres corr on corr.source_chapitre_id = cp.chapitre_id
group by cp.user_id, corr.copie_id
on conflict (user_id, chapitre_id) do nothing;

insert into public.chapitre_progress (user_id, chapitre_id, completed_at)
select pcp.user_id, corr.copie_id, min(pcp.completed_at)
from public.parcours_chapitre_progress pcp
join public.parcours_correspondances_chapitres corr on corr.source_parcours_chapitre_id = pcp.chapitre_id
group by pcp.user_id, corr.copie_id
on conflict (user_id, chapitre_id) do nothing;

insert into public.quiz_attempts (user_id, quiz_id, errors_count, total_questions, answers, validated, completed_at)
select distinct on (qa.user_id, corr.copie_quiz_id)
       qa.user_id, corr.copie_quiz_id, qa.errors_count, qa.total_questions, qa.answers, true, qa.completed_at
from public.quiz_attempts qa
join public.parcours_correspondances_quiz corr on corr.source_quiz_id = qa.quiz_id
where qa.validated
  and not exists (select 1 from public.quiz_attempts x where x.user_id = qa.user_id and x.quiz_id = corr.copie_quiz_id and x.validated)
order by qa.user_id, corr.copie_quiz_id, qa.completed_at;

-- chapitres sans vidéo, faits d'un quiz (« Validation finale ») : cochés quand leur quiz est validé
insert into public.chapitre_progress (user_id, chapitre_id, completed_at)
select qa.user_id, ch.id, min(qa.completed_at)
from public.formation_chapitres ch
join public.formation_modules m on m.id = ch.module_id
join public.formations f on f.id = m.formation_id
join public.quizzes q on q.chapitre_id = ch.id
join public.quiz_attempts qa on qa.quiz_id = q.id and qa.validated
where f.slug in ('parcours-community-management', 'parcours-setter-closer')
  and not exists (select 1 from public.chapitre_videos v where v.chapitre_id = ch.id)
group by qa.user_id, ch.id
on conflict (user_id, chapitre_id) do nothing;

-- 4. synchronisation pendant la transition
create or replace function public.parcours_synchroniser_chapitre()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if current_setting('app.parcours_reprise', true) = 'on' or pg_trigger_depth() > 4 then
    return new;
  end if;
  insert into public.chapitre_progress (user_id, chapitre_id, completed_at)
  select new.user_id, x.id, coalesce(new.completed_at, now())
  from (
    select copie_id as id from public.parcours_correspondances_chapitres where source_chapitre_id = new.chapitre_id
    union
    select source_chapitre_id from public.parcours_correspondances_chapitres
     where copie_id = new.chapitre_id and source_chapitre_id is not null
  ) x
  on conflict (user_id, chapitre_id) do nothing;
  insert into public.parcours_chapitre_progress (user_id, chapitre_id, completed_at)
  select new.user_id, source_parcours_chapitre_id, coalesce(new.completed_at, now())
  from public.parcours_correspondances_chapitres
  where copie_id = new.chapitre_id and source_parcours_chapitre_id is not null
  on conflict (user_id, chapitre_id) do nothing;
  return new;
end;
$$;

create or replace function public.parcours_synchroniser_chapitre_ancien()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if current_setting('app.parcours_reprise', true) = 'on' or pg_trigger_depth() > 4 then
    return new;
  end if;
  insert into public.chapitre_progress (user_id, chapitre_id, completed_at)
  select new.user_id, copie_id, coalesce(new.completed_at, now())
  from public.parcours_correspondances_chapitres
  where source_parcours_chapitre_id = new.chapitre_id
  on conflict (user_id, chapitre_id) do nothing;
  return new;
end;
$$;

create or replace function public.parcours_synchroniser_quiz()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if not coalesce(new.validated, false) or current_setting('app.parcours_reprise', true) = 'on' or pg_trigger_depth() > 4 then
    return new;
  end if;
  insert into public.quiz_attempts (user_id, quiz_id, errors_count, total_questions, answers, validated, completed_at)
  select new.user_id, x.id, new.errors_count, new.total_questions, new.answers, true, coalesce(new.completed_at, now())
  from (
    select copie_quiz_id as id from public.parcours_correspondances_quiz where source_quiz_id = new.quiz_id
    union
    select source_quiz_id from public.parcours_correspondances_quiz where copie_quiz_id = new.quiz_id
  ) x
  where not exists (select 1 from public.quiz_attempts a where a.user_id = new.user_id and a.quiz_id = x.id and a.validated);
  return new;
end;
$$;

drop trigger if exists parcours_synchroniser on public.chapitre_progress;
create trigger parcours_synchroniser after insert on public.chapitre_progress
  for each row execute function public.parcours_synchroniser_chapitre();
drop trigger if exists parcours_synchroniser on public.parcours_chapitre_progress;
create trigger parcours_synchroniser after insert on public.parcours_chapitre_progress
  for each row execute function public.parcours_synchroniser_chapitre_ancien();
drop trigger if exists parcours_synchroniser on public.quiz_attempts;
create trigger parcours_synchroniser after insert on public.quiz_attempts
  for each row execute function public.parcours_synchroniser_quiz();

-- 5. parties terminées et déblocages
create or replace function public.partie_terminee_pour(p_user uuid, p_module uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select exists (
           select 1 from formation_chapitres ch join formation_modules m on m.id = ch.module_id
           where m.id = p_module and m.status = 'published' and ch.status = 'published')
     and not exists (
           select 1 from formation_chapitres ch join formation_modules m on m.id = ch.module_id
           where m.id = p_module and m.status = 'published' and ch.status = 'published'
             and not exists (select 1 from chapitre_progress cp where cp.user_id = p_user and cp.chapitre_id = ch.id))
     and not exists (
           select 1 from quizzes q
           where q.status = 'published'
             and (q.module_id = p_module
                  or q.chapitre_id in (select ch.id from formation_chapitres ch where ch.module_id = p_module and ch.status = 'published'))
             and not exists (select 1 from quiz_attempts qa where qa.user_id = p_user and qa.quiz_id = q.id and qa.validated));
$$;

create or replace function public.debloquer_parties_parcours(p_user_id uuid, p_formation_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public', 'extensions'
as $$
declare
  v_slug text;
  r record;
  v_discord uuid;
  v_anon_key text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0dnN6anpyeWFiamd4eW9idHljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwMDQwODYsImV4cCI6MjA4NzU4MDA4Nn0.Hck5qF0GQ9-KEMvJiuu10-i-9562mEWBOBuHMTG33ZY';
begin
  select slug into v_slug from formations where id = p_formation_id;
  if v_slug is null or v_slug not in ('parcours-setter-closer', 'parcours-community-management') then
    return;
  end if;
  for r in
    select m.id, m.ordre from formation_modules m
    where m.formation_id = p_formation_id
      and ((v_slug = 'parcours-setter-closer' and m.ordre in (1, 2))
        or (v_slug = 'parcours-community-management' and m.ordre in (3, 4)))
  loop
    continue when exists (select 1 from parcours_parties_terminees where user_id = p_user_id and module_id = r.id);
    continue when not public.partie_terminee_pour(p_user_id, r.id);
    insert into parcours_parties_terminees (user_id, module_id) values (p_user_id, r.id) on conflict do nothing;
    v_discord := null;

    if v_slug = 'parcours-setter-closer' and r.ordre = 1 then          -- SETTING
      insert into user_feature_unlocks (user_id, feature, unlocked_by) values (p_user_id, 'working_activity', 'parcours_setting_complete') on conflict (user_id, feature) do nothing;
      insert into user_feature_unlocks (user_id, feature, unlocked_by) values (p_user_id, 'payment_links', 'parcours_setting_complete') on conflict (user_id, feature) do nothing;
      v_discord := 'e9b91eb6-2612-45eb-b28d-947bfdaad974';
    elsif v_slug = 'parcours-setter-closer' and r.ordre = 2 then       -- CLOSING
      v_discord := '7e533baa-7b5e-42cf-8473-6a9fd19c318f';
    elsif v_slug = 'parcours-community-management' and r.ordre = 3 then -- MARKETING DIGITAL
      insert into user_feature_unlocks (user_id, feature, unlocked_by) values (p_user_id, 'quiz_organisation', 'parcours_marketing_complete') on conflict (user_id, feature) do nothing;
      v_discord := '4949ffda-77d2-450e-adad-83554645af32';
    elsif v_slug = 'parcours-community-management' and r.ordre = 4 then -- COMMUNITY MANAGEMENT
      insert into formation_enrollments (user_id, formation_id, source, granted_by)
      values (p_user_id, '55ecc5b4-2f0c-41c4-8467-3d6136e886b4', 'auto_cm_complete', p_user_id)
      on conflict (user_id, formation_id) do update set revoked_at = null;
    end if;

    -- rôle Discord (comme à la fin de la formation d'origine) ; pas pendant la reprise
    if v_discord is not null and coalesce(current_setting('app.parcours_reprise', true), '') <> 'on' then
      perform net.http_post(
        url := 'https://ktvszjzryabjgxyobtyc.supabase.co/functions/v1/discord-grant-role',
        headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || v_anon_key),
        body := jsonb_build_object('user_id', p_user_id, 'formation_id', v_discord, 'reason', 'formation_completed', 'source', 'auto'));
    end if;
  end loop;
end;
$$;

-- les règles de fin de formation appellent aussi les parties des parcours
create or replace function public.debloquer_fin_de_formation(p_user_id uuid, p_formation_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_marketing_id uuid := '4949ffda-77d2-450e-adad-83554645af32';
  v_setting_id   uuid := 'e9b91eb6-2612-45eb-b28d-947bfdaad974';
  v_cm_id        uuid := '9eb4a903-ec69-4d4e-be8b-1da855a411f4';
  v_admin_id     uuid := '55ecc5b4-2f0c-41c4-8467-3d6136e886b4';
begin
  perform public.debloquer_parties_parcours(p_user_id, p_formation_id);

  if p_formation_id is null or p_formation_id not in (v_marketing_id, v_setting_id, v_cm_id) then
    return;
  end if;
  if not public.is_formation_complete_for_user(p_user_id, p_formation_id) then
    return;
  end if;

  -- MARKETING DIGITAL complet -> quiz d'organisation
  if p_formation_id = v_marketing_id then
    insert into public.user_feature_unlocks (user_id, feature, unlocked_by)
    values (p_user_id, 'quiz_organisation', 'marketing_digital_complete')
    on conflict (user_id, feature) do nothing;
  end if;

  -- SETTING complet -> page activité + liens de paiement
  if p_formation_id = v_setting_id then
    insert into public.user_feature_unlocks (user_id, feature, unlocked_by)
    values (p_user_id, 'working_activity', 'setting_complete')
    on conflict (user_id, feature) do nothing;
    insert into public.user_feature_unlocks (user_id, feature, unlocked_by)
    values (p_user_id, 'payment_links', 'setting_complete')
    on conflict (user_id, feature) do nothing;
  end if;

  -- COMMUNITY MANAGEMENT complet -> inscription ADMINISTRATIF
  if p_formation_id = v_cm_id then
    insert into public.formation_enrollments (user_id, formation_id, source, granted_by)
    values (p_user_id, v_admin_id, 'auto_cm_complete', p_user_id)
    on conflict (user_id, formation_id) do update set revoked_at = null;
  end if;
end;
$$;

-- parties déjà terminées grâce à la reprise (sans Discord : ces élèves ont déjà leurs rôles)
do $$
declare r record;
begin
  for r in
    select distinct cp.user_id, m.formation_id
    from chapitre_progress cp
    join formation_chapitres ch on ch.id = cp.chapitre_id
    join formation_modules m on m.id = ch.module_id
    join formations f on f.id = m.formation_id
    where f.slug in ('parcours-setter-closer', 'parcours-community-management')
  loop
    perform public.debloquer_parties_parcours(r.user_id, r.formation_id);
  end loop;
end $$;

-- 6. publication, en tête de la liste, et accès des détenteurs d'un pass
update public.formations set status = 'published', access_mode = 'pass', ordre = -2 where slug = 'parcours-community-management';
update public.formations set status = 'published', access_mode = 'pass', ordre = -1 where slug = 'parcours-setter-closer';

do $$
declare r record;
begin
  for r in select distinct user_id from public.user_passes where revoked_at is null loop
    perform public.synchroniser_formations_du_pass(r.user_id);
  end loop;
end $$;

grant execute on function public.partie_terminee_pour(uuid, uuid) to authenticated;
