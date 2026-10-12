-- ─────────────────────────────────────────────────────────────────────────
-- Limite de taille des fichiers (12/10/2026).
-- La limite GLOBALE du stockage était de 50 Mo (réglage du projet) : elle écrasait
-- celles des buckets du Studio (1 Go pour les vidéos des élèves, 2 Go pour la
-- banque). Une vidéo iPhone d'une minute ou un rendu Hyperframes de plus de 50 Mo
-- étaient refusés (HTTP 400). La limite globale passe à 2 Go (API de gestion,
-- config/storage fileSizeLimit = 2147483648).
-- Les buckets sans limite propre gardent les 50 Mo qu'ils avaient de fait.
-- Appliqué le 12/10/2026.
-- ─────────────────────────────────────────────────────────────────────────
update storage.buckets set file_size_limit = 52428800
 where id in ('certificates', 'invoices') and file_size_limit is null;
