-- Setting Formation — Quiz iso-doc
-- Sources :
--   - QUIZ_SETTING PAR_MODULE.docx : 11 quiz par module (24 questions au total)
--   - QUIZ_FINAL SETTING.docx       : 1 quiz final (10 questions)
--
-- Règles :
--   - max_errors = 3 sur tous les quiz (aligné avec les autres formations récentes)
--   - Shuffle des réponses déjà géré côté app (QuizPage.tsx, Fisher-Yates à chaque tentative)
--   - Options à 3 choix (A/B/C), explications concaténées par option (❌/✅) dans explication
--   - Modules 2 (Mindset) et 6 (Marché sophistiqué & H-O-C) : pas de quiz (iso-doc)
--
-- Attachement :
--   - Les 11 quiz par module sont attachés à chapitre_id (permet 2 quiz dans la
--     même partie DB, cas M5 Qualification qui contient BANT+ et Objections).
--   - Le quiz final reste sur formation_id (module_id=null, chapitre_id=null),
--     convention partagée par les autres formations.
--
-- Destructif sur re-run : purge d'abord tous les quiz attachés à la formation
-- (via formation_id OU module_id des parties), puis recrée l'ensemble.

DO $MIG$
DECLARE
  v_formation_id uuid := 'e9b91eb6-2612-45eb-b28d-947bfdaad974';
  v_quiz_id uuid;
  v_chap_id uuid;
BEGIN
  -- PURGE existing setting quizzes (CASCADE removes questions + attempts)
  DELETE FROM quizzes WHERE formation_id = v_formation_id;
  DELETE FROM quizzes WHERE module_id IN (SELECT id FROM formation_modules WHERE formation_id = v_formation_id);
  DELETE FROM quizzes WHERE chapitre_id IN (
    SELECT c.id FROM formation_chapitres c
    JOIN formation_modules m ON m.id = c.module_id
    WHERE m.formation_id = v_formation_id
  );

  -- =========== MODULE 1 — Définitions & rôles ===========
  SELECT c.id INTO v_chap_id FROM formation_chapitres c
    JOIN formation_modules m ON m.id = c.module_id
    WHERE m.formation_id = v_formation_id AND m.ordre = 0 AND c.ordre = 0;
  INSERT INTO quizzes (chapitre_id, titre, description, max_errors, status)
    VALUES (v_chap_id, $T$Quiz Setting — Module 1 : Définitions & rôles$T$, $T$Chaque quiz teste les connaissances clés du module. Choisissez la bonne réponse puis lisez les explications.$T$, 3, 'published')
    RETURNING id INTO v_quiz_id;
  INSERT INTO quiz_questions (quiz_id, question, options, correct_index, explication, ordre) VALUES
  (v_quiz_id, $T$Quel est le rôle principal du setter ?$T$, jsonb_build_array($T$Vendre le produit au prospect$T$, $T$Qualifier le prospect et réserver un RDV$T$, $T$Créer du contenu pour attirer des leads$T$), 1, $T$❌ A) C'est le rôle du closer, pas du setter.
✅ B) Le setter détecte la douleur, qualifie et pose le RDV. Il ne vend pas.
❌ C) C'est le rôle du marketing, pas du setting.$T$, 0),
  (v_quiz_id, $T$Quelle est la différence entre un setter et un closer ?$T$, jsonb_build_array($T$Le setter vend, le closer qualifie$T$, $T$Le setter qualifie, le closer vend$T$, $T$Il n'y a pas de différence$T$), 1, $T$❌ A) C'est l'inverse.
✅ B) Le setter identifie la douleur et qualifie. Le closer présente l'offre et conclut.
❌ C) Ces deux rôles sont bien distincts et ne doivent pas se confondre.$T$, 1),
  (v_quiz_id, $T$Que se passe-t-il si vous envoyez un prospect non qualifié au closer ?$T$, jsonb_build_array($T$Le closer le qualifiera lui-même$T$, $T$Rien de grave, le closer décidera$T$, $T$Vous faites perdre du temps à tout le monde$T$), 2, $T$❌ A) Ce n'est pas son rôle. Cela lui fait perdre du temps et détruit la confiance.
