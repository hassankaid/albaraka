-- Référentiel Setting ADS v0.5 (encore inactif) : précision sur l'invitation, après le banc d'essai du
-- 12/11/2026 (l'outil reprochait à l'élève la formule d'invitation du script, alors que seule la question
-- « ça t'intéresserait ? » est une faute pour Sabrina).
update public.appels_referentiels
   set contenu = replace(contenu, 'Ne propose JAMAIS la formule d''invitation du script (« je te propose de t''inviter… Ça dure 2-3h… »).', 'Dans tes formulations idéales, ne propose JAMAIS la formule d''invitation du script (« je te propose de t''inviter… Ça dure 2-3h… ») ; mais ne reproche pas à l''élève de l''avoir employée : seule la question « ça t''intéresserait ? » est une faute.')
 where type_appel = 'setting_ads' and version = '0.5' and not actif;
