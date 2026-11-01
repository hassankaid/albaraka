-- Fermeture d'une faille : la politique d'insertion ouverte à tout utilisateur connecté
-- permettait à un élève de créer une commission à son nom, qui entrait ensuite dans sa facture.
-- Restent : commissions_insert_ceo pour le CEO, et le service_role pour les fonctions serveur.
-- Appliqué en base le 01/11/2026, avec l'accord de Hassan.

drop policy if exists "Allow authenticated users to insert commissions" on public.commissions;
