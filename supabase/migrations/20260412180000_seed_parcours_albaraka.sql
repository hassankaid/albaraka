-- Seed du parcours AL BARAKA + coquille vide LIBERTY
-- Source : PARCOURS_ALBARAKA_PLAN_2.docx (6 phases × chapitres + milestones)
-- Idempotent : garde sur slug.

do $$
declare
  -- Formations existantes (ids depuis la BDD)
  v_form_muslim_mindset uuid := '4557d358-c49c-4d78-82ea-b7910f477cde';
  v_form_personal_branding uuid := 'd31a7726-6468-44ca-b07c-847e29b43ebc';
  v_form_storytelling uuid := 'a9af0dd2-f876-4971-990f-7f91bf3e601a';
  v_form_marketing uuid := '4949ffda-77d2-450e-adad-83554645af32';
  v_form_setting uuid := 'e9b91eb6-2612-45eb-b28d-947bfdaad974';
  v_form_closing uuid := '7e533baa-7b5e-42cf-8473-6a9fd19c318f';
  -- Parcours & phases
  v_parcours_albaraka uuid;
  v_phase uuid;
begin
  -- Garde d'idempotence
  if exists (select 1 from public.parcours where slug = 'al-baraka') then
    raise notice 'Parcours AL BARAKA already seeded, skipping.';
    return;
  end if;

  -- ═══════════════════════════════════════════
  -- PARCOURS AL BARAKA
  -- ═══════════════════════════════════════════
  insert into public.parcours (pass_type, slug, titre, subtitle, ordre)
  values ('al_baraka', 'al-baraka', 'PARCOURS AL BARAKA',
          'Gagne ta liberté. Garde ta foi. C''est ça la vraie baraka.', 1)
  returning id into v_parcours_albaraka;

  -- ─────────────────────────────────────────────
  -- PHASE 1 — FONDATIONS
  -- ─────────────────────────────────────────────
  insert into public.parcours_phases (parcours_id, numero, titre, emoji, description, ordre)
  values (v_parcours_albaraka, 1, 'FONDATIONS', '🏗️',
          'Comprendre l''écosystème, découvrir la plateforme, poser le bon état d''esprit.', 1)
  returning id into v_phase;

  insert into public.parcours_chapitres (phase_id, numero, titre, type, ordre, description, duree_estimee_minutes) values
    (v_phase, 1, 'Introduction', 'video', 1,
     E'• Bienvenue dans AL BARAKA — mot de bienvenue de Sidali\n• Ta mission en tant qu''affilié : tu changes des vies, pas juste tu vends\n• Comment fonctionne le PARCOURS AL BARAKA (les 6 phases, le flow INTRO → Formation → Retour)', 10),
    (v_phase, 2, 'Découvrir la plateforme', 'video', 2,
     E'• Comment naviguer sur la plateforme AL BARAKA\n• Les 3 espaces : PARCOURS AL BARAKA / PARCOURS LIBERTY / MES FORMATIONS\n• Les quiz, le tracker de progression, la facturation, le suivi de commissions', 10),
    (v_phase, 3, 'L''écosystème AL BARAKA', 'video', 3,
     E'• Le modèle d''apporteur d''affaires : ce que tu fais, ce que tu ne fais pas, comment tu es rémunéré\n• Pourquoi c''est halal et éthique\n• Les 3 formules : À la carte (500€), Pass AL BARAKA (2 500€), LIBERTY (5 000€)\n• Le catalogue des formations — les 5 formations Pass\n• Le catalogue des formations — les 3 exclusivités LIBERTY\n• Les bonus : ESTIMACTION, Muslim Mindset, Administratif', 15),
    (v_phase, 4, 'Tes perspectives', 'video', 4,
     E'• Niveau 1 : affilié débutant → premières ventes\n• Niveau 2 : affilié confirmé → revenus récurrents\n• Niveau 3 : coach ou partenaire stratégique', 10),
    (v_phase, 5, 'L''accompagnement', 'video', 5,
     E'• Les 4 coachings de groupe par semaine (thèmes, fonctionnement)\n• La communauté AL BARAKA : groupe privé, canal de communication, règles\n• Le HUB AL BARAKA : plateforme dédiée, quiz, plan 90 jours, suivi\n• LIBERTY : les reviews personnalisées + accès direct Sidali', 10),
    (v_phase, 6, 'Les offres partenaires', 'video', 6,
     E'• Les offres partenaires AL BARAKA : des entreprises pour lesquelles tu peux proposer tes services\n• Comment ça fonctionne : tu apportes des clients aux partenaires, tu touches une commission\n• Le catalogue des offres partenaires disponibles', 10);

  insert into public.parcours_chapitres (phase_id, numero, titre, type, ordre, description, formation_id) values
    (v_phase, 7, 'VA TE FORMER → Muslim Mindset', 'redirect_formation', 7,
     E'Avant d''aller plus loin : la formation Muslim Mindset ancre ton intention et ta posture d''affilié halal.\n⚠️ Terminer à 100% + réussir le quiz avant de revenir au parcours.',
     v_form_muslim_mindset);

  insert into public.parcours_chapitres (phase_id, numero, titre, type, ordre, description, duree_estimee_minutes) values
    (v_phase, 8, 'Le mindset de l''affilié', 'video', 8,
     E'• At-Tawakkul dans le business : faire les causes puis s''en remettre à Allah\n• L''éthique de la vente en Islam : les lignes rouges\n• La baraka dans le travail : intention sincère et travail honnête\n• Gérer les hauts et les bas : le rejet est normal, la patience est une compétence', 15);

  -- ─────────────────────────────────────────────
  -- PHASE 2 — TON IMAGE
  -- ─────────────────────────────────────────────
  insert into public.parcours_phases (parcours_id, numero, titre, emoji, description, ordre)
  values (v_parcours_albaraka, 2, 'TON IMAGE', '🎨',
          'Savoir à qui tu parles et construire une présence professionnelle en ligne.', 2)
  returning id into v_phase;

  insert into public.parcours_chapitres (phase_id, numero, titre, type, ordre, description, duree_estimee_minutes) values
    (v_phase, 1, 'Introduction', 'video', 1,
     E'• Pourquoi ton image est ton premier commercial\n• Ce que tu vas apprendre dans cette phase et pourquoi c''est essentiel', 8);

  insert into public.parcours_chapitres (phase_id, numero, titre, type, ordre, description, formation_id) values
    (v_phase, 2, 'VA TE FORMER → Personal Branding', 'redirect_formation', 2,
     E'Construire une image pro qui convertit : photo, bio, positionnement, highlights.\n⚠️ Terminer à 100% + réussir le quiz avant de revenir au parcours.',
     v_form_personal_branding);

  insert into public.parcours_chapitres (phase_id, numero, titre, type, ordre, description, duree_estimee_minutes) values
    (v_phase, 3, 'L''avatar client AL BARAKA', 'video', 3,
     E'• Qui est le client AL BARAKA : portrait-robot (25-45 ans, musulman francophone, salarié/parent)\n• Ses douleurs profondes : conflit foi/travail, plafond de verre, frustration salariale\n• Ses désirs & aspirations : liberté financière halal, expatriation, meilleur avenir\n• Où le trouver : Instagram, TikTok, Facebook, YouTube, les mines d''or\n• Qualifier un prospect en 3 questions : signaux verts vs signaux rouges', 15),
    (v_phase, 4, 'Ton personal branding AL BARAKA', 'video', 4,
     E'• Le positionnement AL BARAKA : tu es un ambassadeur, pas un vendeur\n• Construire ton identité digitale : photo, bio qui convertit, highlights, lien en bio\n• Ton histoire personnelle : framework Avant / Déclencheur / Après\n• Les 5 piliers de contenu de l''affilié : Valeur 40%, Inspiration 20%, Connexion 15%, Conviction 15%, Conversion 10%\n• Les erreurs qui tuent ta crédibilité : à faire vs à ne jamais faire', 20);

  -- ─────────────────────────────────────────────
  -- PHASE 3 — TON CONTENU
  -- ─────────────────────────────────────────────
  insert into public.parcours_phases (parcours_id, numero, titre, emoji, description, ordre)
  values (v_parcours_albaraka, 3, 'TON CONTENU', '📱',
          'Apprendre à raconter des histoires et à créer du contenu qui attire.', 3)
  returning id into v_phase;

  insert into public.parcours_chapitres (phase_id, numero, titre, type, ordre, description, duree_estimee_minutes) values
    (v_phase, 1, 'Introduction', 'video', 1,
     E'• Le rôle du contenu dans le funnel AL BARAKA\n• Pourquoi storytelling + marketing digital = combo gagnant', 8);

  insert into public.parcours_chapitres (phase_id, numero, titre, type, ordre, description, formation_id) values
    (v_phase, 2, 'VA TE FORMER → Storytelling', 'redirect_formation', 2,
     E'Le storytelling est ton arme de conviction. Apprends la structure narrative qui convertit.\n⚠️ Terminer à 100% + réussir le quiz avant de revenir au parcours.',
     v_form_storytelling),
    (v_phase, 3, 'VA TE FORMER → Marketing Digital', 'redirect_formation', 3,
     E'La stratégie de contenu, les plateformes, les Réels qui cartonnent.\n⚠️ Terminer à 100% + réussir le quiz avant de revenir au parcours.\n\n🎁 À la fin de cette formation, le Quiz Organisation et le Suivi d''Activité se débloquent.',
     v_form_marketing);

  insert into public.parcours_chapitres (phase_id, numero, titre, type, ordre, description, duree_estimee_minutes) values
    (v_phase, 4, 'Storytelling AL BARAKA', 'video', 4,
     E'• Pourquoi le storytelling est l''arme secrète de l''affilié\n• Les 5 types d''histoires AL BARAKA : personnelle, transformation, contraste, conviction, urgence\n• La structure narrative en 5 temps : situation → déclencheur → épreuves → transformation → nouvelle réalité\n• Storytelling en vidéo (Réels & TikTok) : les 3 premières secondes décident de tout\n• Storytelling en DM (Setting) : injecter du récit dans tes messages en 3 étapes', 20),
    (v_phase, 5, 'Marketing Digital AL BARAKA', 'video', 5,
     E'• La stratégie de contenu AL BARAKA : 7 contenus/semaine, heures optimales, planification\n• Créer des Réels/TikTok : structure Hook → Corps → CTA + 10 templates de hooks\n• Les stories qui convertissent : séquence en 5 étapes\n• Les piliers d''acquisition organique : profil, Réels, stories, routines de croissance, networking\n• Stratégie multi-plateformes : Instagram + TikTok d''abord, puis Facebook/LinkedIn/YouTube\n• Le funnel de l''affilié : Découverte → Profil → DM → Conférence → Closing', 25);

  -- ─────────────────────────────────────────────
  -- PHASE 4 — PROSPECTER
  -- ─────────────────────────────────────────────
  insert into public.parcours_phases (parcours_id, numero, titre, emoji, description, ordre)
  values (v_parcours_albaraka, 4, 'PROSPECTER', '🎯',
          'Trouver des prospects, engager la conversation, les amener à la conférence du dimanche.', 4)
  returning id into v_phase;

  insert into public.parcours_chapitres (phase_id, numero, titre, type, ordre, description, duree_estimee_minutes) values
    (v_phase, 1, 'Introduction', 'video', 1,
     E'• Ton rôle : amener les prospects à la conférence du dimanche à 11h\n• Vue d''ensemble des outils que tu vas utiliser', 8);

  insert into public.parcours_chapitres (phase_id, numero, titre, type, ordre, description, formation_id) values
    (v_phase, 2, 'VA TE FORMER → Setting', 'redirect_formation', 2,
     E'Les fondamentaux du setting : DM, téléphone, appel découverte.\n⚠️ Terminer à 100% + réussir le quiz avant de revenir au parcours.',
     v_form_setting);

  insert into public.parcours_chapitres (phase_id, numero, titre, type, ordre, description, duree_estimee_minutes) values
    (v_phase, 3, 'Tes outils d''affilié', 'video', 3,
     E'• Personnaliser ton tunnel de vente AL BARAKA : insérer ton lien WhatsApp, configurer ton lien affilié\n• Le quiz AL BARAKA : ton lien affilié personnel, comment l''envoyer, quand l''utiliser\n• Le guide PDF des compétences AL BARAKA : comment l''envoyer en DM, quand l''utiliser en relance', 15),
    (v_phase, 4, 'Setting DM AL BARAKA', 'video', 4,
     E'• Les principes du setting AL BARAKA : approche humaine, écoute active, méthode H-O-C\n• Le sourcing de prospects : mines d''or Instagram, abonnés similaires, groupes Facebook\n• Les 13 messages d''approche AL BARAKA (universels, curiosité, ciblés, fraternels)\n• Le guide de sélection des messages : quel message pour quel profil\n• Script de qualification (5 étapes) : accroche → conférence → 7 questions → numéro → groupe WhatsApp\n• Les relances (6 scripts) : pas de réponse, après lead magnet, rappels vendredi/samedi/dimanche, "je réfléchis"\n• La conférence du dimanche : ce que tu dis, ce que tu ne dis PAS, suivi post-conférence', 30),
    (v_phase, 5, 'Setting téléphonique AL BARAKA', 'video', 5,
     E'• Phase 1 : Connexion — confirmer l''identité, ouvrir la conversation\n• Phase 2 : Accroche & contexte — question d''accroche, évaluer la maturité, reprendre le contrôle\n• Phase 3 : Qualification budget — situation, climat de confiance, budget mensuel, économies\n• Phase 4 : Variantes budget — chiffre bas, évite de répondre, demande le prix\n• Phase 5 : Temps & profil — qualification temps, aisance relationnelle, réseaux sociaux\n• Phase 6 : Motiver & pré-engager — motivation, jauger l''engagement, pré-engagement\n• Phase 7 : Conférence & engagement — création du lien, transition conférence, groupe WhatsApp en direct\n• Phase 8 : Objections setting & checklist post-appel', 30),
    (v_phase, 6, 'Appel découverte AL BARAKA', 'video', 6,
     E'• Étape 1 : Connexion — ice-breaking + cadrage + obtenir le "oui"\n• Étape 2 : Clarification — situation actuelle, déclencheur, problème/objectif\n• Étape 3 : Reformulation & validation\n• Étape 4 : Business model AL BARAKA — contextualiser le marché, poser le déclic\n• Étape 5 : Qualification profil — aisance, réseaux, temps, vision\n• Étape 6 : Qualification engagement — engagement, investissement\n• Étape 7 : Si pas qualifié — clôturer avec respect\n• Étape 8 : Si qualifié — valoriser, invitation conférence\n• Étape 9 : Groupe WhatsApp en direct + ponctualité\n• Étape 10 : Clôture & récap', 25),
    (v_phase, 7, 'Objections setting', 'video', 7,
     E'• "C''est quoi exactement ?" / "C''est combien ?" / "J''ai pas le temps"\n• "C''est quoi comme arnaque ?" / "Je veux pas me montrer" / "C''est du MLM ?"\n• "J''ai déjà essayé une formation, ça marche pas"\n• Formule universelle C.A.R.E. : Clarifier → Accuser réception → Recadrer → Engager', 20),
    (v_phase, 8, 'Organisation du setter', 'video', 8,
     E'• Outils de suivi : Google Sheets ou Notion + colonnes\n• KPIs à tracker : DM envoyés, taux de réponse, qualifiés, inscrits\n• Routine quotidienne : 30 min sourcing + 30 min DM + 30 min suivi + 30 min contenu', 15);

  -- Milestone fin Phase 4
  insert into public.parcours_chapitres (phase_id, numero, titre, type, ordre, milestone_message, milestone_emoji) values
    (v_phase, 9, 'TU ES OPÉRATIONNEL', 'milestone', 9,
     E'Tu peux désormais prospecter et ramener des inscrits à la conférence du dimanche.\n\nC''est le moment de passer à l''action et de structurer ta semaine — ton espace Suivi d''activité et ton Quiz Organisation sont débloqués.', '⚡');

  -- ─────────────────────────────────────────────
  -- PHASE 5 — VENDRE
  -- ─────────────────────────────────────────────
  insert into public.parcours_phases (parcours_id, numero, titre, emoji, description, ordre)
  values (v_parcours_albaraka, 5, 'VENDRE', '💰',
          'Closer des ventes pour l''écosystème AL BARAKA et toucher tes premières commissions.', 5)
  returning id into v_phase;

  insert into public.parcours_chapitres (phase_id, numero, titre, type, ordre, description, duree_estimee_minutes) values
    (v_phase, 1, 'Introduction', 'video', 1,
     E'• Comment fonctionne le closing chez AL BARAKA — les 3 formules à vendre\n• Les fondamentaux du closer AL BARAKA : écoute 80%, empathie, honnêteté', 10);

  insert into public.parcours_chapitres (phase_id, numero, titre, type, ordre, description, formation_id) values
    (v_phase, 2, 'VA TE FORMER → Closing', 'redirect_formation', 2,
     E'Maîtrise les fondamentaux du closing : structure en phases, objections, échelle de conviction.\n⚠️ Terminer à 100% + réussir le quiz avant de revenir au parcours.',
     v_form_closing);

  insert into public.parcours_chapitres (phase_id, numero, titre, type, ordre, description, duree_estimee_minutes) values
    (v_phase, 3, 'Script closing À la carte (500€)', 'video', 3,
     E'12 phases : Connexion & cadrage → Explorer la douleur → Amplifier & constater → Vision & projection → Le fossé → Pré-engagement → Présentation formule À la carte (5 variantes) → Témoignages & questions → Échelle de conviction 1-10 → Annonce du prix + objection prix → Inscription → Onboarding', 30),
    (v_phase, 4, 'Script closing Pass AL BARAKA (2 500€)', 'video', 4,
     E'12 phases : Connexion & cadrage → Explorer la douleur → Amplifier & constater → Vision & projection → Le fossé → Pré-engagement → Présentation écosystème (piliers 1-2) → Piliers 3-4 + accompagnement + conviction finale → Témoignages & questions → Échelle de conviction → Annonce du prix (2 500€) → Inscription + onboarding', 35),
    (v_phase, 5, 'Script closing LIBERTY', 'video', 5,
     E'14 phases : Connexion & cadrage → Explorer la douleur → Questions compétences (compétence actuelle, offre, acquisition, blocage) → Vision & fossé → Pré-engagement → Offre étapes 1-4 (Offer Creation → PB → Storytelling → Marketing Digital) → Offre étapes 5-8 (Setting RDV → Closing son offre → Copywriting → Media Buying) → Coaching + Sidali + conviction finale → Témoignages → Échelle de conviction → Annonce du prix + objection → Inscription → Onboarding → Récap du parcours LIBERTY', 40),
    (v_phase, 6, 'Objections closing', 'video', 6,
     E'• Écrans de fumée : réfléchir, récap, pas le bon moment, déjà perdu de l''argent, combien de temps, jamais à chaud\n• Prix & budget : trop cher (prix vs budget), pas dans mon budget, pas l''argent\n• Confiance & doute : pas sûr que ça marche (ESTIMACTION), déjà perdu de l''argent (qadara Lah)\n• Temps & entourage : pas le temps, dans 3 mois, conjoint (autorisation vs information), parents\n• Cadrage : j''ai que 20 min, donne le prix (médecin/garagiste)\n• Process échelle 1-10 : isoler → clarifier → traiter → relancer\n• Armes de dernier recours : la question magique + la montagne au trésor', 25);

  -- Milestone fin Phase 5
  insert into public.parcours_chapitres (phase_id, numero, titre, type, ordre, milestone_message, milestone_emoji) values
    (v_phase, 7, 'TU PEUX VENDRE', 'milestone', 7,
     E'Premières commissions en vue : 500€ à 2 500€ par vente.\n\nTu as désormais les armes pour closer tes prospects. La prochaine vente, c''est la tienne.', '💎');

  -- ─────────────────────────────────────────────
  -- PHASE 6 — CONSOLIDER
  -- ─────────────────────────────────────────────
  insert into public.parcours_phases (parcours_id, numero, titre, emoji, description, ordre)
  values (v_parcours_albaraka, 6, 'CONSOLIDER', '🏆',
          'Passer à l''action concrètement, ancrer les habitudes, devenir autonome.', 6)
  returning id into v_phase;

  insert into public.parcours_chapitres (phase_id, numero, titre, type, ordre, description, duree_estimee_minutes) values
    (v_phase, 1, 'Introduction', 'video', 1,
     E'Tu as toutes les compétences — maintenant on ancre et on scale.', 5),
    (v_phase, 2, 'Passage à l''action', 'video', 2,
     E'• La routine quotidienne de l''affilié : 2h minimum (sourcing + DM + contenu + suivi)\n• Tes objectifs & KPIs : contenus/sem, DM envoyés, taux de réponse, qualifiés, inscrits, appels, ventes\n• Planifier ta semaine : contenu le dimanche soir, sourcing et DM en semaine, conférence le dimanche', 20),
    (v_phase, 3, 'Administratif — après ta 1ère vente uniquement', 'video', 3,
     E'⚠️ N''entame les démarches administratives qu''APRÈS avoir effectué ta première vente.\n• Module Administratif disponible dans MES FORMATIONS\n• Création de société, statut, facturation, fiscalité', 10),
    (v_phase, 4, 'Conclusion & mot de la fin', 'video', 4,
     E'• Tu fais partie de quelque chose de plus grand\n• Ce que tu représentes : chaque vente = une vie transformée\n• Tu n''es pas seul : communauté, coachs, formations, HUB', 10);

  -- Milestone final
  insert into public.parcours_chapitres (phase_id, numero, titre, type, ordre, milestone_message, milestone_emoji) values
    (v_phase, 5, 'TU ES AUTONOME', 'milestone', 5,
     E'Tu prospectes, tu closes, tu génères des revenus halal.\n\n« Gagne ta liberté. Garde ta foi. C''est ça la vraie baraka. »', '🌙');

  -- ═══════════════════════════════════════════
  -- PARCOURS LIBERTY — coquille vide
  -- ═══════════════════════════════════════════
  insert into public.parcours (pass_type, slug, titre, subtitle, status, ordre)
  values ('liberty', 'liberty', 'PARCOURS LIBERTY',
          'Structure ton business, scale ton offre, deviens autonome.',
          'draft', 2);
  -- Phases/chapitres à seeder plus tard quand Sidali enverra le plan détaillé.

  -- ═══════════════════════════════════════════
  -- Backfill : enroller les users avec pass actif au parcours
  -- ═══════════════════════════════════════════
  insert into public.parcours_enrollments (user_id, parcours_id)
  select up.user_id, p.id
  from public.user_passes up
  join public.parcours p on p.pass_type = up.pass_type and p.status = 'published'
  where up.revoked_at is null
  on conflict (user_id, parcours_id) do nothing;

end $$;
