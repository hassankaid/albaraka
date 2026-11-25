-- Connecteur « Data Al Baraka » — étape 2 : le compte de lecture (25/11/2026).
--
-- Le connecteur se connecte avec le rôle `connecteur_lecture` :
--   * il LIT toutes les tables et vues de `public`, toutes les lignes (accès complet décidé par
--     Hassan le 25/11 : BYPASSRLS, les règles RLS de l'appli ne s'appliquent pas) ;
--   * il n'a AUCUN droit d'écriture (seulement SELECT), et ses transactions sont en lecture seule
--     par défaut (le connecteur ouvre en plus chaque requête en READ ONLY) : même une fonction
--     appelée dans une requête ne peut rien écrire ;
--   * les colonnes « clés » (jetons, secrets : les lire permettrait d'agir) lui sont invisibles,
--     grâce à des droits colonne par colonne (liste : public.connecteur_colonnes_masquees) ;
--     sur ces tables, « select * » est refusé : il faut nommer les colonnes ;
--   * aucun accès aux schémas auth, storage, vault, cron ; 10 s maximum par requête ;
--     10 connexions maximum.
-- Le mot de passe n'est PAS dans ce fichier (dépôt public) : il est posé à part, haché, et rangé
-- dans les secrets.
--
-- Les nouvelles tables sont lisibles automatiquement (droits par défaut). Les droits colonne par
-- colonne sont réappliqués chaque nuit (3 h 15) par connecteur_appliquer_droits() ; après l'ajout
-- d'une colonne masquée : select public.connecteur_appliquer_droits();
--
-- Appliqué en base le 25/11/2026.

-- 1. Colonnes masquées pour le connecteur
create table if not exists public.connecteur_colonnes_masquees (
  table_name  text not null,
  column_name text not null,
  raison      text not null,
  primary key (table_name, column_name)
);
alter table public.connecteur_colonnes_masquees enable row level security;
revoke all on public.connecteur_colonnes_masquees from anon, authenticated;
comment on table public.connecteur_colonnes_masquees is
  'Colonnes invisibles pour le connecteur « Data Al Baraka » (jetons, secrets : lire ces valeurs permettrait d''agir). Appliqué par connecteur_appliquer_droits().';

insert into public.connecteur_colonnes_masquees (table_name, column_name, raison) values
  ('app_settings',              'value',             'clés d''API (Twilio, systeme.io, secret de facturation)'),
  ('secrets_internes',          'cle',               'secret interne'),
  ('secrets_internes',          'valeur',            'secret interne'),
  ('sales',                     'rebill_token',      'permet de reprélever un client'),
  ('payment_links',             'token',             'ouvre un lien de paiement'),
  ('card_update_links',         'token',             'ouvre un lien de changement de carte'),
  ('email_unsubscribe_tokens',  'token',             'désinscrit quelqu''un des e-mails'),
  ('sms_campaign_recipients',   'unsubscribe_token', 'désinscrit quelqu''un des SMS'),
  ('questionnaire_invitations', 'token',             'répond au questionnaire à la place de quelqu''un'),
  ('conferences',               'token',             'lien public de rediffusion'),
  ('coaching_occurrences',      'replay_password',   'accès aux replays de coaching'),
  ('appels_analyses',           'jeton_hash',        'accès technique'),
  ('studio_banque_jobs',        'jeton_hash',        'accès technique Studio'),
  ('studio_montages',           'jeton_hash',        'accès technique Studio'),
  ('temoignages_vitrine',       'hash',              'clé de lecture des vidéos Vimeo privées')
on conflict (table_name, column_name) do update set raison = excluded.raison;

-- studio_config.cle est un nom de réglage, pas un secret (correction du catalogue)
comment on column public.studio_config.cle is 'Nom du réglage.';

-- 2. Le rôle (sans mot de passe ici)
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'connecteur_lecture') then
    create role connecteur_lecture login nosuperuser nocreatedb nocreaterole noinherit
      bypassrls noreplication connection limit 10;
  end if;
end $$;
alter role connecteur_lecture set default_transaction_read_only = on;
alter role connecteur_lecture set statement_timeout = '10s';
alter role connecteur_lecture set idle_in_transaction_session_timeout = '30s';
alter role connecteur_lecture set search_path = public;
comment on role connecteur_lecture is
  'Connecteur « Data Al Baraka » : lecture seule de public (sans les colonnes masquées). Créé le 25/11/2026.';

-- 3. Les droits
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
  execute 'revoke all on public.connecteur_colonnes_masquees from connecteur_lecture';

  for r in
    select distinct c.oid, c.relname
    from public.connecteur_colonnes_masquees m
    join pg_class c on c.relname = m.table_name
    join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
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
  return n;
end;
$$;
revoke all on function public.connecteur_appliquer_droits() from public, anon, authenticated;
comment on function public.connecteur_appliquer_droits() is
  'Donne au rôle connecteur_lecture la lecture de toutes les tables de public, sauf les colonnes de connecteur_colonnes_masquees. Cron nocturne 3 h 15.';

select public.connecteur_appliquer_droits();

-- Nouvelles tables et vues créées par postgres : lisibles automatiquement
alter default privileges for role postgres in schema public grant select on tables to connecteur_lecture;

-- 4. Réapplication chaque nuit (nouvelles colonnes des tables masquées)
select cron.unschedule(jobid) from cron.job where jobname = 'connecteur-droits';
select cron.schedule('connecteur-droits', '15 3 * * *', 'select public.connecteur_appliquer_droits()');
