UPDATE storage.buckets 
SET allowed_mime_types = ARRAY[
  'application/pdf', 
  'image/jpeg', 
  'image/png', 
  'image/webp', 
  'text/plain',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
]
WHERE id = 'ribs';