❌ B) Un RDV non qualifié a un coût (temps, énergie, crédibilité). C'est une perte pour toute la chaîne.
✅ C) Un RDV mal qualifié coûte plus cher qu'un prospect non contacté.$T$, 2);

  -- =========== MODULE 3 — L'ICP ===========
  SELECT c.id INTO v_chap_id FROM formation_chapitres c
    JOIN formation_modules m ON m.id = c.module_id
    WHERE m.formation_id = v_formation_id AND m.ordre = 1 AND c.ordre = 0;
  INSERT INTO quizzes (chapitre_id, titre, description, max_errors, status)
    VALUES (v_chap_id, $T$Quiz Setting — Module 3 : L'ICP$T$, $T$Chaque quiz teste les connaissances clés du module. Choisissez la bonne réponse puis lisez les explications.$T$, 3, 'published')
    RETURNING id INTO v_quiz_id;
  INSERT INTO quiz_questions (quiz_id, question, options, correct_index, explication, ordre) VALUES
  (v_quiz_id, $T$Combien de dimensions comporte l'ICP enseigné dans la formation ?$T$, jsonb_build_array($T$4 dimensions$T$, $T$7 dimensions$T$, $T$10 dimensions$T$), 1, $T$❌ A) L'ICP comporte 7 dimensions, pas 4.
✅ B) Démographique, Professionnel, Douleurs, Désirs, Capacité, Timing, Comportement digital.
❌ C) 7 suffisent pour un ciblage précis.$T$, 0),
  (v_quiz_id, $T$Quel est l'impact d'un ICP flou sur vos résultats ?$T$, jsonb_build_array($T$Aucun impact, le talent du setter compense$T$, $T$Taux de réponse faible et conversations non qualifiées$T$, $T$Ça augmente le volume de prospects$T$), 1, $T$❌ A) Même le meilleur setter ne peut rien avec un ciblage flou.
✅ B) Un ICP flou donne des résultats flous. Sophie est passée de 8% à 34% en précisant son ICP.
❌ C) Plus large ne veut pas dire plus efficace. La précision bat le volume.$T$, 1);

  -- =========== MODULE 4 — LE SOURCING ===========
  SELECT c.id INTO v_chap_id FROM formation_chapitres c
    JOIN formation_modules m ON m.id = c.module_id
    WHERE m.formation_id = v_formation_id AND m.ordre = 1 AND c.ordre = 1;
  INSERT INTO quizzes (chapitre_id, titre, description, max_errors, status)
    VALUES (v_chap_id, $T$Quiz Setting — Module 4 : Le sourcing$T$, $T$Chaque quiz teste les connaissances clés du module. Choisissez la bonne réponse puis lisez les explications.$T$, 3, 'published')
    RETURNING id INTO v_quiz_id;
  INSERT INTO quiz_questions (quiz_id, question, options, correct_index, explication, ordre) VALUES
  (v_quiz_id, $T$Quelle technique de sourcing avancée permet de trouver des prospects chauds ?$T$, jsonb_build_array($T$Taper des mots clés dans la barre de recherche$T$, $T$Analyser les commentaires sous les posts viraux de votre niche$T$, $T$Acheter une liste d'emails$T$), 1, $T$❌ A) C'est une technique de base, pas avancée.
✅ B) Les personnes qui commentent avec des frustrations sont des prospects chauds. Vous pouvez engager en DM en référençant leur commentaire.
❌ C) Non éthique, non conforme RGPD, et les leads achetés ne sont jamais qualifiés.$T$, 0);

  -- =========== MODULE 5 — PSYCHOLOGIE DU SETTING ===========
  SELECT c.id INTO v_chap_id FROM formation_chapitres c
    JOIN formation_modules m ON m.id = c.module_id
    WHERE m.formation_id = v_formation_id AND m.ordre = 2 AND c.ordre = 0;
  INSERT INTO quizzes (chapitre_id, titre, description, max_errors, status)
    VALUES (v_chap_id, $T$Quiz Setting — Module 5 : Psychologie du setting$T$, $T$Chaque quiz teste les connaissances clés du module. Choisissez la bonne réponse puis lisez les explications.$T$, 3, 'published')
    RETURNING id INTO v_quiz_id;
  INSERT INTO quiz_questions (quiz_id, question, options, correct_index, explication, ordre) VALUES
  (v_quiz_id, $T$Quel levier de Cialdini consiste à donner de la valeur AVANT de demander ?$T$, jsonb_build_array($T$La preuve sociale$T$, $T$La réciprocité$T$, $T$L'aversion à la perte$T$), 1, $T$❌ A) La preuve sociale consiste à montrer les résultats d'autres personnes similaires.
✅ B) Un conseil pertinent crée une dette psychologique positive. Le prospect veut rendre la pareille.
❌ C) L'aversion à la perte joue sur la peur de perdre, pas sur le don de valeur.$T$, 0),
  (v_quiz_id, $T$Quelle est la règle des 70/30 ?$T$, jsonb_build_array($T$Le setter parle 70% du temps$T$, $T$Le prospect parle 70%, le setter 30%$T$, $T$70% du temps en DM, 30% au téléphone$T$), 1, $T$❌ A) C'est l'inverse. Un setter qui parle trop qualifie mal.
