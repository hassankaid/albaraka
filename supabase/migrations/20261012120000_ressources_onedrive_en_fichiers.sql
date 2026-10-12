-- ─────────────────────────────────────────────────────────────────────────
-- Ressources OneDrive → fichiers déposés sur la plateforme.
--
-- Demande de Sidali (12/10/2026) : les élèves doivent pouvoir télécharger et
-- modifier les documents (Word, Excel). Les 86 ressources « lien » qui
-- pointaient vers un partage OneDrive deviennent des ressources « fichier »
-- (stockage privé formation-resources, lien signé au clic) :
--   43 parcours Community Management, 20 Marketing Digital,
--   12 Community Management, 6 Personal Branding, 5 Storytelling.
-- Les 43 documents d'origine ont été déposés dans le stockage avant cette
-- migration (un exemplaire par chapitre). Le générateur .html du M6 reste un lien.
--
-- Les anciens liens OneDrive (contenu payant) ne sont pas versionnés : le dépôt
-- est public. Retour arrière : fichier gardé hors dépôt (ressources_onedrive_rollback.sql).
-- Appliqué en base le 12/10/2026.
-- ─────────────────────────────────────────────────────────────────────────

update public.chapitre_ressources r
set type = 'fichier',
    url = 'stockage:' || v.chemin
