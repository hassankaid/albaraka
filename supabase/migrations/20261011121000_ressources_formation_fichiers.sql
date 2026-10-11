-- ─────────────────────────────────────────────────────────────────────────
-- Ressources de formation en fichiers (demande de Sidali, vocal du 11/10/2026).
--
-- Sidali dépose ses documents directement sur la plateforme (comme sur
-- Systeme.io) au lieu de coller des liens ; l'élève les télécharge d'un clic.
--
-- Le stockage « formation-resources » existait (PDF et images, 10 Mo, public).
-- Il devient PRIVÉ : seuls les membres connectés téléchargent, par un lien
-- signé de quelques minutes créé au clic (les règles existantes le permettent
-- déjà : lecture pour authenticated, écriture pour le CEO). La ressource garde
-- le chemin du fichier dans `url`, préfixé « stockage: » (type « fichier »).
--
-- Les 3 fichiers de test d'avril (dont une facture au nom d'une cliente) ont
-- été supprimés le 11/10/2026 par l'API Storage : aucune ressource ne les citait.
-- ─────────────────────────────────────────────────────────────────────────

update storage.buckets
set public = false,
    file_size_limit = 52428800, -- 50 Mo
    allowed_mime_types = array[
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
      'text/plain', 'text/csv'
    ]
where id = 'formation-resources';