✅ B) Plus le prospect parle, mieux il est qualifié. Votre rôle est d'écouter et de poser les bonnes questions.
❌ C) La règle 70/30 concerne le ratio de parole, pas les canaux.$T$, 1);

  -- =========== MODULE 7 — SETTING PAR DM ===========
  SELECT c.id INTO v_chap_id FROM formation_chapitres c
    JOIN formation_modules m ON m.id = c.module_id
    WHERE m.formation_id = v_formation_id AND m.ordre = 3 AND c.ordre = 0;
  INSERT INTO quizzes (chapitre_id, titre, description, max_errors, status)
    VALUES (v_chap_id, $T$Quiz Setting — Module 7 : Setting par DM$T$, $T$Chaque quiz teste les connaissances clés du module. Choisissez la bonne réponse puis lisez les explications.$T$, 3, 'published')
    RETURNING id INTO v_quiz_id;
  INSERT INTO quiz_questions (quiz_id, question, options, correct_index, explication, ordre) VALUES
  (v_quiz_id, $T$Que devez-vous JAMAIS faire dans le premier message DM ?$T$, jsonb_build_array($T$Poser une question ouverte$T$, $T$Pitcher votre offre ou votre programme$T$, $T$Mentionner leur contenu$T$), 1, $T$❌ A) Poser une question est au contraire recommandé.
✅ B) Règle n°1 : JAMAIS de pitch en M1. Créez la relation d'abord.
❌ C) Référencer leur contenu est la base d'un bon M1 personnalisé.$T$, 0),
  (v_quiz_id, $T$À quel moment proposer le RDV dans la séquence 7 messages ?$T$, jsonb_build_array($T$Dès le message 2 si le prospect répond$T$, $T$Au message 7, quand douleur ET désir sont identifiés$T$, $T$Quand le prospect le demande lui-même$T$), 1, $T$❌ A) Trop tôt. Vous n'avez pas encore identifié la douleur ni le désir.
