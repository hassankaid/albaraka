-- SÉCURITÉ (11/11/2026) : 11 tables SANS règles d'accès (RLS désactivée),
-- lisibles par N'IMPORTE QUI avec la clé publique du site (sans connexion) :
--   contact_identifiers (21 069 e-mails/téléphones), sauvegardes
--   contacts_phone_backup_20260418, leads_phone_backup_20260418,
--   commissions_backup_20260701, quiz_questions_backup_20260417,
--   rapprochement Stripe (recon_stripe_customers, recon_stripe_events,
--   recon_stripe_subscriptions, recon_run_log, recon_sale_extra_customer),
--   rapports_delivrabilite.
--
-- Toutes passent sous RLS. Seule contact_identifiers est utilisée par un écran
-- (création de contact dans l'assistant admin) : l'équipe (CEO,
-- collaborateurs) garde l'accès complet. Les autres ne servent qu'au serveur
-- (fonctions avec la clé service, fonctions SECURITY DEFINER), qui contourne
-- la RLS : rien ne change pour elles.

alter table public.contact_identifiers enable row level security;
create policy contact_identifiers_equipe on public.contact_identifiers
  for all to authenticated
  using ((select public.get_user_role()) in ('ceo', 'collaborateur'))
  with check ((select public.get_user_role()) in ('ceo', 'collaborateur'));
revoke all on public.contact_identifiers from anon;

do $t$
declare t text;
begin
  foreach t in array array[
    'contacts_phone_backup_20260418', 'leads_phone_backup_20260418',
    'commissions_backup_20260701', 'quiz_questions_backup_20260417',
    'recon_stripe_customers', 'recon_stripe_events', 'recon_stripe_subscriptions',
    'recon_run_log', 'recon_sale_extra_customer', 'rapports_delivrabilite'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
  end loop;
end $t$;
