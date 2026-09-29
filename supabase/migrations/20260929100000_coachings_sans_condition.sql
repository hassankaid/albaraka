-- ─────────────────────────────────────────────────────────────────────────
-- Coachings ouverts à tous les élèves (demande de Hassan le 29/09/2026 :
-- « On ne va plus restreindre les coachings »).
--
-- Jusqu'ici chaque créneau exigeait une formation terminée
-- (coaching_weekly_slots.formation_requise_id, résolu par coachings_de).
-- On retire la condition : coachings_de renvoie alors origine = 'libre',
-- ouvert pour tout le monde.
--
-- Ce qui reste vrai :
--   - une dérogation manuelle « bloqué » du CEO (acces_manuels) l'emporte
--     toujours : on peut encore fermer un coaching à un élève précis ;
--   - le mécanisme n'est pas supprimé : pour rétablir une condition, il
--     suffit de remettre formation_requise_id sur le créneau.
--
-- Valeurs retirées, pour pouvoir les remettre :
--   setting-telephonique  e9b91eb6-2612-45eb-b28d-947bfdaad974  (SETTING)
--   setting-message       e9b91eb6-2612-45eb-b28d-947bfdaad974  (SETTING)
--   creation-contenus     4949ffda-77d2-450e-adad-83554645af32  (MARKETING DIGITAL)
--   closing               7e533baa-7b5e-42cf-8473-6a9fd19c318f  (CLOSING)
-- ─────────────────────────────────────────────────────────────────────────

update public.coaching_weekly_slots
   set formation_requise_id = null
 where id in ('setting-telephonique', 'setting-message', 'creation-contenus', 'closing');
