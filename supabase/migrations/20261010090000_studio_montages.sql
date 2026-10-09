-- Studio vidéo, phase 1 : Face caméra (10/10/2026).
-- Cahier des charges de Sidali du 29/09/2026.
--
-- Un montage = une ligne. Le traitement tourne hors de Supabase, dans une
-- machine Vercel Sandbox (Paris) lancée par la fonction /api/studio/demarrer.
-- La machine ne reçoit ni clé de service ni accès à la base : elle télécharge
-- et dépose les fichiers par des liens signés, et signale son avancement par
-- les fonctions studio_job_* avec un jeton à usage unique propre au montage.
--
-- Cycle : import -> preparation -> pret -> en_cours -> termine (ou erreur).
-- La préparation (son, transcription, phrases ratées, coupes, sous-titres)
-- démarre dès la fin de l'import, pendant que l'élève fait ses réglages ; si
-- l'élève lance le montage avant la fin, la même machine enchaîne le rendu.

create table if not exists public.studio_montages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  outil text not null default 'face_camera' check (outil in ('face_camera', 'voix_off')),
  statut text not null default 'import'
    check (statut in ('import', 'preparation', 'pret', 'en_cours', 'termine', 'erreur')),
  etape text,
  lance boolean not null default false,
  reglages jsonb not null default '{}'::jsonb,
  source_nom text,
  source_path text,
  -- préparation réutilisable tant que le réglage du son ne change pas
  travail_pret boolean not null default false,
  audio_prepare text,
  apercu jsonb,
  version integer not null default 0,
  sortie_path text,
  rapport jsonb,
  erreur text,
  signalement text,
  jeton_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  termine_le timestamptz,
  -- chaque vidéo reste 30 jours dans l'espace de l'élève
  expire_le timestamptz not null default now() + interval '30 days'
);

create index if not exists studio_montages_user_idx on public.studio_montages (user_id, created_at desc);
create index if not exists studio_montages_expire_idx on public.studio_montages (expire_le);

alter table public.studio_montages enable row level security;

drop policy if exists studio_montages_select on public.studio_montages;
create policy studio_montages_select on public.studio_montages
  for select to authenticated
  using (user_id = auth.uid() or public.is_ceo(auth.uid()));

-- Phase 1 : Studio réservé au CEO. L'élève crée sa ligne à l'import ; tout le
-- reste passe par les fonctions ci-dessous (aucun update direct).
drop policy if exists studio_montages_insert on public.studio_montages;
create policy studio_montages_insert on public.studio_montages
  for insert to authenticated
  with check (user_id = auth.uid() and statut = 'import' and public.is_ceo(auth.uid()));

revoke all on public.studio_montages from anon;
revoke update, delete on public.studio_montages from authenticated;
grant select, insert on public.studio_montages to authenticated;

-- ---------------------------------------------------------------- stockage
-- {user_id}/{montage_id}/source.ext | apercu.jpg | travail/... | sortie_vN.mp4
insert into storage.buckets (id, name, public, file_size_limit)
values ('studio-videos', 'studio-videos', false, 1073741824)
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit;

drop policy if exists studio_videos_select on storage.objects;
create policy studio_videos_select on storage.objects
  for select to authenticated
  using (bucket_id = 'studio-videos'
         and ((storage.foldername(name))[1] = auth.uid()::text or public.is_ceo(auth.uid())));

