-- ═══════════════════════════════════════════════════════════════════════
-- Un contact ne peut plus avoir deux fiches identiques le meme jour.
--
-- POURQUOI EN BASE, ET PAS DANS LES FONCTIONS. La protection existait deja :
-- `webhook-systeme-io` refusait un second lead sur le meme couple
-- (contact, source) dans une fenetre de 24 h, et son commentaire expliquait
-- meme pourquoi la fenetre etait passee de 10 secondes a 24 heures. La
-- reecriture vers `tunnel-lead-submit` l'a perdue sans que rien ne le signale.
-- 368 fiches en trop se sont accumulees depuis, dont 136 groupes assignes a des
-- setters DIFFERENTS : le meme prospect requalifie deux fois, par deux
-- personnes. Sept chemins de code creent des leads ; reposer sur la discipline
-- de chacun, c'est reperdre la regle a la prochaine reecriture.
--
-- LA FENETRE EST LE JOUR CALENDAIRE, pas 24 h glissantes : un index ne peut pas
-- referencer l'heure courante. C'est un peu plus permissif — deux envois a
-- 23h59 et 00h01 passeraient — mais les doublons observes sont a quelques
-- secondes d'ecart. Une garantie du moteur vaut mieux qu'une regle exacte que
-- personne n'applique.
--
-- L'INDEX NE PORTE QUE SUR L'AVENIR. Les 368 doublons historiques restent en
-- place : ils seront fusionnes separement, et rien ne sera supprime au passage.
-- Zero collision depuis le 09/09, l'index se construit donc sans rien casser.
--
-- COLONNE GENEREE plutot qu'index sur expression : PostgREST ne sait pas viser
-- une expression dans un `on_conflict`. Une colonne nommee laisse la porte
-- ouverte a un upsert cote client le jour ou on en aura besoin.
-- ═══════════════════════════════════════════════════════════════════════

alter table public.leads
  add column if not exists jour_creation date
  generated always as ((created_at at time zone 'UTC')::date) stored;

comment on column public.leads.jour_creation is
  'Jour UTC de creation, derive de created_at. Sert uniquement a porter la contrainte anti-doublon.';

create unique index if not exists leads_un_par_contact_source_et_jour
  on public.leads (contact_id, source, jour_creation)
  where created_at >= '2026-09-09';

comment on index public.leads_un_par_contact_source_et_jour is
  'Anti-doublon : une seule fiche par (contact, source) et par jour. Partiel a partir du 09/09/2026, l''historique anterieur restant a fusionner.';