✅ B) Ne proposez le RDV QUE quand la douleur ET le désir sont clairement identifiés.
❌ C) Attendre que le prospect demande = perdre le contrôle de la conversation.$T$, 1),
  (v_quiz_id, $T$Combien de jours d'interaction faut-il sur LinkedIn avant le premier DM ?$T$, jsonb_build_array($T$0, on contacte directement$T$, $T$5 jours$T$, $T$30 jours$T$), 1, $T$❌ A) Sur LinkedIn, contacter froidement sans interaction préalable donne un taux très faible.
✅ B) 5 jours de likes + commentaires avant le DM. Construction de la relation d'abord.
❌ C) 30 jours est trop long. Le prospect vous aura oublié.$T$, 2);

  -- =========== MODULE 8 — SETTING TÉLÉPHONIQUE ===========
  SELECT c.id INTO v_chap_id FROM formation_chapitres c
    JOIN formation_modules m ON m.id = c.module_id
    WHERE m.formation_id = v_formation_id AND m.ordre = 4 AND c.ordre = 0;
  INSERT INTO quizzes (chapitre_id, titre, description, max_errors, status)
    VALUES (v_chap_id, $T$Quiz Setting — Module 8 : Setting téléphonique$T$, $T$Chaque quiz teste les connaissances clés du module. Choisissez la bonne réponse puis lisez les explications.$T$, 3, 'published')
    RETURNING id INTO v_quiz_id;
  INSERT INTO quiz_questions (quiz_id, question, options, correct_index, explication, ordre) VALUES
  (v_quiz_id, $T$Quel est le taux de conversion moyen du setting téléphonique vs DM ?$T$, jsonb_build_array($T$Téléphone 2-5% vs DM 15-25%$T$, $T$Téléphone 15-25% vs DM 2-5%$T$, $T$Ils sont équivalents$T$), 1, $T$❌ A) C'est l'inverse.
✅ B) Le téléphone est le canal le plus puissant grâce à la voix et la connexion directe.
❌ C) Le téléphone convertit 3 à 5 fois plus que le DM.$T$, 0),
  (v_quiz_id, $T$Que faire juste AVANT de proposer le RDV en appel ?$T$, jsonb_build_array($T$Présenter le prix de l'offre$T$, $T$Reformuler la situation du prospect$T$, $T$Envoyer un email récapitulatif$T$), 1, $T$❌ A) Le setter ne parle jamais de prix. C'est le rôle du closer.
✅ B) La reformulation montre que vous avez écouté et crée la confiance nécessaire pour le RDV.
❌ C) L'email vient après la confirmation du RDV, pas avant.$T$, 1);

  -- =========== MODULE 9 — QUALIFICATION BANT+ ===========
  SELECT c.id INTO v_chap_id FROM formation_chapitres c
    JOIN formation_modules m ON m.id = c.module_id
    WHERE m.formation_id = v_formation_id AND m.ordre = 5 AND c.ordre = 0;
  INSERT INTO quizzes (chapitre_id, titre, description, max_errors, status)
    VALUES (v_chap_id, $T$Quiz Setting — Module 9 : Qualification BANT+$T$, $T$Chaque quiz teste les connaissances clés du module. Choisissez la bonne réponse puis lisez les explications.$T$, 3, 'published')
    RETURNING id INTO v_quiz_id;
  INSERT INTO quiz_questions (quiz_id, question, options, correct_index, explication, ordre) VALUES
  (v_quiz_id, $T$Quelle dimension du BANT+ a le poids le plus faible ?$T$, jsonb_build_array($T$Le Budget (25pts)$T$, $T$Le Fit (10pts)$T$, $T$L'Autorité (15pts)$T$), 1, $T$❌ A) Le Budget vaut 25pts, c'est un des plus élevés.
✅ B) Le Fit mesure le contexte de vie. C'est rarement le facteur principal, d'où son poids faible.
❌ C) L'Autorité vaut 15pts. Le Fit est en dessous à 10pts.$T$, 0),
  (v_quiz_id, $T$Un prospect score 40/100. Quelle est la bonne réaction ?$T$, jsonb_build_array($T$Proposer le RDV quand même$T$, $T$Le mettre en nurturing$T$, $T$Le disqualifier définitivement$T$), 1, $T$❌ A) 40/100 = COLD. Forcer le RDV enverrait un prospect non qualifié au closer.
