-- Connecteur « Data Al Baraka » — étape 3 : accès sur invitation et connexion OAuth (25/11/2026).
--
-- Indépendant du hub (décision de Hassan le 25/11) : chaque personne invitée reçoit un code
-- d'accès personnel. À la première connexion dans Claude ou Claude Code, une page Al Baraka
-- demande ce code, puis Claude reçoit des jetons OAuth (1 h, renouvelés 30 jours).
-- Désactiver l'accès (actif = false) coupe immédiatement tous ses jetons.
-- On ne stocke que des empreintes SHA-256 des codes et des jetons, jamais les valeurs.
-- Tables lues et écrites par l'edge function connecteur-equipe (clé de service) uniquement :
-- ni l'appli (anon, authenticated) ni le rôle connecteur_lecture n'y ont accès.
--
-- Appliqué en base le 25/11/2026.

create table if not exists public.connecteur_acces (
  id                   uuid primary key default gen_random_uuid(),
  nom                  text not null,
  code_hash            text not null unique,
  actif                boolean not null default true,
  note                 text,
  cree_le              timestamptz not null default now(),
  revoque_le           timestamptz,
  derniere_utilisation timestamptz
);
comment on table public.connecteur_acces is
  'Personnes invitées sur le connecteur « Data Al Baraka » : une ligne = un code d''accès personnel (empreinte SHA-256 seulement). actif = false coupe l''accès immédiatement.';

create table if not exists public.connecteur_oauth_clients (
  client_id     text primary key,
  client_name   text,
  redirect_uris text[] not null,
  cree_le       timestamptz not null default now()
);
comment on table public.connecteur_oauth_clients is
  'Applications enregistrées auprès du connecteur (enregistrement dynamique OAuth : Claude, Claude Code…).';

create table if not exists public.connecteur_oauth_codes (
  code_hash      text primary key,
  client_id      text not null references public.connecteur_oauth_clients(client_id) on delete cascade,
  acces_id       uuid not null references public.connecteur_acces(id) on delete cascade,
  redirect_uri   text not null,
  code_challenge text not null,
  expire_le      timestamptz not null,
  utilise_le     timestamptz
);
comment on table public.connecteur_oauth_codes is
  'Codes d''autorisation OAuth (10 min, usage unique, PKCE S256), empreinte SHA-256 seulement.';

create table if not exists public.connecteur_oauth_jetons (
  jeton_hash text primary key,
  type       text not null check (type in ('access', 'refresh')),
  acces_id   uuid not null references public.connecteur_acces(id) on delete cascade,
  client_id  text not null references public.connecteur_oauth_clients(client_id) on delete cascade,
  expire_le  timestamptz not null,
  revoque_le timestamptz,
  cree_le    timestamptz not null default now()
);
create index if not exists connecteur_oauth_jetons_acces_idx on public.connecteur_oauth_jetons(acces_id);
comment on table public.connecteur_oauth_jetons is
  'Jetons OAuth du connecteur (access 1 h, refresh 30 jours, renouvelé à chaque usage), empreinte SHA-256 seulement.';

create table if not exists public.connecteur_journal (
  id       bigint generated always as identity primary key,
  le       timestamptz not null default now(),
  acces_id uuid references public.connecteur_acces(id) on delete set null,
  outil    text not null,
  requete  text,
  lignes   integer,
  duree_ms integer,
  erreur   text
);
create index if not exists connecteur_journal_le_idx on public.connecteur_journal(le desc);
comment on table public.connecteur_journal is
  'Journal du connecteur : chaque appel d''outil (qui, quand, quelle requête, combien de lignes, erreur) et chaque connexion refusée.';

do $$
declare t text;
begin
  foreach t in array array['connecteur_acces','connecteur_oauth_clients','connecteur_oauth_codes',
                           'connecteur_oauth_jetons','connecteur_journal'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated, connecteur_lecture', t);
  end loop;
end $$;
revoke all on sequence public.connecteur_journal_id_seq from anon, authenticated, connecteur_lecture;

-- Les tables connecteur_* restent invisibles pour le rôle de lecture, même après la
-- réapplication nocturne des droits.
create or replace function public.connecteur_appliquer_droits()
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  r record;
  cols text;
  n integer := 0;
begin
  execute 'grant usage on schema public to connecteur_lecture';
  execute 'grant select on all tables in schema public to connecteur_lecture';
  for r in
    select c.relname from pg_class c join pg_namespace ns on ns.oid = c.relnamespace
    where ns.nspname = 'public' and c.relname like 'connecteur\_%' and c.relkind in ('r','v','m','p')
  loop
    execute format('revoke all on public.%I from connecteur_lecture', r.relname);
  end loop;

  for r in
    select distinct c.oid, c.relname
    from public.connecteur_colonnes_masquees m
    join pg_class c on c.relname = m.table_name
    join pg_namespace ns on ns.oid = c.relnamespace and ns.nspname = 'public'
  loop
    execute format('revoke select on public.%I from connecteur_lecture', r.relname);
    select string_agg(format('%I', a.attname), ', ' order by a.attnum) into cols
    from pg_attribute a
    where a.attrelid = r.oid and a.attnum > 0 and not a.attisdropped
      and not exists (select 1 from public.connecteur_colonnes_masquees m
                      where m.table_name = r.relname and m.column_name = a.attname);
    if cols is not null then
      execute format('grant select (%s) on public.%I to connecteur_lecture', cols, r.relname);
    end if;
    n := n + 1;
  end loop;

  -- ménage : codes et jetons expirés
  delete from public.connecteur_oauth_codes where expire_le < now() - interval '1 day';
  delete from public.connecteur_oauth_jetons where expire_le < now() - interval '7 days';
  return n;
end;
$$;
revoke all on function public.connecteur_appliquer_droits() from public, anon, authenticated;

select public.connecteur_appliquer_droits();
