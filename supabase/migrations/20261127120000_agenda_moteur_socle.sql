-- ═══════════════════════════════════════════════════════════════════════════
-- Moteur de prise de rendez-vous interne (remplace Calendly) — socle (27/11/2026)
--
-- Phase 1 = équivalent de Calendly : agendas (types d'événement), hôtes avec
-- priorité, modèles d'horaires + exceptions, connexion de l'agenda personnel
-- de chaque hôte (Google ou Microsoft, OAuth par personne : pas de Workspace),
-- rendez-vous avec interdiction des chevauchements portée par la base.
--
-- Principes :
--   * Les écritures « métier » (réserver, décaler, annuler, connecter un agenda)
--     passent par des edge functions avec la clé service : les règles
--     (créneau libre, préavis, horizon, répartition) y sont recalculées.
--   * Les jetons OAuth ne sont JAMAIS dans une table : ils vivent dans
--     Supabase Vault, la table ne garde que l'identifiant du secret.
--   * Les rendez-vous continueront d'alimenter `calls` (lot 6) : les
--     dashboards ne voient pas la différence avec Calendly.
--   * Les réponses aux e-mails envoyés au prospect vont à l'hôte concerné
--     (`agenda_hotes.email_reponse`, en Reply-To), comme chez Qamar.
--
-- Appliqué en base le 27/11/2026 (testé d'abord dans une transaction annulée).
-- ═══════════════════════════════════════════════════════════════════════════

create extension if not exists btree_gist with schema extensions;

create or replace function public.agenda_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- Raccourci de lecture des droits (même logique que les policies de `calls`).
create or replace function public.agenda_est_equipe()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select get_user_role()) in ('ceo', 'collaborateur'), false)
$$;

create or replace function public.agenda_est_ceo()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select get_user_role()) = 'ceo', false)
$$;

