-- Analyse d'appels : référentiel Setting ADS v0.5 (12/11/2026).
-- Exigences de la coach Sabrina, validées par elle le 12/11/2026 après son retour sur l'appel de Widad :
-- formulations (réponse vague, petits mots en trop, rebond, budget en entonnoir par tranches, offre en
-- une phrase, temps en question fermée, pas de « ça t'intéresserait ? ») et 8 explications de fin d'appel.
-- L'étape P5/P6 porte une liste et un barème : sa note est calculée par le code (studio/appel.py).
-- Créée INACTIVE : activée après le banc d'essai validé par Sabrina (migration suivante).

insert into public.appels_referentiels (type_appel, version, contenu, grille, penalite_enregistrement, duree_min_s, duree_max_s, actif)
select type_appel, '0.5',
       replace(replace(replace(replace(contenu,
         '· version 0.3 (25/10/2026)',
         '· version 0.5 (12/11/2026)'),
         '| P5/P6 — Confirmation | 20 % | Le prospect est dans le groupe WhatsApp, vérifié pendant l''appel (envoyer le lien seulement s''il n''y est pas : décision Sidali C=A) ; heure et Zoom confirmés |',
         '| P5/P6 — Confirmation | 20 % | Groupe WhatsApp vérifié pendant l''appel (l''y faire entrer s''il n''y est pas), puis les 8 explications de fin d''appel (« Liste à cocher » plus bas). Note CALCULÉE à partir de la liste : 8 sur 8 = 10, 6 ou 7 = 8, 4 ou 5 = 5, 3 ou moins = 3 (un point partiel compte pour moitié). |'),
         '## Calibrage (retour de Sidali sur le premier appel noté : « trop exigeant »)
',
         '## Calibrage (retour de Sidali sur le premier appel noté : « trop exigeant »)
Les exigences du coach (section suivante) priment sur ce calibrage quand les deux se contredisent.
'),
         '## Points administratifs',
         '## Exigences du coach (Sabrina, validées le 12/11/2026) : elles PRIMENT sur le script et sur le calibrage
Elles viennent des corrections réelles de la coach. Quand le script de référence dit autre chose (2 à 3 h par jour, conférence de 2 à 3 h, présentation de l''offre, invitation à la conférence), ce sont elles qui comptent, et ce sont leurs formulations que tu proposes dans « formulation_ideale ».
1. Réponse vague au début (« je ne sais plus », « j''ai rempli plusieurs formulaires ») : la formule attendue est « Oui, effectivement, t''as dû cliquer sur plusieurs pubs. Mais du coup, toi, concrètement, qu''est-ce que tu recherches ? ». Une version approximative (« Ouais, t''as dû cliquer comme ça ») n''est PAS un point fort : c''est un axe (P1).
2. Petits mots en trop : « je voulais savoir… », « est-ce que je pourrais avoir… », « enfin… », reformulations hésitantes. La question se pose directement. Relève-les dans mots_faiblesse et tiens-en compte dans la note de l''étape où ils apparaissent.
3. Rebondir sur la perche : quand le prospect donne une motivation (« faire de l''argent à côté de mon travail »), le setter creuse AVANT de changer de sujet : pourquoi ? dans quel but ? Passer directement à une autre question (son métier…) est un manque : P2 partiel.
4. Budget en entonnoir (P3A) : son métier → « Tu t''en sors ? » → « Tu arrives à mettre un peu de côté chaque mois ? » → « En termes d''économies, tu disposes de quoi concrètement pour te lancer ? » → si c''est flou : « Juste pour avoir un ordre d''idée, t''aurais une petite fourchette ? 500, 1 000, 1 500… ça se situerait où ? ». Quand le prospect esquive, c''est cette fourchette par tranches qu''on propose (de préférence à « tout le monde n''est pas à l''aise à parler d''argent »). Une question budget posée sans entonnoir ni tranches est partielle.
5. L''offre en une phrase : « Nous, on a un écosystème qui accompagne les gens de la communauté à se former et à développer des compétences métier, avec lesquelles ils pourront travailler en ligne. Tout ça, tu le verras en conférence. » S''il demande lesquelles : setting, closing, community management, et le reste est expliqué en conférence. Détailler davantage (coachings, formations, disponibilité des coachs…) est une erreur.
6. Le temps en question fermée (P3B/D) : « Est-ce que tu pourrais te dégager environ 2 h par jour ? C''est ce qu''on préconise. » (2 h, pas 2 à 3 h). « T''as combien de temps ? » appelle toujours « ça dépend » : partiel.
7. La conférence (P4) : ne jamais demander « Est-ce que ça t''intéresserait ? » ou « Ça t''intéresserait d''y participer ? » : le prospect a normalement déjà rejoint le groupe, donc il est intéressé. On vérifie qu''il est bien dans le groupe WhatsApp, et on l''y fait entrer pendant l''appel s''il n''y est pas. Formulation attendue : « Tu as bien rejoint le groupe WhatsApp de la conférence ? » et, s''il n''y est pas : « Rejoins-le maintenant pendant qu''on est ensemble, c''est là que tu recevras le lien. » Ne propose JAMAIS la formule d''invitation du script (« je te propose de t''inviter… Ça dure 2-3h… »).
8. La fin d''appel (P5/P6) : le setter accompagne le prospect avec les 8 explications de la « Liste à cocher ». Si plusieurs manquent, fais-en un axe d''amélioration qui les cite.

## Points administratifs'),
       (select jsonb_agg(case when e->>'code' = 'P5/P6' then e || '{"liste": [{"court": "groupe WhatsApp vérifié", "detail": "Vérifier qu''il est bien dans le groupe WhatsApp (l''y faire entrer pendant l''appel sinon)."}, {"court": "lien envoyé 30 min avant", "detail": "Le lien de la conférence est envoyé dans le groupe 30 min avant."}, {"court": "échange avec Sidali 30 min avant", "detail": "Il peut se connecter 30 min avant pour échanger avec Sidali, le fondateur : se présenter, poser ses questions."}, {"court": "début à 11 h, environ 2 h 30", "detail": "La conférence commence à 11 h et dure environ 2 h 30 : prévoir ce temps-là."}, {"court": "rappel du matin", "detail": "Le setter lui envoie un message de rappel le matin, et il met aussi un rappel de son côté."}, {"court": "appel après la conférence", "detail": "Après la conférence, le setter le contacte pour avoir son retour."}, {"court": "application Zoom", "detail": "Télécharger l''application Zoom à l''avance, pour ne pas perdre de temps le jour J."}, {"court": "prière de consultation", "detail": "Faire sa prière de consultation (istikhara)."}], "bareme": [[8, 10], [6, 8], [4, 5], [0, 3]]}'::jsonb else e end order by o)
          from jsonb_array_elements(grille) with ordinality as t(e, o)),
       penalite_enregistrement, duree_min_s, duree_max_s, false
  from public.appels_referentiels
 where type_appel = 'setting_ads' and version = '0.4'
   and not exists (select 1 from public.appels_referentiels where type_appel = 'setting_ads' and version = '0.5');
