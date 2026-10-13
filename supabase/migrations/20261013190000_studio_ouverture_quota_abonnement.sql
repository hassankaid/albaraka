-- ─────────────────────────────────────────────────────────────────────────
-- Studio ouvert aux élèves, quota et abonnement (réponses de Sidali, 13/10/2026).
--   C1  : tous les élèves avec un pass AL BARAKA ou Liberty actif.
--   C2a : une « vidéo » = une nouvelle vidéo importée (comptée à la préparation) ;
--         corrections et nouveaux rendus du même montage ne comptent pas.
--   C2b : 1 vidéo par jour gratuite ; abonnement 10 €/mois TTC = 5 par jour.
--   C3  : 5 min en face caméra, 3 min en voix off (vérifié côté application).
-- L'ouverture se fait en deux temps : studio_config.ouverture = 'testeurs' (le CEO
-- et les comptes listés dans studio_config.testeurs), puis 'eleves'.
-- L'abonnement est vérifié auprès de Stripe par l'edge function studio-abonnement
-- (mode test ou live selon studio_config.stripe_mode) : pas de webhook.
-- ─────────────────────────────────────────────────────────────────────────

create table if not exists public.studio_config (
  cle text primary key,
  valeur jsonb not null
);
alter table public.studio_config enable row level security;
-- Pas de politique : lue par les fonctions security definer et la clé de service.

insert into public.studio_config (cle, valeur) values
  ('ouverture', '"testeurs"'),
  ('testeurs', '[]'),
  ('stripe_mode', '"test"'),
  ('quota_gratuit', '1'),
  ('quota_abonne', '5')
on conflict (cle) do nothing;

create or replace function public.studio_config_valeur(p_cle text)
returns jsonb
language sql
stable
security definer
set search_path to 'public'
as $$
  select valeur from public.studio_config where cle = p_cle;
$$;
revoke execute on function public.studio_config_valeur(text) from public, anon, authenticated;