drop policy if exists studio_videos_insert on storage.objects;
create policy studio_videos_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'studio-videos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists studio_videos_update on storage.objects;
create policy studio_videos_update on storage.objects
  for update to authenticated
  using (bucket_id = 'studio-videos' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------------------------------------------------------------- fonctions élève
create or replace function public.studio_preparer(p_id uuid)
returns text
language plpgsql security definer set search_path = public, extensions
as $$
declare
  v_jeton text := encode(gen_random_bytes(24), 'hex');
begin
  update studio_montages
     set statut = 'preparation', etape = 'reception', erreur = null,
         jeton_hash = encode(digest(v_jeton, 'sha256'), 'hex'), updated_at = now()
   where id = p_id and user_id = auth.uid() and statut in ('import', 'erreur')
     and source_path is not null;
  if not found then
    raise exception 'Montage introuvable ou déjà en préparation';
  end if;
  return v_jeton;
end $$;

-- Lancer le montage (ou le relancer après « Changer les réglages »).
-- Renvoie {action: attendre | demarrer | occupe, jeton?, mode?}.
create or replace function public.studio_lancer(p_id uuid, p_reglages jsonb)
returns jsonb
language plpgsql security definer set search_path = public, extensions
as $$
declare
  m studio_montages;
  v_jeton text;
  v_audio text;
begin
  select * into m from studio_montages where id = p_id and user_id = auth.uid() for update;
  if not found then
    raise exception 'Montage introuvable';
  end if;
  if jsonb_typeof(p_reglages) <> 'object' then
    raise exception 'Réglages invalides';
  end if;
  v_audio := case when coalesce((p_reglages #>> '{son,ameliorer}')::boolean, true)
                  then coalesce(p_reglages #>> '{son,niveau}', 'normal') else 'off' end;

  if m.statut = 'preparation' then
    -- la machine de préparation enchaînera le rendu en finissant
    update studio_montages set reglages = p_reglages, lance = true, updated_at = now() where id = p_id;
    return jsonb_build_object('action', 'attendre');
  elsif m.statut in ('en_cours', 'import') then
    return jsonb_build_object('action', 'occupe');
  end if;

  v_jeton := encode(gen_random_bytes(24), 'hex');
  update studio_montages
     set reglages = p_reglages, lance = true, statut = 'en_cours', etape = 'file', erreur = null,
         version = version + 1, jeton_hash = encode(digest(v_jeton, 'sha256'), 'hex'), updated_at = now()
   where id = p_id;
  return jsonb_build_object(
    'action', 'demarrer', 'jeton', v_jeton, 'version', m.version + 1,
    'mode', case when m.travail_pret and m.audio_prepare = v_audio then 'rendu' else 'complet' end);
end $$;

create or replace function public.studio_signaler(p_id uuid, p_texte text)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  m studio_montages;
begin
  update studio_montages set signalement = left(p_texte, 2000), updated_at = now()
   where id = p_id and user_id = auth.uid()
  returning * into m;
  if not found then
    raise exception 'Montage introuvable';
  end if;
  insert into notifications (user_id, type, title, body, link, metadata)
  select p.id, 'studio_signalement', 'Studio : problème signalé', left(p_texte, 300),
         '/studio/montage/' || p_id, jsonb_build_object('montage_id', p_id)
    from profiles p where p.role = 'ceo';
end $$;

-- ---------------------------------------------------------------- fonctions machine
-- Appelées par la machine de montage avec le jeton reçu au lancement.
create or replace function public._studio_job(p_id uuid, p_jeton text)
returns studio_montages
language plpgsql security definer set search_path = public, extensions
as $$
declare
  m studio_montages;
begin
  select * into m from studio_montages
   where id = p_id and jeton_hash = encode(digest(coalesce(p_jeton, ''), 'sha256'), 'hex')
     and statut in ('preparation', 'en_cours')
   for update;
  if not found then
    raise exception 'Jeton invalide';
  end if;
  return m;
end $$;

create or replace function public.studio_job_maj(p_id uuid, p_jeton text, p_etape text, p_apercu jsonb default null)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  perform _studio_job(p_id, p_jeton);
  update studio_montages
     set etape = left(p_etape, 40), apercu = coalesce(p_apercu, apercu), updated_at = now()
   where id = p_id;
end $$;

-- Fin de la préparation : enchaîne le rendu si l'élève a déjà lancé le montage.
create or replace function public.studio_job_fin_preparation(p_id uuid, p_jeton text, p_audio text)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  m studio_montages;
  v_audio text;
begin
  m := _studio_job(p_id, p_jeton);
  v_audio := case when coalesce((m.reglages #>> '{son,ameliorer}')::boolean, true)
                  then coalesce(m.reglages #>> '{son,niveau}', 'normal') else 'off' end;
  if m.lance then
    update studio_montages
       set travail_pret = true, audio_prepare = p_audio, statut = 'en_cours', etape = 'file',
           version = version + 1, updated_at = now()
     where id = p_id;
    return jsonb_build_object('continuer', true, 'reglages', m.reglages, 'version', m.version + 1,
                              'mode', case when v_audio = p_audio then 'rendu' else 'complet' end);
  end if;
  update studio_montages
     set travail_pret = true, audio_prepare = p_audio, statut = 'pret', etape = null,
         jeton_hash = null, updated_at = now()
   where id = p_id;
  return jsonb_build_object('continuer', false);
end $$;

create or replace function public.studio_job_terminer(p_id uuid, p_jeton text, p_sortie_path text, p_rapport jsonb)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  m studio_montages;
begin
  m := _studio_job(p_id, p_jeton);
  update studio_montages
     set statut = 'termine', etape = null, lance = false, sortie_path = p_sortie_path, rapport = p_rapport,
         termine_le = now(), jeton_hash = null, updated_at = now()
   where id = p_id;
  insert into notifications (user_id, type, title, body, link, metadata)
  values (m.user_id, 'studio_termine', 'Ta vidéo est prête',
          coalesce(m.source_nom, 'Ton montage') || ' : tu peux la regarder et la télécharger.',
          '/studio/montage/' || p_id, jsonb_build_object('montage_id', p_id));
end $$;

create or replace function public.studio_job_erreur(p_id uuid, p_jeton text, p_message text)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  m studio_montages;
begin
  m := _studio_job(p_id, p_jeton);
  update studio_montages
     set statut = 'erreur', erreur = left(p_message, 1000), lance = false, jeton_hash = null, updated_at = now()
   where id = p_id;
  insert into notifications (user_id, type, title, body, link, metadata)
  values (m.user_id, 'studio_erreur', 'Le montage n''a pas abouti', left(p_message, 300),
          '/studio/montage/' || p_id, jsonb_build_object('montage_id', p_id));
end $$;

-- Machine disparue sans prévenir : au bout de 30 minutes, le montage passe en erreur.
create or replace function public.studio_montages_bloques()
returns integer
language sql security definer set search_path = public
as $$
  with b as (
    update studio_montages
       set statut = 'erreur', erreur = 'Le traitement a été interrompu. Relance le montage.',
           lance = false, jeton_hash = null, updated_at = now()
     where statut in ('preparation', 'en_cours') and updated_at < now() - interval '30 minutes'
    returning 1)
  select count(*)::int from b;
$$;

revoke all on function public._studio_job(uuid, text) from public, anon, authenticated;
revoke all on function public.studio_preparer(uuid) from public, anon;
revoke all on function public.studio_lancer(uuid, jsonb) from public, anon;
revoke all on function public.studio_signaler(uuid, text) from public, anon;
revoke all on function public.studio_montages_bloques() from public, anon, authenticated;
grant execute on function public.studio_preparer(uuid) to authenticated;
grant execute on function public.studio_lancer(uuid, jsonb) to authenticated;
grant execute on function public.studio_signaler(uuid, text) to authenticated;
grant execute on function public.studio_job_maj(uuid, text, text, jsonb) to anon, authenticated;
grant execute on function public.studio_job_fin_preparation(uuid, text, text) to anon, authenticated;
grant execute on function public.studio_job_terminer(uuid, text, text, jsonb) to anon, authenticated;
grant execute on function public.studio_job_erreur(uuid, text, text) to anon, authenticated;

-- ---------------------------------------------------------------- tâches planifiées
select cron.unschedule(jobname) from cron.job where jobname in ('studio_montages_bloques', 'studio_nettoyage');
select cron.schedule('studio_montages_bloques', '*/10 * * * *', $$ select public.studio_montages_bloques() $$);
-- les fichiers ne s'effacent que par l'API Storage : une edge function s'en charge
select cron.schedule('studio_nettoyage', '30 3 * * *', $$
  select net.http_post(
    url := 'https://ktvszjzryabjgxyobtyc.supabase.co/functions/v1/studio-nettoyage',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb,
    timeout_milliseconds := 60000)
$$);
