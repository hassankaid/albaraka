-- Suppression de la colonne montage_checklist sur content_pieces
-- L'étape 3 du wizard de génération de contenu est désormais purement
-- informative (4 étapes guidées sans checkbox), donc cette colonne devient
-- obsolète.

ALTER TABLE public.content_pieces DROP COLUMN IF EXISTS montage_checklist;