-- ───────────────────────────────────────────────────────────────────────────
-- 1. Hôtes (closers, coachs) : réglages propres à la personne
-- ───────────────────────────────────────────────────────────────────────────
create table public.agenda_hotes (
  hote_id        uuid primary key references public.profiles(id) on delete cascade,
  nom_affiche    text not null,
  email_reponse  text not null check (email_reponse ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  fuseau         text not null default 'Europe/Paris',
  max_par_jour   int check (max_par_jour is null or max_par_jour > 0),
  actif          boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
comment on table public.agenda_hotes is
  'Personnes qui reçoivent des rendez-vous. email_reponse = adresse de Reply-To des e-mails envoyés au prospect.';

-- ───────────────────────────────────────────────────────────────────────────
-- 2. Agendas (équivalent des « types d'événement » Calendly)
-- ───────────────────────────────────────────────────────────────────────────
create table public.agenda_evenements (
  id                     uuid primary key default gen_random_uuid(),
  cle                    text not null unique check (cle ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  nom                    text not null,
  event_type             text not null,            -- valeur écrite dans calls.event_type
  description            text,
  duree_min              int  not null check (duree_min between 5 and 480),
  pas_min                int  not null check (pas_min between 5 and 120),
  preavis_min            int  not null default 0 check (preavis_min >= 0),
  horizon_min            int  not null check (horizon_min > 0),   -- fenêtre glissante
  pause_avant_min        int  not null default 0 check (pause_avant_min >= 0),
  pause_apres_min        int  not null default 0 check (pause_apres_min >= 0),
  repartition            text not null default 'disponibilite'
                           check (repartition in ('disponibilite', 'egalite')),
  lieu_type              text not null default 'telephone'
                           check (lieu_type in ('telephone', 'zoom', 'meet', 'autre')),
  lieu_detail            text,
  question_telephone     text not null default 'Numéro de téléphone',
  questions              jsonb not null default '[]'::jsonb check (jsonb_typeof(questions) = 'array'),
  redirection_url        text,
  acces                  text not null default 'public' check (acces in ('public', 'jeton')),
  annulation_autorisee   boolean not null default true,
  titre_agenda           text,                     -- titre de l'événement dans l'agenda de l'hôte
  calendly_event_type    uuid,                     -- correspondance pendant la transition
  actif                  boolean not null default true,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);
comment on table public.agenda_evenements is
  'Agendas de réservation (remplacent les types d''événement Calendly). acces=jeton : réservable seulement avec un jeton (coaching payant).';

-- ───────────────────────────────────────────────────────────────────────────
-- 3. Modèles d'horaires (une personne peut en avoir plusieurs, un par défaut)
-- ───────────────────────────────────────────────────────────────────────────
create table public.agenda_horaires (
  id          uuid primary key default gen_random_uuid(),
  hote_id     uuid not null references public.agenda_hotes(hote_id) on delete cascade,
  nom         text not null,
  fuseau      text not null default 'Europe/Paris',
  par_defaut  boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (hote_id, nom)
);
create unique index agenda_horaires_un_defaut on public.agenda_horaires (hote_id) where par_defaut;

create table public.agenda_plages (
  id          uuid primary key default gen_random_uuid(),
  horaire_id  uuid not null references public.agenda_horaires(id) on delete cascade,
  jour        smallint not null check (jour between 1 and 7),   -- 1 = lundi … 7 = dimanche
  debut       time not null,
  fin         time not null,
  check (fin > debut)
);
create index agenda_plages_horaire on public.agenda_plages (horaire_id, jour);

-- Exceptions par date : « indisponible » (journée fermée) ou « horaires »
-- (les plages de la date remplacent celles de la semaine, une ligne par plage).
create table public.agenda_exceptions (
  id          uuid primary key default gen_random_uuid(),
  horaire_id  uuid not null references public.agenda_horaires(id) on delete cascade,
  date        date not null,
  type        text not null check (type in ('indisponible', 'horaires')),
  debut       time,
  fin         time,
  check ((type = 'indisponible' and debut is null and fin is null)
      or (type = 'horaires' and debut is not null and fin is not null and fin > debut))
);
create index agenda_exceptions_horaire on public.agenda_exceptions (horaire_id, date);

-- ───────────────────────────────────────────────────────────────────────────
-- 4. Hôtes rattachés à un agenda (round robin)
-- ───────────────────────────────────────────────────────────────────────────
create table public.agenda_evenement_hotes (
  evenement_id  uuid not null references public.agenda_evenements(id) on delete cascade,
  hote_id       uuid not null references public.agenda_hotes(hote_id) on delete cascade,
  priorite      smallint not null default 2 check (priorite between 0 and 4),  -- 4 = la plus haute
  horaire_id    uuid references public.agenda_horaires(id) on delete set null,  -- null = modèle par défaut
  actif         boolean not null default true,
  created_at    timestamptz not null default now(),
  primary key (evenement_id, hote_id)
);

-- Le modèle d'horaires choisi doit appartenir à l'hôte.
create or replace function public.agenda_evh_verifier_horaire()
returns trigger language plpgsql as $$
begin
  if new.horaire_id is not null and not exists (
    select 1 from public.agenda_horaires h where h.id = new.horaire_id and h.hote_id = new.hote_id
  ) then
    raise exception 'Le modèle d''horaires % n''appartient pas à cet hôte', new.horaire_id;
  end if;
  return new;
end $$;
create trigger agenda_evh_verifier_horaire
  before insert or update on public.agenda_evenement_hotes
  for each row execute function public.agenda_evh_verifier_horaire();

-- ───────────────────────────────────────────────────────────────────────────
-- 5. Connexion de l'agenda personnel (Google / Microsoft, OAuth par personne)
-- ───────────────────────────────────────────────────────────────────────────
create table public.agenda_connexions (
  id                 uuid primary key default gen_random_uuid(),
  hote_id            uuid not null references public.agenda_hotes(hote_id) on delete cascade,
  fournisseur        text not null check (fournisseur in ('google', 'microsoft')),
  compte_email       text not null,
  vault_secret_id    uuid,                 -- jeton de rafraîchissement, dans Supabase Vault
  portees            text[] not null default '{}',
  agenda_ecriture    text not null default 'primary',   -- où l'on écrit les rendez-vous
  statut             text not null default 'ok' check (statut in ('ok', 'erreur', 'deconnectee')),
  derniere_erreur    text,
  erreur_depuis      timestamptz,
  derniere_lecture   timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (hote_id, fournisseur, compte_email)
);
comment on column public.agenda_connexions.vault_secret_id is
  'Identifiant du secret Vault contenant le jeton de rafraîchissement OAuth. Lisible uniquement par la clé service (agenda_connexion_jeton).';

-- Calendriers du compte connecté ; « bloque » = ses événements occupent l'hôte.
create table public.agenda_connexion_calendriers (
  connexion_id  uuid not null references public.agenda_connexions(id) on delete cascade,
  calendrier_id text not null,
  nom           text not null,
  bloque        boolean not null default true,
  primary key (connexion_id, calendrier_id)
);

-- ───────────────────────────────────────────────────────────────────────────
-- 6. Rendez-vous
-- ───────────────────────────────────────────────────────────────────────────
create table public.agenda_rdv (
  id                uuid primary key default gen_random_uuid(),
  evenement_id      uuid not null references public.agenda_evenements(id),
  hote_id           uuid not null references public.agenda_hotes(hote_id),
  debut             timestamptz not null,
  fin               timestamptz not null,
  plage             tstzrange generated always as (tstzrange(debut, fin, '[)')) stored,
  statut            text not null default 'confirme'
                      check (statut in ('confirme', 'annule', 'decale', 'tenu', 'no_show')),
  origine           text not null default 'prospect' check (origine in ('prospect', 'equipe')),
  cree_par          uuid references public.profiles(id),
  -- prospect
  prenom            text not null,
  nom               text,
  email             text not null,
  telephone         text,
  fuseau_prospect   text,
  reponses          jsonb not null default '[]'::jsonb,
  suivi             jsonb not null default '{}'::jsonb,   -- utm_*, src, page, ids pub
  -- liens CRM
  contact_id        uuid,
  lead_id           uuid,
  call_id           uuid references public.calls(id) on delete set null,
  -- gestion par le prospect (lien « annuler / reprogrammer »)
  jeton_gestion     text not null unique default encode(extensions.gen_random_bytes(24), 'hex'),
  decale_vers       uuid references public.agenda_rdv(id),
  annule_at         timestamptz,
  annule_par        text check (annule_par in ('prospect', 'hote', 'equipe', 'systeme')),
  motif_annulation  text,
  -- agenda externe de l'hôte
  connexion_id      uuid references public.agenda_connexions(id) on delete set null,
  externe_event_id  text,
  -- accès par jeton (coaching payant)
  jeton_reservation text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  check (fin > debut),
  -- Un hôte ne peut pas avoir deux rendez-vous confirmés qui se chevauchent.
  constraint agenda_rdv_sans_chevauchement
    exclude using gist (hote_id with =, plage with &&) where (statut = 'confirme')
);
create index agenda_rdv_hote_debut on public.agenda_rdv (hote_id, debut) where statut = 'confirme';
create index agenda_rdv_evenement_debut on public.agenda_rdv (evenement_id, debut);
create index agenda_rdv_email on public.agenda_rdv (lower(email));
create index agenda_rdv_call on public.agenda_rdv (call_id);
create unique index agenda_rdv_jeton_reservation on public.agenda_rdv (jeton_reservation)
  where jeton_reservation is not null and statut <> 'annule';

-- Journal (e-mails envoyés, écritures dans l'agenda externe, erreurs…)
create table public.agenda_journal (
  id          bigint generated always as identity primary key,
  rdv_id      uuid references public.agenda_rdv(id) on delete cascade,
  connexion_id uuid references public.agenda_connexions(id) on delete cascade,
  type        text not null,
  details     jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
create index agenda_journal_rdv on public.agenda_journal (rdv_id, created_at);

-- updated_at
create trigger agenda_hotes_touch before update on public.agenda_hotes
  for each row execute function public.agenda_touch_updated_at();
create trigger agenda_evenements_touch before update on public.agenda_evenements
  for each row execute function public.agenda_touch_updated_at();
create trigger agenda_horaires_touch before update on public.agenda_horaires
  for each row execute function public.agenda_touch_updated_at();
create trigger agenda_connexions_touch before update on public.agenda_connexions
  for each row execute function public.agenda_touch_updated_at();
create trigger agenda_rdv_touch before update on public.agenda_rdv
  for each row execute function public.agenda_touch_updated_at();

-- ───────────────────────────────────────────────────────────────────────────
-- 7. Jetons OAuth dans Vault (clé service uniquement)
-- ───────────────────────────────────────────────────────────────────────────
create or replace function public.agenda_connexion_enregistrer_jeton(p_connexion_id uuid, p_jeton text)
returns void language plpgsql security definer set search_path = public, vault as $$
declare
  v_secret uuid;
begin
  select vault_secret_id into v_secret from public.agenda_connexions where id = p_connexion_id;
  if not found then
    raise exception 'Connexion % introuvable', p_connexion_id;
  end if;
  if v_secret is null then
    v_secret := vault.create_secret(p_jeton, 'agenda_connexion_' || p_connexion_id::text,
                                    'Jeton de rafraîchissement OAuth (moteur de rendez-vous)');
    update public.agenda_connexions set vault_secret_id = v_secret where id = p_connexion_id;
  else
    perform vault.update_secret(v_secret, p_jeton);
  end if;
end $$;

create or replace function public.agenda_connexion_jeton(p_connexion_id uuid)
returns text language sql stable security definer set search_path = public, vault as $$
  select s.decrypted_secret
  from public.agenda_connexions c
  join vault.decrypted_secrets s on s.id = c.vault_secret_id
  where c.id = p_connexion_id
$$;

-- Supprime le secret quand la connexion disparaît.
create or replace function public.agenda_connexion_supprimer_secret()
returns trigger language plpgsql security definer set search_path = public, vault as $$
begin
  if old.vault_secret_id is not null then
    delete from vault.secrets where id = old.vault_secret_id;
  end if;
  return old;
end $$;
create trigger agenda_connexion_supprimer_secret
  after delete on public.agenda_connexions
  for each row execute function public.agenda_connexion_supprimer_secret();

revoke all on function public.agenda_connexion_enregistrer_jeton(uuid, text) from public, anon, authenticated;
revoke all on function public.agenda_connexion_jeton(uuid) from public, anon, authenticated;
grant execute on function public.agenda_connexion_enregistrer_jeton(uuid, text) to service_role;
grant execute on function public.agenda_connexion_jeton(uuid) to service_role;

-- ───────────────────────────────────────────────────────────────────────────
-- 8. RLS : lecture équipe, écriture des réglages par le CEO ou la personne,
--    rendez-vous et connexions modifiés uniquement par les edge functions.
-- ───────────────────────────────────────────────────────────────────────────
alter table public.agenda_hotes                enable row level security;
alter table public.agenda_evenements           enable row level security;
alter table public.agenda_horaires             enable row level security;
alter table public.agenda_plages               enable row level security;
alter table public.agenda_exceptions           enable row level security;
alter table public.agenda_evenement_hotes      enable row level security;
alter table public.agenda_connexions           enable row level security;
alter table public.agenda_connexion_calendriers enable row level security;
alter table public.agenda_rdv                  enable row level security;
alter table public.agenda_journal              enable row level security;

-- Hôtes
create policy agenda_hotes_lecture on public.agenda_hotes for select to authenticated
  using ((select public.agenda_est_equipe()));
create policy agenda_hotes_ceo on public.agenda_hotes for all to authenticated
  using ((select public.agenda_est_ceo())) with check ((select public.agenda_est_ceo()));
create policy agenda_hotes_soi on public.agenda_hotes for update to authenticated
  using (hote_id = (select auth.uid())) with check (hote_id = (select auth.uid()));

-- Agendas et rattachements : lecture équipe, écriture CEO
create policy agenda_evenements_lecture on public.agenda_evenements for select to authenticated
  using ((select public.agenda_est_equipe()));
create policy agenda_evenements_ceo on public.agenda_evenements for all to authenticated
  using ((select public.agenda_est_ceo())) with check ((select public.agenda_est_ceo()));

create policy agenda_evh_lecture on public.agenda_evenement_hotes for select to authenticated
  using ((select public.agenda_est_equipe()));
create policy agenda_evh_ceo on public.agenda_evenement_hotes for all to authenticated
  using ((select public.agenda_est_ceo())) with check ((select public.agenda_est_ceo()));

-- Horaires : lecture équipe, écriture par la personne ou le CEO
create policy agenda_horaires_lecture on public.agenda_horaires for select to authenticated
  using ((select public.agenda_est_equipe()));
create policy agenda_horaires_ecriture on public.agenda_horaires for all to authenticated
  using (hote_id = (select auth.uid()) or (select public.agenda_est_ceo()))
  with check (hote_id = (select auth.uid()) or (select public.agenda_est_ceo()));

create policy agenda_plages_lecture on public.agenda_plages for select to authenticated
  using ((select public.agenda_est_equipe()));
create policy agenda_plages_ecriture on public.agenda_plages for all to authenticated
  using (exists (select 1 from public.agenda_horaires h where h.id = horaire_id
                 and (h.hote_id = (select auth.uid()) or (select public.agenda_est_ceo()))))
  with check (exists (select 1 from public.agenda_horaires h where h.id = horaire_id
                 and (h.hote_id = (select auth.uid()) or (select public.agenda_est_ceo()))));

create policy agenda_exceptions_lecture on public.agenda_exceptions for select to authenticated
  using ((select public.agenda_est_equipe()));
create policy agenda_exceptions_ecriture on public.agenda_exceptions for all to authenticated
  using (exists (select 1 from public.agenda_horaires h where h.id = horaire_id
                 and (h.hote_id = (select auth.uid()) or (select public.agenda_est_ceo()))))
  with check (exists (select 1 from public.agenda_horaires h where h.id = horaire_id
                 and (h.hote_id = (select auth.uid()) or (select public.agenda_est_ceo()))));

-- Connexions : chacun voit les siennes, le CEO voit tout ; écriture par edge function.
create policy agenda_connexions_lecture on public.agenda_connexions for select to authenticated
  using (hote_id = (select auth.uid()) or (select public.agenda_est_ceo()));
create policy agenda_conn_cal_lecture on public.agenda_connexion_calendriers for select to authenticated
  using (exists (select 1 from public.agenda_connexions c where c.id = connexion_id
                 and (c.hote_id = (select auth.uid()) or (select public.agenda_est_ceo()))));
create policy agenda_conn_cal_bloque on public.agenda_connexion_calendriers for update to authenticated
  using (exists (select 1 from public.agenda_connexions c where c.id = connexion_id
                 and (c.hote_id = (select auth.uid()) or (select public.agenda_est_ceo()))))
  with check (exists (select 1 from public.agenda_connexions c where c.id = connexion_id
                 and (c.hote_id = (select auth.uid()) or (select public.agenda_est_ceo()))));

-- Rendez-vous : lecture équipe (comme calls) ; écriture par edge function.
create policy agenda_rdv_lecture on public.agenda_rdv for select to authenticated
  using ((select public.agenda_est_equipe()));

-- Journal : CEO
create policy agenda_journal_lecture on public.agenda_journal for select to authenticated
  using ((select public.agenda_est_ceo()));

-- L'identifiant du secret Vault n'est pas exposé au client : lecture colonne
-- par colonne (un `revoke` de colonne ne suffit pas si la table entière est
-- accordée). Côté front, lister les colonnes au lieu de `select('*')`.
revoke select on public.agenda_connexions from anon, authenticated;
grant select (id, hote_id, fournisseur, compte_email, portees, agenda_ecriture, statut,
              derniere_erreur, erreur_depuis, derniere_lecture, created_at, updated_at)
  on public.agenda_connexions to authenticated;
