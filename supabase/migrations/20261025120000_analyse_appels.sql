-- ─────────────────────────────────────────────────────────────────────────
-- Analyse d'appels, V1 coach (cahier des charges de Sidali, MVP du 29/09/2026 ;
-- décisions de Hassan du 25/10/2026, maquette validée).
--
-- Le coach (profiles.is_coach) ou le CEO dépose l'appel d'un élève. Une machine
-- (Vercel Sandbox, comme le Studio) transcrit, sépare les voix, mesure et note
-- l'appel avec le référentiel du type d'appel. Le coach valide ou corrige, puis
-- transmet le retour à l'élève (l'élève ne voit rien dans la plateforme en V1).
-- Seul le Setting ADS est ouvert. Le contenu des référentiels (méthode de Sidali)
-- n'est pas dans ce dépôt public : il est inséré directement en base.
-- Les coûts IA vont au journal ia_consommations (admin) et nulle part ailleurs.
-- ─────────────────────────────────────────────────────────────────────────

create or replace function public.appels_acces(p_uid uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce((select p.is_coach or p.role = 'ceo' from profiles p where p.id = p_uid), false)
$$;

-- ---------------------------------------------------------------- référentiels
create table if not exists public.appels_referentiels (
  id uuid primary key default gen_random_uuid(),
  type_appel text not null,
  version text not null,
  -- règles, grille, calibrage et script, transmis tels quels à l'IA
  contenu text not null,
  -- [{code, nom, poids}] : la note globale est calculée par le code avec ces poids
  grille jsonb not null,
  penalite_enregistrement numeric not null default 3,
  duree_min_s integer,
  duree_max_s integer,
  actif boolean not null default true,
  cree_le timestamptz not null default now(),
  unique (type_appel, version)
);

alter table public.appels_referentiels enable row level security;
drop policy if exists appels_referentiels_lecture on public.appels_referentiels;
create policy appels_referentiels_lecture on public.appels_referentiels
  for select to authenticated using (public.appels_acces(auth.uid()));
revoke all on public.appels_referentiels from anon;
revoke insert, update, delete on public.appels_referentiels from authenticated;

-- ---------------------------------------------------------------- analyses
create table if not exists public.appels_analyses (
  id uuid primary key default gen_random_uuid(),
  cree_le timestamptz not null default now(),
  maj_le timestamptz not null default now(),
  coach_id uuid not null references public.profiles(id),
  eleve_id uuid not null references public.profiles(id),
  type_appel text not null check (type_appel in ('setting_ads')),
  statut text not null default 'depose' check (statut in ('depose', 'en_cours', 'a_valider', 'valide', 'erreur')),
  etape text,
  fichier_path text,
  fichier_nom text,
  audio_path text,
  duree_s numeric,
  prospect_informe boolean not null default false,
  voix_inversees boolean not null default false,
  transcription jsonb,
  mesures jsonb,
  analyse_ia jsonb,
  analyse_coach jsonb,
  note_ia numeric,
  note_finale numeric,
  nb_corrections integer not null default 0,
  exemple_reference boolean not null default false,
  referentiel_version text,
  valide_par uuid references public.profiles(id),
  valide_le timestamptz,
  erreur text,
  jeton_hash text,
  lance_le timestamptz,
  -- l'audio est effacé au bout de 30 jours (décision 8A), le retour reste
  audio_expire_le timestamptz not null default (now() + interval '30 days'),
  audio_supprime_le timestamptz
);

create index if not exists appels_analyses_statut_idx on public.appels_analyses (statut, cree_le desc);
create index if not exists appels_analyses_eleve_idx on public.appels_analyses (eleve_id);

alter table public.appels_analyses enable row level security;

drop policy if exists appels_analyses_lecture on public.appels_analyses;
create policy appels_analyses_lecture on public.appels_analyses
  for select to authenticated using (public.appels_acces(auth.uid()));

-- Le coach crée sa ligne au dépôt ; tout le reste passe par les fonctions ci-dessous.
drop policy if exists appels_analyses_depot on public.appels_analyses;
create policy appels_analyses_depot on public.appels_analyses
  for insert to authenticated
  with check (coach_id = auth.uid() and statut = 'depose' and public.appels_acces(auth.uid())
              and type_appel = 'setting_ads');

revoke all on public.appels_analyses from anon;
revoke update, delete on public.appels_analyses from authenticated;
grant select, insert on public.appels_analyses to authenticated;

-- ---------------------------------------------------------------- stockage privé
insert into storage.buckets (id, name, public, file_size_limit)
values ('appels', 'appels', false, 524288000)
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit;

drop policy if exists appels_fichiers_lecture on storage.objects;
create policy appels_fichiers_lecture on storage.objects
  for select to authenticated
  using (bucket_id = 'appels' and public.appels_acces(auth.uid()));

drop policy if exists appels_fichiers_depot on storage.objects;
create policy appels_fichiers_depot on storage.objects
  for insert to authenticated
  with check (bucket_id = 'appels' and public.appels_acces(auth.uid()));

drop policy if exists appels_fichiers_maj on storage.objects;
create policy appels_fichiers_maj on storage.objects
  for update to authenticated
  using (bucket_id = 'appels' and public.appels_acces(auth.uid()));

-- ---------------------------------------------------------------- élèves
-- Un élève = un compte avec au moins une formation active (comme le Suivi Élèves).
create or replace function public.appels_eleves(p_q text)
returns table (id uuid, full_name text, email text)
language plpgsql stable security definer set search_path = public
as $$
begin
  if not appels_acces(auth.uid()) then
    raise exception 'Accès réservé aux coachs';
  end if;
  return query
    select p.id, p.full_name, p.email
      from profiles p
     where exists (select 1 from formation_enrollments e where e.user_id = p.id and e.revoked_at is null)
       and (coalesce(p_q, '') = '' or p.full_name ilike '%' || p_q || '%' or p.email ilike '%' || p_q || '%')
     order by p.full_name
     limit 15;
end $$;

-- ---------------------------------------------------------------- coach
-- Lance (ou relance) l'analyse : renvoie le jeton à usage unique donné à la machine.
-- p_mode = 'complet' (tout) ou 'analyse' (voix inversées : on refait seulement l'analyse).
create or replace function public.appel_lancer(p_id uuid, p_mode text default 'complet')
returns text
language plpgsql security definer set search_path = public, extensions
as $$
declare
  a appels_analyses;
  v_jeton text := encode(gen_random_bytes(24), 'hex');
begin
  if not appels_acces(auth.uid()) then
    raise exception 'Accès réservé aux coachs';
  end if;
  select * into a from appels_analyses where id = p_id for update;
  if not found then
    raise exception 'Appel introuvable';
  end if;
  if a.statut = 'en_cours' and a.lance_le > now() - interval '30 minutes' then
    raise exception 'L''analyse de cet appel est déjà en cours';
  end if;
  if p_mode = 'analyse' then
    if a.transcription is null then
      raise exception 'Pas encore de transcription pour cet appel';
    end if;
    if a.statut = 'valide' then
      raise exception 'Cet appel est déjà validé : rouvre-le d''abord';
    end if;
  elsif a.fichier_path is null then
    raise exception 'Le fichier de l''appel n''est pas encore déposé';
  end if;
  update appels_analyses
     set statut = 'en_cours', etape = 'demarrage', erreur = null, lance_le = now(),
         jeton_hash = encode(digest(v_jeton, 'sha256'), 'hex'), maj_le = now()
   where id = p_id;
  return v_jeton;
end $$;

-- « Inverser les voix » : l'IA a pris l'élève pour le prospect (ou l'inverse).
create or replace function public.appel_inverser_voix(p_id uuid)
returns text
language plpgsql security definer set search_path = public
as $$
begin
  if not appels_acces(auth.uid()) then
    raise exception 'Accès réservé aux coachs';
  end if;
  update appels_analyses set voix_inversees = not voix_inversees, analyse_coach = null, maj_le = now()
   where id = p_id and statut in ('a_valider', 'erreur');
  if not found then
    raise exception 'On ne peut inverser les voix que sur un appel à valider';
  end if;
  return appel_lancer(p_id, 'analyse');
end $$;

create or replace function public.appel_enregistrer(p_id uuid, p_analyse jsonb, p_note numeric, p_nb_corrections integer)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not appels_acces(auth.uid()) then
    raise exception 'Accès réservé aux coachs';
  end if;
  update appels_analyses
     set analyse_coach = p_analyse, note_finale = round(p_note, 1), nb_corrections = greatest(0, coalesce(p_nb_corrections, 0)),
         maj_le = now()
   where id = p_id and statut = 'a_valider';
  if not found then
    raise exception 'Cet appel n''est pas à valider';
  end if;
end $$;

create or replace function public.appel_valider(
  p_id uuid, p_analyse jsonb, p_note numeric, p_nb_corrections integer, p_exemple boolean default false)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not appels_acces(auth.uid()) then
    raise exception 'Accès réservé aux coachs';
  end if;
  update appels_analyses
     set analyse_coach = p_analyse, note_finale = round(p_note, 1), nb_corrections = greatest(0, coalesce(p_nb_corrections, 0)),
         exemple_reference = coalesce(p_exemple, false), statut = 'valide', valide_par = auth.uid(), valide_le = now(),
         maj_le = now()
   where id = p_id and statut = 'a_valider';
  if not found then
    raise exception 'Cet appel n''est pas à valider';
  end if;
end $$;

create or replace function public.appel_rouvrir(p_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not appels_acces(auth.uid()) then
    raise exception 'Accès réservé aux coachs';
  end if;
  update appels_analyses set statut = 'a_valider', valide_par = null, valide_le = null, maj_le = now()
   where id = p_id and statut = 'valide';
end $$;

-- ---------------------------------------------------------------- machine
create or replace function public._appel_job(p_id uuid, p_jeton text)
returns appels_analyses
language plpgsql security definer set search_path = public, extensions
as $$
declare
  a appels_analyses;
begin
  select * into a from appels_analyses
   where id = p_id and statut = 'en_cours'
     and jeton_hash = encode(digest(coalesce(p_jeton, ''), 'sha256'), 'hex')
   for update;
  if not found then
    raise exception 'Jeton invalide';
  end if;
  return a;
end $$;

-- Ce dont la machine a besoin : le référentiel actif du type d'appel, et la transcription
-- déjà faite quand on ne refait que l'analyse.
create or replace function public.appel_job_contexte(p_id uuid, p_jeton text)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  a appels_analyses;
  r appels_referentiels;
  v_eleve text;
begin
  a := _appel_job(p_id, p_jeton);
  select * into r from appels_referentiels where type_appel = a.type_appel and actif
   order by cree_le desc limit 1;
  if not found then
    raise exception 'Aucun référentiel actif pour ce type d''appel';
  end if;
  select split_part(coalesce(full_name, ''), ' ', 1) into v_eleve from profiles where id = a.eleve_id;
  return jsonb_build_object(
    'type_appel', a.type_appel, 'prospect_informe', a.prospect_informe, 'voix_inversees', a.voix_inversees,
    'eleve', initcap(lower(v_eleve)), 'transcription', a.transcription, 'mesures', a.mesures, 'duree_s', a.duree_s,
    'referentiel', jsonb_build_object('version', r.version, 'contenu', r.contenu, 'grille', r.grille,
      'penalite_enregistrement', r.penalite_enregistrement, 'duree_min_s', r.duree_min_s, 'duree_max_s', r.duree_max_s));
end $$;

create or replace function public.appel_job_maj(p_id uuid, p_jeton text, p_etape text)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  perform _appel_job(p_id, p_jeton);
  update appels_analyses set etape = left(p_etape, 40), maj_le = now() where id = p_id;
end $$;

create or replace function public.appel_job_transcription(
  p_id uuid, p_jeton text, p_transcription jsonb, p_duree numeric, p_audio_path text)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  perform _appel_job(p_id, p_jeton);
  update appels_analyses
     set transcription = p_transcription, duree_s = p_duree, audio_path = coalesce(p_audio_path, audio_path), maj_le = now()
   where id = p_id;
end $$;

create or replace function public.appel_job_terminer(
  p_id uuid, p_jeton text, p_analyse jsonb, p_mesures jsonb, p_note numeric, p_version text)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  a appels_analyses;
  v_eleve text;
begin
  a := _appel_job(p_id, p_jeton);
  update appels_analyses
     set statut = 'a_valider', etape = null, analyse_ia = p_analyse, analyse_coach = null, mesures = p_mesures,
         note_ia = round(p_note, 1), note_finale = round(p_note, 1), nb_corrections = 0,
         referentiel_version = p_version, jeton_hash = null, maj_le = now()
   where id = p_id;
  select full_name into v_eleve from profiles where id = a.eleve_id;
  insert into notifications (user_id, type, title, body, link, metadata)
  values (a.coach_id, 'appel_analyse', 'Analyse d''appel prête',
          'L''appel de ' || coalesce(v_eleve, 'ton élève') || ' est prêt à valider.',
          '/coaching/analyse-appels/' || p_id, jsonb_build_object('appel_id', p_id));
end $$;

create or replace function public.appel_job_erreur(p_id uuid, p_jeton text, p_message text)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  a appels_analyses;
begin
  a := _appel_job(p_id, p_jeton);
  update appels_analyses
     set statut = 'erreur', etape = null, erreur = left(p_message, 1000), jeton_hash = null, maj_le = now()
   where id = p_id;
  insert into notifications (user_id, type, title, body, link, metadata)
  values (a.coach_id, 'appel_erreur', 'L''analyse d''appel n''a pas abouti', left(p_message, 300),
          '/coaching/analyse-appels/' || p_id, jsonb_build_object('appel_id', p_id));
end $$;

-- Coût de chaque appel à l'IA : au journal (admin seulement), jamais sur la ligne de l'appel.
create or replace function public.appel_job_cout(p_id uuid, p_jeton text, p_modele text, p_cout numeric, p_etape text)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  a appels_analyses;
begin
  a := _appel_job(p_id, p_jeton);
  if coalesce(p_cout, 0) <= 0 then
    return;
  end if;
  insert into ia_consommations (user_id, fonctionnalite, modele, cout_usd, reference, statut)
  values (a.coach_id, 'analyse_appels', left(coalesce(p_modele, '?'), 80), least(p_cout, 5),
          'appel:' || p_id || ':' || left(coalesce(p_etape, ''), 20), 'ok');
end $$;

-- Machine disparue sans prévenir : au bout de 30 minutes, l'appel passe en erreur.
create or replace function public.appels_bloques()
returns integer
language sql security definer set search_path = public
as $$
  with b as (
    update appels_analyses
       set statut = 'erreur', etape = null, jeton_hash = null, maj_le = now(),
           erreur = 'L''analyse s''est interrompue. Relance-la depuis la fiche de l''appel.'
     where statut = 'en_cours' and lance_le < now() - interval '30 minutes'
    returning 1)
  select count(*)::integer from b
$$;

-- ---------------------------------------------------------------- droits
revoke all on function public.appels_acces(uuid) from public, anon;
revoke all on function public.appels_eleves(text) from public, anon;
revoke all on function public.appel_lancer(uuid, text) from public, anon;
revoke all on function public.appel_inverser_voix(uuid) from public, anon;
revoke all on function public.appel_enregistrer(uuid, jsonb, numeric, integer) from public, anon;
revoke all on function public.appel_valider(uuid, jsonb, numeric, integer, boolean) from public, anon;
revoke all on function public.appel_rouvrir(uuid) from public, anon;
revoke all on function public._appel_job(uuid, text) from public, anon, authenticated;
revoke all on function public.appels_bloques() from public, anon, authenticated;
grant execute on function public.appels_acces(uuid) to authenticated;
grant execute on function public.appels_eleves(text) to authenticated;
grant execute on function public.appel_lancer(uuid, text) to authenticated;
grant execute on function public.appel_inverser_voix(uuid) to authenticated;
grant execute on function public.appel_enregistrer(uuid, jsonb, numeric, integer) to authenticated;
grant execute on function public.appel_valider(uuid, jsonb, numeric, integer, boolean) to authenticated;
grant execute on function public.appel_rouvrir(uuid) to authenticated;
-- la machine n'a que la clé publique et son jeton à usage unique
grant execute on function public.appel_job_contexte(uuid, text) to anon, authenticated;
grant execute on function public.appel_job_maj(uuid, text, text) to anon, authenticated;
grant execute on function public.appel_job_transcription(uuid, text, jsonb, numeric, text) to anon, authenticated;
grant execute on function public.appel_job_terminer(uuid, text, jsonb, jsonb, numeric, text) to anon, authenticated;
grant execute on function public.appel_job_erreur(uuid, text, text) to anon, authenticated;
grant execute on function public.appel_job_cout(uuid, text, text, numeric, text) to anon, authenticated;

-- ---------------------------------------------------------------- tâches planifiées
select cron.unschedule(jobname) from cron.job where jobname in ('appels_bloques', 'appels_nettoyage');
select cron.schedule('appels_bloques', '*/10 * * * *', $$ select public.appels_bloques() $$);
-- l'audio ne s'efface que par l'API Storage : une edge function s'en charge
select cron.schedule('appels_nettoyage', '45 3 * * *', $$
  select net.http_post(
    url := 'https://ktvszjzryabjgxyobtyc.supabase.co/functions/v1/appels-nettoyage',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb,
    timeout_milliseconds := 60000)
$$);
