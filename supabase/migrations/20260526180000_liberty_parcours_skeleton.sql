-- Squelette du parcours LIBERTY (6 phases · 20 modules)
-- Sur base du document "Plan parcours LIBERTY" envoyé par Sidali le 26/05/2026.
-- Tous les chapitres sont en type=video pour permettre l'ajout d'une vidéo
-- + texte explicatif + outil interactif (à greffer plus tard, un par un).

DO $$
DECLARE
  v_parcours_id uuid;
  v_phase_id uuid;
BEGIN
  -- 1. Récupérer le parcours Liberty existant
  SELECT id INTO v_parcours_id FROM parcours WHERE slug = 'liberty';
  IF v_parcours_id IS NULL THEN
    RAISE EXCEPTION 'Parcours liberty introuvable (slug=liberty)';
  END IF;

  -- 2. Mettre à jour les métadonnées du parcours
  UPDATE parcours
  SET titre    = 'PARCOURS LIBERTY',
      subtitle = 'Construis ton écosystème : High-Ticket, Middle-Ticket, Low-Ticket.',
      ordre    = 1,
      updated_at = now()
  WHERE id = v_parcours_id;

  -- 3. Nettoyer d'éventuelles phases/chapitres existants (idempotence)
  DELETE FROM parcours_chapitres
  WHERE phase_id IN (SELECT id FROM parcours_phases WHERE parcours_id = v_parcours_id);
  DELETE FROM parcours_phases WHERE parcours_id = v_parcours_id;

  -- =============================================
  -- PHASE 1 — FONDATIONS (M1 → M4)
  -- =============================================
  INSERT INTO parcours_phases (parcours_id, numero, titre, emoji, description, ordre, status)
  VALUES (v_parcours_id, 1, 'FONDATIONS', '🏗️',
          'Construire les fondations stratégiques de ton offre.', 1, 'published')
  RETURNING id INTO v_phase_id;

  INSERT INTO parcours_chapitres (phase_id, numero, titre, type, ordre, description, status) VALUES
    (v_phase_id, 1, 'M1 — NICHE', 'video', 1,
     'Définir TA niche 2.0 — l''intersection entre ce que tu aimes, tes compétences et les besoins du marché. Outil de fin de module : sous-niche 2.0 + avatar socio/psycho.',
     'published'),
    (v_phase_id, 2, 'M2 — PSYCHOLOGIE', 'video', 2,
     'Les 7 biais cognitifs + 7 déclencheurs d''achat à utiliser éthiquement. Outil de fin de module : douleurs, désirs, leviers, brief stratégique.',
     'published'),
    (v_phase_id, 3, 'M3 — ANATOMIE D''UNE OFFRE', 'video', 3,
     'Les 7 composantes d''une offre irrésistible (promesse, mécanisme, garantie, urgence, prix, bonus, valeur). Outil de fin de module : Anatomie d''une offre.',
     'published'),
    (v_phase_id, 4, 'M4 — VALUE LADDER (vue d''ensemble)', 'video', 4,
     'Les 5 niveaux de l''échelle de valeur — du gratuit au High-Ticket. Approfondissement complet en M18. Outil de fin de module : stratégie d''entrée + cible HT.',
     'published');

  -- =============================================
  -- PHASE 2 — TON HIGH-TICKET EN COACHING LIVE (M5 → M10)
  -- =============================================
  INSERT INTO parcours_phases (parcours_id, numero, titre, emoji, description, ordre, status)
  VALUES (v_parcours_id, 2, 'TON HIGH-TICKET EN COACHING LIVE', '🎯',
          'Architecturer, pricer, signer 10 happy clients en 1-to-1.', 2, 'published')
  RETURNING id INTO v_phase_id;

  INSERT INTO parcours_chapitres (phase_id, numero, titre, type, ordre, description, status) VALUES
    (v_phase_id, 1, 'M5 — CRÉER TON HIGH-TICKET', 'video', 1,
     'Construire ton offre HT en coaching live (promesse de transformation, mécanisme unique, format). Outil de fin de module : Builder High-Ticket.',
     'published'),
    (v_phase_id, 2, 'M6 — PRICING', 'video', 2,
     'Pricer par la valeur (ROI minimum x5) et activer la psychologie du prix. Outil de fin de module : prix par la valeur / le marché / la confiance, paiements halal.',
     'published'),
    (v_phase_id, 3, 'M7 — GARANTIE', 'video', 3,
     'Inverser le risque avec les 3 types de garantie HT (remboursement, continuité, payé au résultat). Outil de fin de module : type, promesse chiffrée, math de la garantie, T&C.',
     'published'),
    (v_phase_id, 4, 'M8 — PREUVE SOCIALE & ÉTUDES DE CAS', 'video', 4,
     '« Show don''t tell » — récolter, structurer et exposer témoignages + études de cas. Outil de fin de module : Preuve sociale.',
     'published'),
    (v_phase_id, 5, 'M9 — SETUP TECHNIQUE', 'video', 5,
     'Mettre en place l''infrastructure minimale de vente : nom de domaine, email pro, ouverture Stripe, connexion Stripe ↔ Liberty. La plateforme Liberty fournit un tunnel packagé — pas besoin de le construire toi-même. (Module en refonte — orientation Liberty + Stripe.)',
     'published'),
    (v_phase_id, 6, 'M10 — FIRST TEN CLIENTS', 'video', 6,
     'Aller chercher tes 10 premiers happy clients en coaching live = POC validé. Ressource de fin de module : Plan de call 1-to-1 hebdo + Tableau de bord 10 happy clients (livrables Word + Excel).',
     'published');

  -- =============================================
  -- PHASE 3 — TRANSITION VERS LE DIY (M11 → M13)
  -- =============================================
  INSERT INTO parcours_phases (parcours_id, numero, titre, emoji, description, ordre, status)
  VALUES (v_parcours_id, 3, 'TRANSITION VERS LE DIY', '🔄',
          'Concevoir le programme · Nommer pour vendre · Transitionner du 1-to-1.', 3, 'published')
  RETURNING id INTO v_phase_id;

  INSERT INTO parcours_chapitres (phase_id, numero, titre, type, ordre, description, status) VALUES
    (v_phase_id, 1, 'M11 — CONCEVOIR UN PROGRAMME', 'video', 1,
     'Ingénierie pédagogique : mapping Point A → B, 5 principes (résultat, micro-learning, active recall, accountability, spiral learning), taxonomie de Bloom. Outil de fin de module : modules/leçons, gate, accountability, coût × prix × durée.',
     'published'),
    (v_phase_id, 2, 'M12 — NAMING & POSITIONNEMENT D''OFFRE', 'video', 2,
     '5 techniques + 3 règles + test de validation pour nommer ton offre de façon mémorable. Outil de fin de module : Naming & Positionnement.',
     'published'),
    (v_phase_id, 3, 'M13 — TRANSITION DIY', 'video', 3,
     'Modèle DIY (Do It Yourself), checklist de transition, architecture du programme DIY, intégration client. Outil de fin de module : Bilan des 5 non-négociables — point de bascule signé avant la mise en marché.',
     'published');

  -- =============================================
  -- PHASE 4 — AJOUTER LE MIDDLE-TICKET (M14 → M15)
  -- =============================================
  INSERT INTO parcours_phases (parcours_id, numero, titre, emoji, description, ordre, status)
  VALUES (v_parcours_id, 4, 'AJOUTER LE MIDDLE-TICKET', '📦',
          'Architecturer le MT · VSL ou Webinaire pour le vendre.', 4, 'published')
  RETURNING id INTO v_phase_id;

  INSERT INTO parcours_chapitres (phase_id, numero, titre, type, ordre, description, status) VALUES
    (v_phase_id, 1, 'M14 — ARCHITECTURER TON MIDDLE-TICKET', 'video', 1,
     'Les 4 formats MT (Masterclass, Membership, Programme groupe, Formation), pricing 97-997 €, transition MT → HT. Outil de fin de module : format, prix MT, dégraissage des modules HT.',
     'published'),
    (v_phase_id, 2, 'M15 — VSL OU WEBINAIRE', 'video', 2,
     'Architecture des 5 actes du VSL + Perfect Webinar (3 secrets, pattern interrupt, stack de valeur). Outil interactif à venir.',
     'published');

  -- =============================================
  -- PHASE 5 — AJOUTER LE LOW-TICKET (M16 → M17)
  -- =============================================
  INSERT INTO parcours_phases (parcours_id, numero, titre, emoji, description, ordre, status)
  VALUES (v_parcours_id, 5, 'AJOUTER LE LOW-TICKET', '🎁',
          'SLO · Tripwire · Order bumps · Upsells · Email nurturing.', 5, 'published')
  RETURNING id INTO v_phase_id;

  INSERT INTO parcours_chapitres (phase_id, numero, titre, type, ordre, description, status) VALUES
    (v_phase_id, 1, 'M16 — TRIPWIRE & SLO', 'video', 1,
     'Self-Liquidating Offer (offre auto-finançante) à 7-47 € pour transformer prospects en clients. Outil de fin de module : produit Low-Ticket, prix ancré sous le MT.',
     'published'),
    (v_phase_id, 2, 'M17 — BOOSTERS DE CONVERSION', 'video', 2,
     'Order bumps, upsells OTO, downsells, séquences email nurturing. Métriques AOV, LVR, ROAS. Outil interactif à venir.',
     'published');

  -- =============================================
  -- PHASE 6 — MAÎTRISE DE L'ÉCOSYSTÈME (M18 → M20)
  -- =============================================
  INSERT INTO parcours_phases (parcours_id, numero, titre, emoji, description, ordre, status)
  VALUES (v_parcours_id, 6, 'MAÎTRISE DE L''ÉCOSYSTÈME', '🏆',
          'Value Ladder revisitée · Erreurs fatales · Checklists multi-niches.', 6, 'published')
  RETURNING id INTO v_phase_id;

  INSERT INTO parcours_chapitres (phase_id, numero, titre, type, ordre, description, status) VALUES
    (v_phase_id, 1, 'M18 — VALUE LADDER REVISITÉE', 'video', 1,
     'Analyse approfondie des transitions LT → MT → HT, LTV, exemples multi-niches. Outil de fin de module : assemble l''échelle LT→MT→HT + LTV.',
     'published'),
    (v_phase_id, 2, 'M19 — ERREURS FATALES', 'video', 2,
     'Les 7 erreurs qui tuent une offre (et leurs antidotes). Module théorique — pas d''outil interactif.',
     'published'),
    (v_phase_id, 3, 'M20 — CHECKLISTS MULTI-NICHES', 'video', 3,
     'Checklist universelle + 3 cas pratiques (coach business, agence web, coach nutrition). Module théorique — pas d''outil interactif.',
     'published');

END $$;
