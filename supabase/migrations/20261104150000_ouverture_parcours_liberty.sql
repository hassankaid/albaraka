-- Ouverture du nouveau parcours Liberty (demande de Sidali, 04/11/2026 : « un seul parcours clair »).
--
-- 1. Le nouveau parcours (formation parcours-liberty, réservée Liberty) passe en ligne. Le déclencheur
--    formations_liberty_inscrire y inscrit tous les Pass Liberty actifs ; synchroniser_formations_du_pass
--    fera de même pour chaque futur Pass Liberty.
-- 2. L'ancienne version (parcours « liberty », modules M1 à M20) est masquée aux élèves, comme l'ancien
--    parcours AL BARAKA le 12/10 : plus de bandeau, l'adresse renvoie vers la page Formation. Rien n'est
--    supprimé (progression gardée), le CEO la voit toujours. Retour arrière : les deux mises à jour inverses.
--
-- Setting/Closing, Community Management et Estimaction ne changent pas : ce sont des parcours à part.
-- Appliqué en base le 04/11/2026.

update public.formations set status = 'published' where slug = 'parcours-liberty' and status = 'draft';
update public.parcours set masque_eleves = true where slug = 'liberty';
