-- SÉCURITÉ (11/11/2026), suite de 20261111050000 : d'autres vues contournaient
-- les règles d'accès et étaient lisibles par tout compte connecté (élèves
-- compris) :
--   - email_campaign_recipient_status (43 494 lignes : e-mail + prénom des
--     destinataires), email_campaign_duplicates, email_campaign_stats ;
--   - sms_campaign_recipient_status (5 046 lignes : téléphone + prénom),
--     sms_campaign_stats ;
--   - recon_sale_verdict (rapprochement des 273 ventes : e-mail, nom, montants).
--
-- Vues de campagnes : elles ne lisent QUE les tables de campagnes, réservées
-- au CEO et aux coachs. Passées en security_invoker, elles appliquent ces
-- mêmes règles : le CEO et les coachs voient exactement les mêmes chiffres,
-- les autres comptes ne voient plus rien.
-- recon_sale_verdict : utilisée par aucun écran ; retirée de l'API (reste
-- lisible côté serveur).
-- activity_weekly_totals et public_certificates_view restent ouvertes : leurs
-- données sont déjà publiques pour les comptes connectés (classement
-- d'activité) ou par conception (vérification des certificats).

alter view public.email_campaign_recipient_status set (security_invoker = true);
alter view public.email_campaign_duplicates set (security_invoker = true);
alter view public.email_campaign_stats set (security_invoker = true);
alter view public.sms_campaign_recipient_status set (security_invoker = true);
alter view public.sms_campaign_stats set (security_invoker = true);

revoke all on public.recon_sale_verdict from anon, authenticated;
