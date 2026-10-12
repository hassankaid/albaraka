-- ─────────────────────────────────────────────────────────────────────────
-- Parcours Setting/Closing : les documents des chapitres Al Baraka (copiés par
-- 20261012130000) passent de lien OneDrive à fichier téléchargeable, comme
-- les autres ressources du 12/10/2026 (20261012120000).
-- 9 ressources : scripts DM et téléphone, objections setting, suivi & KPIs,
-- guide affilié, scripts closing À la carte / Pass AL BARAKA / LIBERTY.
-- Les fichiers ont été déposés dans formation-resources avant cette migration.
-- Les anciens liens (contenu payant) restent hors dépôt, qui est public.
-- Appliqué en base le 12/10/2026.
-- ─────────────────────────────────────────────────────────────────────────

update public.chapitre_ressources r
set type = 'fichier',
    url = 'stockage:' || v.chemin
from (values
  ('8725131c-7408-42ac-bfcd-7b20447c35ae'::uuid, 'e0f8f641-47e4-4575-813d-7cf1e19cef55/4e07068f-OBJECTIONS-SETTING-DM.pdf'),
  ('7cef0530-a43b-4d67-9b99-8f34cc8ae22e'::uuid, '2d908ef9-9389-471b-9602-ef3eac0b6748/cfaa3de1-SUIVI-KPIS.xlsx'),
  ('9aaa942e-be14-42e8-8692-5efff7eac5c4'::uuid, 'ccb6edca-2ead-4a03-ae4f-0efb44c168bc/5e4de85b-SCRIPT-CLOSING-A-LA-CARTE.docx'),
  ('bb74f294-abba-4088-bed0-de95f4c3ccf9'::uuid, '8ad1b35c-0fae-4715-8696-437c1a120f16/23c7aa52-SCRIPT-CLOSING-LIBERTY.docx'),
  ('784a5f71-42c3-4bdc-ba39-281d9531f52e'::uuid, '82856ebc-a2b1-4721-9fab-60ef63095125/0ba64206-SCRIPT-CLOSING-PASS-AL-BARAKA.docx'),
  ('7a4eed03-dbd3-46c4-b0e7-e324a61d9d89'::uuid, '59087fc8-7f60-4a8d-acac-1e5c14190dc2/e52604f3-SCRIPTS-DM-ALBARAKA.pdf'),
  ('738cf999-d861-4151-9703-1aa2c947d990'::uuid, 'dc993554-aaaf-417b-b392-1906cec34ea0/e1edb84c-SCRIPT-APPEL-DECOUVERTE-ADS.pdf'),
  ('0a5f5552-f934-48d4-bd58-bbf787e6a06b'::uuid, 'dc993554-aaaf-417b-b392-1906cec34ea0/fae85a62-SCRIPT-APPEL-DECOUVERTE-ORGANIQUE.pdf'),
  ('9c64c7a5-8216-4c27-8cf2-0cb1b943cec6'::uuid, 'ce381f21-5340-40f4-b51b-cf7d425e4579/7a317628-GUIDE-AL-BARAKA.pdf')
) as v(id, chemin)
where r.id = v.id
  and r.url not like 'stockage:%';
