-- Ressources de formation : formats modifiables en plus (demande de Sidali, 12/10/2026 :
-- « il y a des documents qu'ils doivent pouvoir modifier »). Word, Excel et PowerPoint
-- passaient déjà ; on ajoute LibreOffice (odt, ods, odp), RTF et les formats Mac
-- (Pages, Numbers, Keynote). Le type est désormais déduit de l'extension côté
-- plateforme (src/lib/ressourcesFormation.ts) : il correspond à cette liste.
-- Appliqué en base le 12/10/2026.
update storage.buckets
set allowed_mime_types = array[
  'application/pdf',
  'image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/zip', 'application/x-zip-compressed',
  'audio/mpeg', 'audio/mp4', 'audio/x-m4a',
  'text/plain', 'text/csv',
  'application/rtf', 'text/rtf',
  'application/vnd.oasis.opendocument.text',
  'application/vnd.oasis.opendocument.spreadsheet',
  'application/vnd.oasis.opendocument.presentation',
  'application/vnd.apple.pages', 'application/vnd.apple.numbers', 'application/vnd.apple.keynote'
]
where id = 'formation-resources';
