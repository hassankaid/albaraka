-- ═══════════════════════════════════════════════════════════════════════
-- Sonia Razouane : tout regrouper sur le compte qu'elle utilise, en rôle
-- APPORTEUR.
--
-- Elle a été closeuse, elle est aujourd'hui apporteuse. Deux comptes créés à
-- quatre jours d'écart en mars 2026, un par métier :
--
--   razouanesonia@gmail.com  collaborateur + is_also_apporteur  58 commissions
--   renauzasonia@gmail.com   apporteur                          12 commissions
--
-- CE QUI TRANCHE LA CIBLE : `auth.users.last_sign_in_at`.
--   razouanesonia -> 12/06/2026
--   renauzasonia  -> 07/03/2026, le jour de sa création, jamais depuis.
--
-- Elle n'utilise donc que le premier. Or ses 741,53 € de commissions
-- d'apporteuse et ses 5 factures vivaient sur le second : elle ne pouvait pas
-- les voir. Ce regroupement lui rend accès à sa propre activité.
--
-- LE RÔLE PASSE À `apporteur`, à la demande de Hassan (05/09/2026) : elle n'est
-- plus closeuse, elle ne doit pas garder le rôle qui va avec.
--
-- Conséquence assumée : « Mes Commissions » est fermé au rôle `apporteur`
-- (`DashboardLayout` — roles ceo/collaborateur/agence). Ses 1 381,61 € de
-- commissions de closeuse, dont 133,22 € encore à verser, ne lui seront plus
-- visibles dans l'application. Les versements continuent normalement : c'est un
-- changement d'accès, pas de droits à percevoir.
--
-- AUCUN MONTANT N'EST MODIFIÉ : on ne change que le propriétaire des lignes.
-- Ce n'est pas un rattrapage du passé, c'est un rattachement.
-- ═══════════════════════════════════════════════════════════════════════

update commissions
set beneficiary_user_id = '1439f8a0-513c-422c-a6b7-3ff06b18ffc9'
where beneficiary_user_id = 'e850011c-662b-4557-b9b5-f6256e6b2353';

update apporteur_invoices
set apporteur_id = '1439f8a0-513c-422c-a6b7-3ff06b18ffc9'
where apporteur_id = 'e850011c-662b-4557-b9b5-f6256e6b2353';

update notifications
set user_id = '1439f8a0-513c-422c-a6b7-3ff06b18ffc9'
where user_id = 'e850011c-662b-4557-b9b5-f6256e6b2353';

update access_audit_log
set user_id = '1439f8a0-513c-422c-a6b7-3ff06b18ffc9'
where user_id = 'e850011c-662b-4557-b9b5-f6256e6b2353';

update profiles
set role = 'apporteur', is_also_apporteur = false, updated_at = now()
where id = '1439f8a0-513c-422c-a6b7-3ff06b18ffc9';

-- TROIS LIGNES RESTENT SUR LE COMPTE DORMANT, et c'est délibéré. Chacune est
-- protégée par une contrainte d'unicité par utilisateur, et le compte cible a
-- déjà la sienne :
--   user_passes       — pass `al_baraka` actif, elle en a déjà un
--   closing_plans     — plan actif du 19/04, vestige de son époque closeuse
--   lead_quiz_owners  — page de quiz inactive, 0 vue
-- Les déplacer est impossible, les détruire effacerait une trace sans rien
-- gagner : elle ne perd aucun accès puisque l'équivalent existe déjà côté cible.
--
-- Le profil dormant est CONSERVÉ, vide de données métier. Le désactiver relève
-- de la console Supabase (auth), pas d'une migration.