-- Seul point d'entrée « qui a le Studio » (aussi utilisé par la bibliothèque de scripts).
create or replace function public.studio_ouvert(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select public.is_ceo(p_user_id)
      or (
        exists (select 1 from public.user_passes
                 where user_id = p_user_id and revoked_at is null and pass_type in ('al_baraka', 'liberty'))
        and not public.acces_formations_coupe(p_user_id)
        and (
          public.studio_config_valeur('ouverture') = '"eleves"'
          or public.studio_config_valeur('testeurs') ? p_user_id::text
        )
      );
$$;

create table if not exists public.studio_abonnements (
  user_id uuid primary key references auth.users(id) on delete cascade,
  mode text not null check (mode in ('test', 'live')),
  stripe_customer_id text,
  stripe_subscription_id text,
  statut text,
  fin_periode timestamptz,
  resiliation_prevue boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table public.studio_abonnements enable row level security;
drop policy if exists studio_abonnements_select on public.studio_abonnements;
create policy studio_abonnements_select on public.studio_abonnements
  for select to authenticated
  using (user_id = auth.uid() or public.is_ceo(auth.uid()));
-- Écritures : edge function studio-abonnement (clé de service) uniquement.

create or replace function public.studio_est_abonne(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select exists (
    select 1 from public.studio_abonnements a
     where a.user_id = p_user_id
       and a.mode = (public.studio_config_valeur('stripe_mode') #>> '{}')
       and a.statut in ('active', 'trialing')
       and a.fin_periode > now());
$$;

alter table public.studio_montages add column if not exists compte_le timestamptz;

-- Quota du jour (heure de Paris) : vidéos comptées aujourd'hui / limite.
create or replace function public.studio_quota(p_user_id uuid)
returns jsonb
language sql
stable
security definer
set search_path to 'public'
as $$
  with lim as (
    select case
             when public.is_ceo(p_user_id) then null
             when public.studio_est_abonne(p_user_id) then (public.studio_config_valeur('quota_abonne') #>> '{}')::int
             else (public.studio_config_valeur('quota_gratuit') #>> '{}')::int
           end as limite
  ), util as (
    select count(*)::int as n from public.studio_montages
     where user_id = p_user_id and compte_le is not null
       and (compte_le at time zone 'Europe/Paris')::date = (now() at time zone 'Europe/Paris')::date
  )
  select jsonb_build_object(
    'ouvert', public.studio_ouvert(p_user_id),
    'abonne', public.studio_est_abonne(p_user_id),
    'limite', lim.limite,
    'utilisees', util.n,
    'restantes', case when lim.limite is null then null else greatest(lim.limite - util.n, 0) end)
  from lim, util;
$$;

create or replace function public.studio_mon_quota()
returns jsonb
language sql
stable
security definer
set search_path to 'public'
as $$
  select public.studio_quota(auth.uid());
$$;

-- Compte une nouvelle vidéo au moment où elle part en préparation (une seule fois).
create or replace function public.studio_compter_video(p_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  q jsonb;
begin
  if exists (select 1 from studio_montages where id = p_id and compte_le is not null) then
    return;
  end if;
  if not public.studio_ouvert(auth.uid()) then
    raise exception 'Le Studio n''est pas ouvert pour ton compte.';
  end if;
  q := public.studio_quota(auth.uid());
  if (q->>'restantes') is not null and (q->>'restantes')::int <= 0 then
    raise exception '%', case when (q->>'abonne')::boolean
      then 'Tu as utilisé tes ' || (q->>'limite') || ' vidéos du jour. Reviens demain !'
      else 'Tu as utilisé ta vidéo gratuite du jour. Passe à l''abonnement Studio pour en faire 5 par jour.' end
      using errcode = 'P0001';
  end if;
  update studio_montages set compte_le = now() where id = p_id and user_id = auth.uid();
end $$;
revoke execute on function public.studio_compter_video(uuid) from public, anon, authenticated;

create or replace function public.studio_preparer(p_id uuid)
returns text
language plpgsql
security definer
set search_path to 'public', 'extensions'
as $function$
declare
  v_jeton text := encode(gen_random_bytes(24), 'hex');
begin
  if not exists (select 1 from studio_montages where id = p_id and user_id = auth.uid()
                   and statut in ('import', 'erreur') and source_path is not null) then
    raise exception 'Montage introuvable ou déjà en préparation';
  end if;
  perform public.studio_compter_video(p_id);
  update studio_montages
     set statut = 'preparation', etape = 'reception', erreur = null,
         jeton_hash = encode(digest(v_jeton, 'sha256'), 'hex'), updated_at = now()
   where id = p_id and user_id = auth.uid() and statut in ('import', 'erreur')
     and source_path is not null;
  return v_jeton;
end $function$;

create or replace function public.studio_lancer(p_id uuid, p_reglages jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'extensions'
as $function$
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

  -- Montage d'avant le quota, jamais compté : il compte à son premier lancement.
  perform public.studio_compter_video(p_id);

  v_jeton := encode(gen_random_bytes(24), 'hex');
  update studio_montages
     set reglages = p_reglages, lance = true, statut = 'en_cours', etape = 'file', erreur = null,
         version = version + 1, jeton_hash = encode(digest(v_jeton, 'sha256'), 'hex'), updated_at = now()
   where id = p_id;
  return jsonb_build_object(
    'action', 'demarrer', 'jeton', v_jeton, 'version', m.version + 1,
    'mode', case when m.travail_pret and m.audio_prepare = v_audio then 'rendu' else 'complet' end);
end $function$;

-- Les montages existants (essais du CEO) ne sont pas recomptés.
update public.studio_montages set compte_le = created_at where compte_le is null and statut <> 'import';

drop policy if exists studio_montages_insert on public.studio_montages;
create policy studio_montages_insert on public.studio_montages
  for insert to authenticated
  with check (user_id = auth.uid() and statut = 'import' and public.studio_ouvert(auth.uid()));