✅ B) 30-49 pts = COLD. Partagez du contenu, gardez le lien. Il passera en WARM avec le temps.
❌ C) On disqualifie en dessous de 30pts. À 40, le besoin est là mais ce n'est pas le moment.$T$, 1),
  (v_quiz_id, $T$Quel profil DISC valorise les données et les chiffres ?$T$, jsonb_build_array($T$Le Dominant (rouge)$T$, $T$L'Influent (jaune)$T$, $T$Le Consciencieux (bleu)$T$), 2, $T$❌ A) Le Dominant veut des résultats rapides, pas nécessairement des données détaillées.
❌ B) L'Influent est motivé par la relation et l'enthousiasme, pas les chiffres.
✅ C) Le Consciencieux est analytique, méthodique. Il veut des données, des études de cas, des preuves.$T$, 2);

  -- =========== MODULE 10 — GESTION DES OBJECTIONS ===========
  SELECT c.id INTO v_chap_id FROM formation_chapitres c
    JOIN formation_modules m ON m.id = c.module_id
    WHERE m.formation_id = v_formation_id AND m.ordre = 5 AND c.ordre = 1;
  INSERT INTO quizzes (chapitre_id, titre, description, max_errors, status)
    VALUES (v_chap_id, $T$Quiz Setting — Module 10 : Gestion des objections$T$, $T$Chaque quiz teste les connaissances clés du module. Choisissez la bonne réponse puis lisez les explications.$T$, 3, 'published')
    RETURNING id INTO v_quiz_id;
  INSERT INTO quiz_questions (quiz_id, question, options, correct_index, explication, ordre) VALUES
  (v_quiz_id, $T$Que signifie le R dans la formule C.A.R.E. ?$T$, jsonb_build_array($T$Répondre$T$, $T$Recadrer$T$, $T$Rassurer$T$), 1, $T$❌ A) Répondre directement à une objection crée une confrontation. Ce n'est pas l'approche C.A.R.E.
✅ B) Recadrer = repositionner l'objection sous un nouvel angle. C'est l'étape clé.
❌ C) Rassurer fait partie de l'étape A (Accuser réception), pas du R.$T$, 0),
  (v_quiz_id, $T$Un prospect dit « je vais y réfléchir ». Quelle est la meilleure réaction ?$T$, jsonb_build_array($T$« D'accord, rappelle-moi quand tu auras décidé »$T$, $T$« Sur quoi exactement tu hésites ? »$T$, $T$« Il n'y a rien à réfléchir, c'est une opportunité unique »$T$), 1, $T$❌ A) Vous perdez le prospect. Il ne rappellera jamais.
✅ B) Clarifier fait émerger la vraie objection. « Je vais réfléchir » cache toujours autre chose.
❌ C) Agressif et manipulateur. Vous détruisez la confiance.$T$, 1),
  (v_quiz_id, $T$Combien de relances maximum après un refus clair ?$T$, jsonb_build_array($T$5 relances$T$, $T$2 relances$T$, $T$0, on passe au suivant immédiatement$T$), 1, $T$❌ A) Trop insistant. Vous passez du setting au harcèlement.
✅ B) 2 relances maximum. Respecter le refus sécurise la relation et votre réputation.
❌ C) Une relance douce peut récupérer un prospect qui avait juste un mauvais timing.$T$, 2);

  -- =========== MODULE 11 — SCRIPTS AVANCÉS ===========
  SELECT c.id INTO v_chap_id FROM formation_chapitres c
    JOIN formation_modules m ON m.id = c.module_id
    WHERE m.formation_id = v_formation_id AND m.ordre = 6 AND c.ordre = 0;
  INSERT INTO quizzes (chapitre_id, titre, description, max_errors, status)
    VALUES (v_chap_id, $T$Quiz Setting — Module 11 : Scripts avancés$T$, $T$Chaque quiz teste les connaissances clés du module. Choisissez la bonne réponse puis lisez les explications.$T$, 3, 'published')
    RETURNING id INTO v_quiz_id;
  INSERT INTO quiz_questions (quiz_id, question, options, correct_index, explication, ordre) VALUES
  (v_quiz_id, $T$Un prospect vous a contacté il y a 3 mois sans donner suite. Comment le relancer ?$T$, jsonb_build_array($T$« Tu n'avais pas répondu, tu es toujours intéressé ? »$T$, $T$« Tu en es où par rapport à [sujet] ? La situation a évolué ? »$T$, $T$« On a une promo en ce moment, ça t'intéresse ? »$T$), 1, $T$❌ A) Reproche implicite. Le prospect se sent jugé.
