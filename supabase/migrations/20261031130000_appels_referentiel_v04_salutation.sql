-- Retours de Sidali du 31/10/2026 sur l'analyse d'appels et la plateforme.
-- 1. Enregistrement non annoncé : erreur légère (1 point), jamais erreur critique ni axe du retour.
-- 2. La salutation s'écrit « Salamou ‘alaykoum » en entier, dans les textes gardés en base.
-- Appliqué en base le 31/10/2026.

update public.appels_referentiels set actif = false where type_appel = 'setting_ads' and actif;

insert into public.appels_referentiels (type_appel, version, contenu, grille, penalite_enregistrement, duree_min_s, duree_max_s, actif)
select type_appel, '0.4',
       replace(contenu,
         'S''il ne l''est pas, le code retire quelques points, ce n''est pas rédhibitoire (décision Sidali G).',
         'S''il ne l''est pas, c''est une erreur légère (décision de Sidali du 31/10) : le code retire 1 point et l''affiche à part. Ne la classe jamais dans erreurs_critiques, axes ou conseil_prioritaire, et ne parle pas d''obligation légale.'),
       grille, 1, duree_min_s, duree_max_s, true
  from public.appels_referentiels
 where type_appel = 'setting_ads' and version = '0.3';

update public.script_phases
   set lines = replace(replace(lines::text, 'Salam aleykoum', 'Salamou ‘alaykoum'), 'Salam [Prénom]', 'Salamou ‘alaykoum [Prénom]')::jsonb
 where lines::text ~ '\mSalam\M';

update public.lead_quiz_configs
   set whatsapp_message = replace(whatsapp_message, 'Salam aleykoum', 'Salamou ‘alaykoum')
 where whatsapp_message ~ '\mSalam aleykoum\M';

update public.agent_knowledge_base
   set content = replace(replace(content, 'Salam aleykoum', 'Salamou ‘alaykoum'), 'Salam [Prénom]', 'Salamou ‘alaykoum [Prénom]')
 where content ~ '\mSalam\M';
