-- ─────────────────────────────────────────────────────────────────────────
-- Journal des consentements à la prospection commerciale.
--
-- Cahier des charges Ethicarena §5. Une case cochée dans un navigateur ne
-- prouve rien : c'est ici qu'on garde QUI a consenti, QUAND, DEPUIS QUEL
-- formulaire et à partir de quelle adresse. Sans cette trace, une plainte
-- CNIL se solde par « nous n'avons aucun élément à produire ».
--
-- Journal en ajout seul, jamais mis à jour : un retrait de consentement
-- s'écrit comme une NOUVELLE ligne avec consenti = false. L'historique doit
-- rester lisible — savoir qu'une personne a consenti puis s'est rétractée
-- vaut plus que de savoir seulement son état actuel.
--
-- Pas de clé étrangère vers leads ni contacts : le consentement est donné
-- par une adresse e-mail, avant même qu'on sache si une fiche existe, et il
-- doit survivre aux fusions de doublons.
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.consentements_marketing (
  id            uuid primary key default gen_random_uuid(),
  email         text not null,
  consenti      boolean not null,
  -- D'où vient la case : tunnel_optin | rdv | quiz | ...
  origine       text not null,
  -- L'URL exacte affichée au moment du clic, pour retrouver le formulaire.
  page          text,
  -- Le texte exact soumis à la personne. Il évoluera ; la preuve doit dire
  -- à quoi elle a dit oui, pas à quoi elle dirait oui aujourd'hui.
  libelle       text,
  adresse_ip    text,
  navigateur    text,
  created_at    timestamptz not null default now()
);

create index if not exists consentements_marketing_email_idx
  on public.consentements_marketing (lower(email), created_at desc);

alter table public.consentements_marketing enable row level security;

-- Personne ne lit ni n'écrit avec une clé anon : seules les edge functions
-- (service_role, qui contourne RLS) écrivent, et le CEO consulte.
drop policy if exists "ceo lit les consentements" on public.consentements_marketing;
create policy "ceo lit les consentements"
  on public.consentements_marketing for select
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'ceo')
  );

comment on table public.consentements_marketing is
  'Preuve du consentement à la prospection (RGPD art. 7). Ajout seul, jamais modifié.';

-- Dernier état connu par adresse, pour exclure des envois commerciaux.
create or replace view public.consentement_marketing_actuel as
select distinct on (lower(email))
  lower(email) as email,
  consenti,
  origine,
  created_at
from public.consentements_marketing
order by lower(email), created_at desc;