✅ B) Curiosité sincère, pas de reproche. Vous rouvrez la conversation naturellement.
❌ C) Pitch froid. Vous ne savez même pas si son besoin existe encore.$T$, 0);

  -- =========== MODULE 12 — KPIS & ORGANISATION ===========
  SELECT c.id INTO v_chap_id FROM formation_chapitres c
    JOIN formation_modules m ON m.id = c.module_id
    WHERE m.formation_id = v_formation_id AND m.ordre = 7 AND c.ordre = 0;
  INSERT INTO quizzes (chapitre_id, titre, description, max_errors, status)
    VALUES (v_chap_id, $T$Quiz Setting — Module 12 : KPIs & organisation$T$, $T$Chaque quiz teste les connaissances clés du module. Choisissez la bonne réponse puis lisez les explications.$T$, 3, 'published')
    RETURNING id INTO v_quiz_id;
  INSERT INTO quiz_questions (quiz_id, question, options, correct_index, explication, ordre) VALUES
  (v_quiz_id, $T$Si votre taux de réponse M1 est inférieur à 20%, quel est le problème ?$T$, jsonb_build_array($T$Vous n'envoyez pas assez de DMs$T$, $T$Problème de ciblage ou de personnalisation$T$, $T$La plateforme est saturée$T$), 1, $T$❌ A) Le volume ne compense pas un mauvais ciblage. Envoyer plus de mauvais messages = plus de mauvais résultats.
✅ B) Un taux sous 20% signifie que vos messages ne résonnent pas avec votre cible. Revenez à votre ICP.
❌ C) Le marché n'est pas saturé, il est sophistiqué. Le problème vient de votre approche, pas du marché.$T$, 0),
  (v_quiz_id, $T$Que faire quand vous traversez un plateau (semaine 5-6) ?$T$, jsonb_build_array($T$Abandonner et changer de métier$T$, $T$Doubler le volume de DMs$T$, $T$Analyser vos messages, itérer et ajuster$T$), 2, $T$❌ A) Le plateau est NORMAL. 7 prospects sur 10 ne qualifieront pas. C'est le métier.
❌ B) Plus de volume avec la même approche = mêmes résultats. Il faut analyser, pas accélérer.
✅ C) Revoyez vos messages, identifiez ce qui ne convertit pas, testez de nouvelles approches. Le plateau est une phase d'apprentissage.$T$, 1);

  -- =========== MODULE BONUS — FREELANCE ===========
  SELECT c.id INTO v_chap_id FROM formation_chapitres c
    JOIN formation_modules m ON m.id = c.module_id
    WHERE m.formation_id = v_formation_id AND m.ordre = 8 AND c.ordre = 0;
  INSERT INTO quizzes (chapitre_id, titre, description, max_errors, status)
    VALUES (v_chap_id, $T$Quiz Setting — Module Bonus : Freelance$T$, $T$Chaque quiz teste les connaissances clés du module. Choisissez la bonne réponse puis lisez les explications.$T$, 3, 'published')
    RETURNING id INTO v_quiz_id;
  INSERT INTO quiz_questions (quiz_id, question, options, correct_index, explication, ordre) VALUES
  (v_quiz_id, $T$Quel est l'ICP idéal pour un setter freelance ?$T$, jsonb_build_array($T$Infopreneur avec 500 abonnés et pas d'offre$T$, $T$Infopreneur 5K-100K abonnés, offre à 500€+, contenu régulier$T$, $T$Grande entreprise avec équipe de vente complète$T$), 1, $T$❌ A) Trop petit. Pas assez de volume pour générer des leads.
