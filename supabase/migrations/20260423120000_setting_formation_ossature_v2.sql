-- Setting Formation — Ossature iso-doc v2
-- Source : SETTING_PLAN (2).docx — 9 parties, 13 modules
--
-- Changements :
--   1. Renommage des 12 chapitres existants en sentence case strict (iso-doc).
--   2. Ajout Partie 9 "BONUS : DEVENIR SETTER FREELANCE" + 1 chapitre
--      "Prospecter des infopreneurs en tant que setter/closer" (published).
--   3. Mise à jour description formation : "12 chapitres" → "13 chapitres
--      répartis en 9 parties".
--
-- Idempotent : les UPDATE sont safe sur re-run, l'INSERT du module BONUS
-- est protégé par un IF NOT EXISTS sur (formation_id, ordre=8).

DO $$
DECLARE
  v_formation_id uuid := 'e9b91eb6-2612-45eb-b28d-947bfdaad974';
  v_new_module_id uuid;
  v_m0 uuid := '1d537fcb-8984-40a5-82af-3a0d33915953';
  v_m1 uuid := 'd884839b-bc53-4d1e-82ab-6d8df9e57dba';
  v_m2 uuid := 'b3e7cc63-0fe5-43b8-8e2a-69170185edb9';
  v_m3 uuid := 'dd823832-1829-4bbc-90f0-04a1b5784a74';
  v_m4 uuid := '6f036c0b-c85f-429a-93d5-652d8e9b823c';
  v_m5 uuid := 'a2708192-a74f-448e-9d3e-eaa0e9dc2b7a';
  v_m6 uuid := 'e560fb47-e73e-4992-9e1e-e0c46fdcd18d';
  v_m7 uuid := 'acfc0ca0-a71e-42ea-a27b-01d7baf7b054';
BEGIN
  -- 1. Description formation : 12 chapitres -> 13 chapitres
  UPDATE formations
  SET description = REPLACE(description, 'En 12 chapitres', 'En 13 chapitres répartis en 9 parties')
  WHERE id = v_formation_id AND description LIKE '%En 12 chapitres%';

  -- 2. Renames chapitres (iso-doc sentence case)
  UPDATE formation_chapitres SET titre = 'Définitions & rôles' WHERE module_id = v_m0 AND ordre = 0;
  UPDATE formation_chapitres SET titre = 'Le mindset du setter' WHERE module_id = v_m0 AND ordre = 1;
  UPDATE formation_chapitres SET titre = 'L''ICP — Votre cible idéale' WHERE module_id = v_m1 AND ordre = 0;
  UPDATE formation_chapitres SET titre = 'Le sourcing' WHERE module_id = v_m1 AND ordre = 1;
  UPDATE formation_chapitres SET titre = 'Psychologie du setting' WHERE module_id = v_m2 AND ordre = 0;
  UPDATE formation_chapitres SET titre = 'Marché sophistiqué & méthode H-O-C' WHERE module_id = v_m2 AND ordre = 1;
  UPDATE formation_chapitres SET titre = 'Règles d''or, approches warm/cold/community, séquence 7 messages, LinkedIn' WHERE module_id = v_m3 AND ordre = 0;
  UPDATE formation_chapitres SET titre = 'Structure en 4 phases, scripts & anti no-show' WHERE module_id = v_m4 AND ordre = 0;
  UPDATE formation_chapitres SET titre = 'Profils DISC & BANT+' WHERE module_id = v_m5 AND ordre = 0;
  UPDATE formation_chapitres SET titre = 'Formule C.A.R.E. & 12 scripts' WHERE module_id = v_m5 AND ordre = 1;
  UPDATE formation_chapitres SET titre = 'Scripts avancés, situations complexes, stories, relances, LinkedIn B2B' WHERE module_id = v_m6 AND ordre = 0;
  UPDATE formation_chapitres SET titre = 'Itérations, KPIs, outils, organisation & plan 90 jours' WHERE module_id = v_m7 AND ordre = 0;

  -- 3. Partie 9 + chapitre BONUS (idempotent)
  IF NOT EXISTS (
    SELECT 1 FROM formation_modules WHERE formation_id = v_formation_id AND ordre = 8
  ) THEN
    INSERT INTO formation_modules (formation_id, titre, ordre, status)
    VALUES (v_formation_id, 'BONUS : DEVENIR SETTER FREELANCE', 8, 'published')
    RETURNING id INTO v_new_module_id;

    INSERT INTO formation_chapitres (module_id, titre, ordre, status)
    VALUES (v_new_module_id, 'Prospecter des infopreneurs en tant que setter/closer', 0, 'published');
  END IF;
END $$;
