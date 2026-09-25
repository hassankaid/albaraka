-- ─────────────────────────────────────────────────────────────────────────
-- La preuve du consentement à la commande.
--
-- Cahier des charges Ethicarena §4.4. On gardait les cases cochées dans
-- `client_contracts`, mais NI l'adresse IP, NI le navigateur, NI la version
-- des CGV acceptée — et rien du tout sur les ventes passées par lien de
-- paiement, qui ne créent pas de contrat.
--
-- Sans cette trace, la case à cocher n'est pas opposable : un client qui
-- conteste soutient qu'il n'a jamais accepté les CGV ni renoncé à son droit
-- de rétractation, et on n'a rien à produire.
--
-- La ligne est écrite à la CRÉATION DE L'INTENTION DE PAIEMENT, avant que la
-- vente n'existe : c'est le seul instant où l'on dispose à la fois du
-- consentement, de l'IP et du navigateur.
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.preuves_consentement (
  id uuid primary key default gen_random_uuid(),
  stripe_intent_id text not null unique,
  sale_id uuid references public.sales(id) on delete set null,
  email text not null,
  nom_complet text,
  produit text,
  montant_total numeric,
  mensualites integer,
  version_cgv text not null,
  engagements jsonb not null,
  adresse_ip text,
  navigateur text,
  cree_le timestamptz not null default now()
);

comment on table public.preuves_consentement is
  'Preuve opposable de l''acceptation des CGV et de la renonciation au droit de retractation (cahier des charges Ethicarena 4.4). Ne jamais purger avant la fin des durees de conservation.';

create index if not exists preuves_consentement_sale_idx on public.preuves_consentement(sale_id);
create index if not exists preuves_consentement_email_idx on public.preuves_consentement(lower(email));

alter table public.preuves_consentement enable row level security;

drop policy if exists "preuves lisibles par le ceo" on public.preuves_consentement;
create policy "preuves lisibles par le ceo" on public.preuves_consentement
  for select using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'ceo')
  );