✅ B) C'est le profil idéal : assez de trafic, une offre monétisable, mais pas de système de conversion.
❌ C) Ils ont déjà des commerciaux. Ils n'ont pas besoin d'un setter freelance.$T$, 0),
  (v_quiz_id, $T$Pourquoi proposer une période test de 14 jours ?$T$, jsonb_build_array($T$Pour travailler gratuitement$T$, $T$Pour prouver votre valeur avec zéro risque pour le client$T$, $T$Parce que 14 jours suffisent pour maîtriser un nouveau client$T$), 1, $T$❌ A) La période test n'est pas gratuite. Vous êtes rémunéré selon le modèle choisi.
✅ B) Le client n'a rien à perdre. Si les résultats sont là, il continue. Sinon, on s'arrête.
❌ C) 14 jours servent à démontrer des premiers résultats, pas à tout maîtriser.$T$, 1);

  -- =========== QUIZ FINAL ===========
  INSERT INTO quizzes (formation_id, titre, description, max_errors, status)
    VALUES (v_formation_id, $T$Quiz Setting — Validation Finale$T$, $T$Ce quiz couvre l'ensemble de la formation. 10 questions. Choisissez la bonne réponse.$T$, 3, 'published')
    RETURNING id INTO v_quiz_id;
  INSERT INTO quiz_questions (quiz_id, question, options, correct_index, explication, ordre) VALUES
  (v_quiz_id, $T$Un prospect dit « j'ai pas le temps ». Selon C.A.R.E., quelle est la première étape ?$T$, jsonb_build_array($T$Recadrer en parlant du ROI$T$, $T$Clarifier : « C'est le temps pour l'appel ou pour l'accompagnement ? »$T$, $T$Engager en proposant un créneau$T$), 1, $T$❌ A) Recadrer est l'étape 3 (R). Vous devez d'abord Clarifier (C).
✅ B) Toujours commencer par comprendre l'objection avant de la traiter.
❌ C) Engager est la dernière étape (E). Vous brûlez 3 étapes.$T$, 0),
  (v_quiz_id, $T$Vous qualifiez un prospect. Besoin = 25pts, Timing = 25pts, Budget = flou (10pts), Autorité = seul (15pts), Fit = bon (8pts). Score ?$T$, jsonb_build_array($T$83/100 — HOT$T$, $T$65/100 — WARM$T$, $T$73/100 — WARM$T$), 0, $T$✅ A) 25+25+10+15+8 = 83. C'est HOT. Proposez le RDV immédiatement.
❌ B) Vérifiez votre calcul : 25+25+10+15+8 = 83, pas 65.
❌ C) Le calcul donne 83, pas 73. Ce prospect est HOT.$T$, 1),
  (v_quiz_id, $T$Quel est le problème avec ce message : « Hey ! Tu veux gagner de l'argent en ligne ? J'ai un programme qui peut t'aider » ?$T$, jsonb_build_array($T$Il est trop court$T$, $T$Il pitche dès le M1, il n'est pas personnalisé, il parle de LUI pas du prospect$T$, $T$Il manque un emoji$T$), 1, $T$❌ A) La longueur n'est pas le problème. C'est le contenu.