from (values
  ('23971574-d794-4c0c-a702-3d5e7b3bc807'::uuid, 'e16e0cdd-482e-42bd-9e91-b515db8cede9/d1cc6c48-M1-PROMPT-GENERATEUR-DIAGNOSTIC-1.docx'),
  ('9a12cee0-7ff0-42d5-8277-3ea91dbee377'::uuid, '289acce1-dc47-4f95-92eb-a44b64b95536/7607fac5-M3-PROMPT-GENERATEUR-BRAND-BOARD.docx'),
  ('573c8b94-8d3a-4d2b-a6b2-da7a0648fa69'::uuid, '615f8250-9a10-4e68-8e68-649932b0669e/5af0da15-M2-PROMPT-GENERATEUR-IDENTITE-POSITIONNEMENT.docx'),
  ('eab17ecf-8486-4d42-8205-84cd81235f74'::uuid, '4c6fef16-6f4f-4da6-99c9-289ae88d0af8/a15236bc-M4-STRATEGIE-CONTENU.xlsx'),
  ('bcd5c91b-48b1-4da0-8a3c-64ca3697d0c0'::uuid, 'b6a389ca-e1b9-45ed-a6ff-e9e18357d130/dce4f239-M7-NETWORKING-90-JOURS.xlsx'),
  ('d64ec7cf-b772-431b-8bc2-dada5f9e1d40'::uuid, 'd17a9be5-fdf8-47ab-bae4-751db8c68171/8d41a936-M8-PLAN-90-JOURS.xlsx'),
  ('0ae66bd2-f4aa-4a22-b99a-e9071c53b29d'::uuid, 'a64567be-152a-4d7c-84de-0b46e6750cbe/ec6b3455-M3-Fiche-Persona.docx'),
  ('717cbd42-0054-4a8b-90a6-32b91821c7fa'::uuid, 'c6014cb1-1035-418b-b29a-b802ac811103/05e7a838-M2-Structures-Narratives.docx'),
  ('891f8f58-55a0-416b-96e9-c41336f765c9'::uuid, 'f5e11146-33a2-4c62-a7f5-568c6e07937f/77d948da-M5-Brand-Story-BATMAN.docx'),
  ('6d0e43cf-6834-4ecc-b7ce-8a1be35331c7'::uuid, '014cf223-6ef0-436f-9eda-960991646218/236e2400-M6-Templates-Reseaux-Sociaux.docx'),
  ('6c9044cf-8d36-49c6-a182-bde4018e8361'::uuid, '291fa0a8-146b-491b-b81c-3fae255477ce/47b00e19-M7-Arsenal-Narratif-Vente.docx'),
  ('2fbad160-889f-4777-80ba-51abaeb8cedc'::uuid, 'e7b884c0-3fbe-4987-b1c3-b282420906eb/2dafc4f7-M03-Template-Calendrier-Editorial.docx'),
  ('4c3fd0c1-18c3-4cd8-948b-65d2c6c2a20a'::uuid, '0e3b906b-44f6-4e13-baf3-6a3b00d36055/3b563180-M01-Fiche-Fondements-Ecosysteme.docx'),
  ('506c1b13-e6e5-4427-8e5d-4ab31acbd5bf'::uuid, '48e86352-3b72-475d-a4f3-782dbd199e9d/9b97647a-M02-Fiche-Psychologie.docx'),
  ('6c3b9033-d1a3-4ac0-84b7-170cf1602359'::uuid, 'e7b884c0-3fbe-4987-b1c3-b282420906eb/03bc7755-M03-Fiche-Strategie-Contenu.docx'),
  ('8a7d9268-94e7-41fe-9c32-19c561a38c47'::uuid, '8e7a8833-6379-489c-ba97-fbc77c8b030e/0673b1c0-M04-Checklist-Profil-Instagram.docx'),
  ('0099bbbb-f136-4109-bc3d-c2e0cf76dfe7'::uuid, '8e7a8833-6379-489c-ba97-fbc77c8b030e/bc2704b4-M04-Fiche-Profil-Instagram.docx'),
  ('4d1414b9-f825-42cd-85ac-dfd1f858d499'::uuid, 'c6494fdb-8d3f-44c0-a652-5f0b62ff11aa/d9a38692-M05-Fiche-Reels-Strategie.docx'),
  ('e48ef049-dc83-4ac3-9d72-6b33a64920f0'::uuid, 'c6494fdb-8d3f-44c0-a652-5f0b62ff11aa/4359a866-M05-Banque-50-Hooks.docx'),
  ('3b04a4af-2a44-4af3-a37a-c5a927520e52'::uuid, 'c6494fdb-8d3f-44c0-a652-5f0b62ff11aa/c9296853-M05-Template-Script-Reel.docx'),
  ('40dcfb43-6341-4802-a86b-ab76a76f6f90'::uuid, 'c6494fdb-8d3f-44c0-a652-5f0b62ff11aa/f223f89d-M05-M06-Checklist-Publication.docx'),
  ('ce1dbf51-1888-4f30-8153-acefe1ba623b'::uuid, '148c42b4-fe56-4993-a928-cc0ed204a27f/f650d4a6-M7-Template-Devis-CM.docx'),
  ('1e6f4b14-b175-4511-8778-27453587461f'::uuid, '48f776ca-834b-4d46-a259-9bbd487705d1/49114a1d-M06-Fiche-Algorithme-Viralite.docx'),
  ('9dfaa523-a85c-4717-938c-d872e212bbf9'::uuid, '6161f616-4678-4bb1-bd3a-200374211d8e/10067d37-M07-Planning-Stories.docx'),
  ('c90a4b03-24d9-496f-8919-288d6423725d'::uuid, '6161f616-4678-4bb1-bd3a-200374211d8e/abd7158d-M07-Fiche-Stories-Routines.docx'),
  ('c94a4412-99e2-405d-b7d0-11f090f2f95e'::uuid, '70f05d3f-9bcf-4587-b4c9-dbf80bca3e9b/d1623e37-M08-Guide-Boost-Condense.docx'),
  ('e01a5b0d-2dc8-448a-942d-66c4b9061c35'::uuid, '70f05d3f-9bcf-4587-b4c9-dbf80bca3e9b/2f7f8841-M08-Fiche-Boost-Instagram.docx'),
  ('5da9119c-fd85-455b-81c1-29b3d4787b56'::uuid, 'b5976015-86c0-40f4-8acd-b62d50e059f1/c4fbb438-M7-Template-Presentation-3-Packs.docx'),
  ('1ee4b13c-825e-49b5-8c9a-8bb97847df61'::uuid, 'e54a59e9-18f0-45eb-b65e-5d5a601b320f/245910b6-M09-Fiche-Parcours-Client.docx'),
  ('944fabd9-3301-4d40-919e-157cb46d6e2b'::uuid, 'b5976015-86c0-40f4-8acd-b62d50e059f1/988ea5e4-M7-Template-Devis-CM.docx'),
  ('fa8c013c-bc6b-4a6a-98b3-6db6721763fe'::uuid, '6f94fbf8-9ac2-4d0e-b7ab-a73823cd819b/a459568e-M10-Tracker-Hebdomadaire.docx'),
  ('0e1d0c06-2166-4fe7-b987-e32b20160b76'::uuid, '6f94fbf8-9ac2-4d0e-b7ab-a73823cd819b/9e094418-M10-PROMPTS-IA.docx'),
  ('1b25ab26-8b78-43ff-9911-4de8fd6a5474'::uuid, '6f94fbf8-9ac2-4d0e-b7ab-a73823cd819b/3b8341d9-M10-Fiche-Analytics-IA.docx'),
  ('190c635c-274d-4d2b-8ab0-2a7e79925b06'::uuid, 'da7c1e8e-c2ab-482c-a355-5880f29a5af3/ccd87b2a-M8-Template-Audit-Gratuit.docx'),
  ('73dd8474-2946-49c2-ad51-8843e6eb357e'::uuid, 'cc1ad3eb-4c90-4c56-8878-5fb6f3c4795f/d71be488-M2-Questionnaire-Identite-Marque.docx'),
  ('8938b520-b685-444c-b598-f5a19a0e1370'::uuid, 'cc1ad3eb-4c90-4c56-8878-5fb6f3c4795f/6a0ee48b-M2-Template-Charte-Editoriale.docx'),
  ('a66d8a58-fc28-4667-b602-781726a7eb6b'::uuid, 'af5d1177-0d93-45ca-8a2c-a81bda283b51/525019d0-M3-Prompts-Claude-Carrousels.docx'),
  ('28884a78-610e-46bc-9aaf-921ba280c348'::uuid, 'af5d1177-0d93-45ca-8a2c-a81bda283b51/d1508d7f-M3-Calendrier-Editorial.xlsx'),
  ('49c5ba5e-6346-4046-975a-d99f592c108b'::uuid, 'da7c1e8e-c2ab-482c-a355-5880f29a5af3/668da417-M8-Template-Etude-de-Cas-Portfolio.docx'),
  ('7414b701-b123-46c7-b831-2e2083c33a7d'::uuid, '94f567ac-42bd-4d89-a84a-e557ee86a012/05753528-M4-Guide-Moderation.docx'),
  ('1785d30d-b896-4dad-90a2-50fec0d14375'::uuid, '4918e503-99e6-4c2c-bf72-d980099af97a/b76dec4f-M5-Template-Reporting-Mensuel.docx'),
  ('4b71096f-ab68-413b-affa-6a7a09ba1bb4'::uuid, '936e811b-9a8c-44f0-be81-3698552765f7/715bbe55-M9-Contrat-CM-Freelance.docx'),
  ('d7691945-f583-4a2f-a3db-e1685d207a5f'::uuid, '936e811b-9a8c-44f0-be81-3698552765f7/8cac7fe7-M9-Checklist-Onboarding-Client.docx'),
  ('0cc9de6f-b675-454d-9482-50ddcd5b856e'::uuid, '70f05d3f-9bcf-4587-b4c9-dbf80bca3e9b/f87e965d-M08-5-Niveaux-Conscience-Schwartz.docx'),
  ('c8e6b6b3-c527-4221-a314-3ffe3ae1b0fc'::uuid, '824121e1-bef4-4b01-9d1f-228bfb4235a0/fa849a1d-M1-PROMPT-GENERATEUR-DIAGNOSTIC-1.docx'),
  ('4e5bd041-ba7d-4df8-852f-21d8aa16b317'::uuid, '5c88ad33-8458-4062-bb7c-76cf2d5e16a5/04074bca-M2-PROMPT-GENERATEUR-IDENTITE-POSITIONNEMENT.docx'),
  ('c8f4f21e-7c2c-49e2-8224-41e27232eaa0'::uuid, 'fce0e867-3a0e-4fa1-8a7e-e01a7f8cec36/ff4a3c00-M3-PROMPT-GENERATEUR-BRAND-BOARD.docx'),
  ('316d0746-a3ac-4fb8-af86-f60d98a30bfe'::uuid, 'c97c1b12-7a51-4279-adb7-92e5495b3fc3/633a8df3-M4-STRATEGIE-CONTENU.xlsx'),
  ('4bed9d3b-661f-4749-bcf6-579ba21475ab'::uuid, '46bf899a-4595-405b-b441-511dc188de92/2c8d9360-M7-NETWORKING-90-JOURS.xlsx'),
  ('8e661e7b-f582-4120-a4e6-1ffda5b777b7'::uuid, '7c7602ec-4e6b-4291-a2d5-0d0442db6cc0/528eb4b5-M8-PLAN-90-JOURS.xlsx'),
  ('6a6a244c-2ab0-4c80-8b92-e30a7a7154a8'::uuid, '3231f21b-3454-47c0-a95b-4f519d3d3b0c/1b0423f0-M2-Structures-Narratives.docx'),
  ('67ced218-fef0-4345-a9a9-b47365f4451e'::uuid, '1097541e-310d-4b0f-a4c1-c0e8b4d9e6b8/d1dcc80d-M3-Fiche-Persona.docx'),
  ('81ff5b37-6a65-488e-b56a-e67957efca8e'::uuid, '07953726-a601-45a1-910f-4da07abdf880/4a44fe61-M5-Brand-Story-BATMAN.docx'),
  ('d7add25b-a36b-4ef1-a9f5-c4ae9c797a0c'::uuid, 'd9203baf-f4ce-402d-b1ce-6b04c990e4ce/2bf626c5-M6-Templates-Reseaux-Sociaux.docx'),
  ('a08e0901-94b7-49fb-bd63-5c3d0fef4488'::uuid, '69a5fd40-d7b2-4a3d-a980-b64bb8c204c8/3a01a1d6-M7-Arsenal-Narratif-Vente.docx'),
  ('5d105ef3-692c-4bbf-8993-51a596a434ad'::uuid, 'b034db7b-c9b0-4354-a6c7-cd05d823625d/2f407905-M01-Fiche-Fondements-Ecosysteme.docx'),
  ('063a2fb1-6104-4252-9a31-e3cee5d822f7'::uuid, 'f68dc70f-fd75-4020-a66e-abd75495973d/0ee791cd-M02-Fiche-Psychologie.docx'),
  ('39e0cc30-28f1-46f0-8bca-282019aeb7b1'::uuid, '25077cba-ef7d-4320-88ef-c538df959620/4ed8a6bb-M03-Fiche-Strategie-Contenu.docx'),
  ('a96c0e76-a074-47b5-a30b-03724c2509be'::uuid, '25077cba-ef7d-4320-88ef-c538df959620/8f16359a-M03-Template-Calendrier-Editorial.docx'),
  ('afe3334a-86a9-4393-8a20-fbaf19b96221'::uuid, 'b247af6d-4bbd-4cc8-8312-8b09a918c8e7/3df98fbc-M04-Checklist-Profil-Instagram.docx'),
  ('3d6ea58b-df8e-4532-beef-c484da293344'::uuid, 'b247af6d-4bbd-4cc8-8312-8b09a918c8e7/b9d9bb5f-M04-Fiche-Profil-Instagram.docx'),
  ('04d6a250-2694-462a-a0b6-b5fb728323a8'::uuid, '50ef68ea-4543-4ff3-8c39-d85002d3697e/46ec81ba-M05-Banque-50-Hooks.docx'),
  ('9e7002dc-7ecd-42eb-8fe4-6fb83c3e0f18'::uuid, '50ef68ea-4543-4ff3-8c39-d85002d3697e/4f6a5be2-M05-M06-Checklist-Publication.docx'),
  ('b6632aec-566b-4060-97f5-8204cc9a69cd'::uuid, '50ef68ea-4543-4ff3-8c39-d85002d3697e/48c05143-M05-Fiche-Reels-Strategie.docx'),
  ('c5629eca-fdcb-4a5a-9775-afbf5336f455'::uuid, '50ef68ea-4543-4ff3-8c39-d85002d3697e/e65d256c-M05-Template-Script-Reel.docx'),
  ('74daee22-d6ff-4f32-bf10-82bc3ed8956b'::uuid, '8ffd71ec-989e-4923-870e-ab6162a1bf26/6ff710e2-M06-Fiche-Algorithme-Viralite.docx'),
  ('9e4d2d7d-aa7a-4c93-a073-93c1fde5876a'::uuid, 'ce9841bf-30db-42ea-b351-1e912845b413/a0b8b6f0-M07-Fiche-Stories-Routines.docx'),
  ('a18b51c5-bf7c-46ae-903c-786adc0a0766'::uuid, 'ce9841bf-30db-42ea-b351-1e912845b413/ef021856-M07-Planning-Stories.docx'),
  ('a87b904e-a8be-4c6f-87b2-5057de751a75'::uuid, '04dac88d-8fc9-423f-a76d-84b46dbeb742/4d8cda80-M08-5-Niveaux-Conscience-Schwartz.docx'),
  ('5e7ed4b5-8100-46b2-be96-d04edc545422'::uuid, '04dac88d-8fc9-423f-a76d-84b46dbeb742/36b9d21c-M08-Fiche-Boost-Instagram.docx'),
  ('2e2d745a-81b0-48f0-ad8f-17bcc1c258c4'::uuid, '04dac88d-8fc9-423f-a76d-84b46dbeb742/f470b33f-M08-Guide-Boost-Condense.docx'),
  ('57235b47-a864-4212-bae5-1df9e3aee4ce'::uuid, '4f0da922-cd06-41c7-9c86-1709d837bebc/45139d53-M09-Fiche-Parcours-Client.docx'),
  ('6bbe5c1a-d003-4ebd-86ea-28fbbf0d4c78'::uuid, 'c90eb477-0063-44de-a485-b8e6bcaff94f/b0604870-M10-Fiche-Analytics-IA.docx'),
  ('9b35a725-a914-48fd-89e5-4fde4352a408'::uuid, 'c90eb477-0063-44de-a485-b8e6bcaff94f/eaeaef81-M10-PROMPTS-IA.docx'),
  ('6e990ab6-8a67-411a-b9d9-bf6d2acccd51'::uuid, 'c90eb477-0063-44de-a485-b8e6bcaff94f/37d49ddf-M10-Tracker-Hebdomadaire.docx'),
  ('e38e84ef-212c-4610-ab54-74083157a5ec'::uuid, '1f557c2f-5c5e-4e82-9e8f-09c715eea711/38dcb6f4-M2-Questionnaire-Identite-Marque.docx'),
  ('1fb16cb7-33fe-4bb0-be45-edeaf2374c6c'::uuid, '1f557c2f-5c5e-4e82-9e8f-09c715eea711/8a0434e2-M2-Template-Charte-Editoriale.docx'),
  ('0dc4e1e5-4538-4e23-b074-172221beccf3'::uuid, '4e8f8bfb-94e9-4c99-9fff-f034873e5925/fd41fa61-M3-Calendrier-Editorial.xlsx'),
  ('dcf2835f-b298-4fa5-9611-a81b17a3e7cf'::uuid, '4e8f8bfb-94e9-4c99-9fff-f034873e5925/eca997f6-M3-Prompts-Claude-Carrousels.docx'),
  ('60e48aaa-a6ba-49ca-9c65-dc0e5dc4f075'::uuid, 'a30f99e7-0ea9-4761-bf50-4d20a2bf90c0/057bc513-M4-Guide-Moderation.docx'),
  ('1273a246-837a-4e70-bd24-fa6dc28d76dc'::uuid, '796abc1f-d7a8-4d55-935e-8fcfb92bdbee/e562f89c-M5-Template-Reporting-Mensuel.docx'),
  ('e00d19f2-6b95-42f7-9df1-2f432e9058c4'::uuid, '148c42b4-fe56-4993-a928-cc0ed204a27f/a82789b1-M7-Template-Presentation-3-Packs.docx'),
  ('2777bbb8-cf57-4389-9dda-2b50b51427a3'::uuid, '7b90ed40-712a-4fdf-920e-d892b5203067/a45efbe7-M8-Template-Audit-Gratuit.docx'),
  ('244ab90b-fae7-4e55-b919-2f12d9dd1b0d'::uuid, '7b90ed40-712a-4fdf-920e-d892b5203067/2b5a97ed-M8-Template-Etude-de-Cas-Portfolio.docx'),
  ('ca515954-51b0-4ff0-91c8-dd8bd7ae6a69'::uuid, 'f137fbc9-5a93-4c82-91e3-0d6b1e759c9c/319b3aa7-M9-Checklist-Onboarding-Client.docx'),
  ('e34a09ad-00db-4a26-8452-80b993a61fc3'::uuid, 'f137fbc9-5a93-4c82-91e3-0d6b1e759c9c/ba304f59-M9-Contrat-CM-Freelance.docx')
) as v(id, chemin)
where r.id = v.id
  and r.url not like 'stockage:%';