✅ B) Triple erreur : pitch en M1, zéro personnalisation, centré sur le setter au lieu du prospect.
❌ C) Les emojis ne sauvent pas un mauvais message.$T$, 2),
  (v_quiz_id, $T$Prospect DISC « Vert (Stable) ». Quelle approche ?$T$, jsonb_build_array($T$Aller vite, parler chiffres, être direct$T$, $T$Créer de l'urgence pour le pousser à décider$T$, $T$Rassurer, donner des garanties, parler accompagnement$T$), 2, $T$❌ A) C'est l'approche pour un Dominant (rouge), pas un Stable.
❌ B) Le Stable déteste la pression. Vous le perdrez immédiatement.
✅ C) Le Stable a besoin de sécurité. Rassurez-le. Pas de pression.$T$, 3),
  (v_quiz_id, $T$Quelle est la structure de l'appel de setting ?$T$, jsonb_build_array($T$Pitch → Objections → Closing → RDV$T$, $T$Ouverture → Diagnostic → Transition + RDV → Confirmation$T$, $T$Présentation → Questions → Vente$T$), 1, $T$❌ A) C'est un appel de vente, pas de setting. Le setter ne pitche pas et ne close pas.
✅ B) Les 4 phases. Le setter écoute, diagnostique, reformule, puis propose le RDV.
❌ C) Le setter ne présente rien et ne vend rien.$T$, 4),
  (v_quiz_id, $T$Warm Outreach vs Cold Outreach : quelle différence ?$T$, jsonb_build_array($T$Warm = prospect qui interagit déjà, Cold = inconnu correspondant à l'ICP$T$, $T$Warm = appel téléphonique, Cold = DM$T$, $T$Aucune différence pratique$T$), 0, $T$✅ A) Warm = likes, commentaires, stories vues. Cold = correspond à l'ICP mais ne vous connaît pas.
❌ B) Warm et Cold sont des types d'approche DM, pas des canaux différents.
❌ C) Le taux de réponse Warm (30-50%) est nettement supérieur au Cold (10-20%).$T$, 5),
  (v_quiz_id, $T$La méthode H-O-C sert à :$T$, jsonb_build_array($T$Qualifier un prospect$T$, $T$Se positionner comme unique dans un marché sophistiqué$T$, $T$Gérer les objections$T$), 1, $T$❌ A) La qualification utilise le BANT+, pas le H-O-C.
✅ B) H = Humain (lien émotionnel), O = Offre (proposition unique), C = Crédibilité (preuves).
❌ C) Les objections utilisent la formule C.A.R.E.$T$, 6),
  (v_quiz_id, $T$Le plan 90 jours : que se passe-t-il aux semaines 5-6 ?$T$, jsonb_build_array($T$Les résultats explosent$T$, $T$Un plateau normal où le taux stagne$T$, $T$Il faut changer de stratégie complètement$T$), 1, $T$❌ A) Les semaines 5-6 sont généralement un plateau. C'est normal.
✅ B) Le plateau est une phase d'apprentissage. Analysez, itérez, ajustez. Ne paniquez pas.
❌ C) Pas de changement radical. Ajustez les messages, pas toute la stratégie.$T$, 7),
  (v_quiz_id, $T$Vous êtes setter freelance. Quel document envoyez-vous après l'appel de 15 min ?$T$, jsonb_build_array($T$Un CV$T$, $T$Une proposition commerciale avec période test$T$, $T$Une facture$T$), 1, $T$❌ A) Vous n'êtes pas employé, vous êtes partenaire commercial.
✅ B) La proposition détaille : qui vous êtes, ce que vous proposez, le modèle de rémunération, et la période test de 14 jours.
❌ C) La facture vient après la période test, pas avant.$T$, 8),
  (v_quiz_id, $T$Quelle est LA règle fondamentale du setting ?$T$, jsonb_build_array($T$Envoyer le maximum de DMs possible$T$, $T$Le setter ne vend pas. Il écoute, comprend et invite.$T$, $T$Toujours closer soi-même si le prospect est chaud$T$), 1, $T$❌ A) Le volume sans qualité ne produit rien. C'est volume ET qualité.
✅ B) Le setter crée la confiance. Le reste suit naturellement.
❌ C) Le setter qualifie et pose le RDV. Le closer vend. Ne confondez jamais les rôles.$T$, 9);

END $MIG$;
