-- ═══════════════════════════════════════════════════════════════════════════
-- Sprint Q — Cap des quiz finaux Marketing Digital (300→100) et Community
-- Management (270→100) sur les 100 questions les plus pertinentes par module.
--
-- Décision : utiliser un soft-delete via colonne `archived_at` au lieu d'un
-- DELETE physique. Avantages :
-- • Préserve l'historique (audit, débriefing futur, rollback simple).
-- • Pas d'impact sur les utilisateurs ayant déjà validé : quiz_attempts.validated
--   est figé et les answers JSONB référencent encore les question_id.
-- • Réversible : il suffit d'un UPDATE pour ré-activer une question.
-- • Index partiel pour garantir les performances de read.
--
-- Mise à jour des hooks frontend dans `src/hooks/useQuizzes.ts` pour filtrer
-- WHERE archived_at IS NULL : useQuizByModule, useQuizByFormation,
-- useQuizByChapitre, useQuizWithQuestions, useCreateQuestion.
--
-- Cette migration a déjà été appliquée sur la BDD live via MCP le 30/05/2026.
-- Le fichier est conservé pour la traçabilité git.
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Colonne archived_at (soft-delete)
ALTER TABLE public.quiz_questions
  ADD COLUMN IF NOT EXISTS archived_at timestamptz NULL;

COMMENT ON COLUMN public.quiz_questions.archived_at IS
  'Soft-delete : NULL = question active, NOT NULL = archivée (préservée pour historique). Voir Sprint Q (30/05/2026).';

-- 2. Index partiel pour performance des reads (filtre WHERE archived_at IS NULL)
CREATE INDEX IF NOT EXISTS idx_quiz_questions_active
  ON public.quiz_questions (quiz_id, ordre)
  WHERE archived_at IS NULL;

-- 3. Archivage Marketing Digital — 200 questions retirées sur 300
-- Tableau des 100 ordres RETENUS (couverture 10 modules × 10 questions, sauf
-- M7+M8 fusionnés à 20 questions).
WITH md_retained AS (
  SELECT unnest(ARRAY[
    -- M1 Fondements (10)
    0, 1, 3, 4, 5, 6, 7, 9, 12, 13,
    -- M2 Psychologie cognitive (10)
    30, 32, 34, 35, 36, 38, 39, 40, 41, 46,
    -- M3 Stratégie contenu (10)
    60, 61, 63, 64, 65, 66, 67, 68, 70, 82,
    -- M4 Profil Instagram (10)
    90, 92, 93, 94, 96, 97, 98, 99, 116, 117,
    -- M5 Réels Stratégie & Création (10)
    120, 122, 123, 125, 126, 128, 130, 131, 132, 137,
    -- M6 Algorithme & Viralité (10)
    150, 151, 152, 153, 155, 156, 160, 161, 169, 171,
    -- M7+M8 Stories + Routines + Niveaux conscience + Boost (20)
    181, 182, 183, 184, 185, 186, 193, 195, 196,
    210, 211, 212,
    213, 214, 215, 216, 217, 220, 225, 238,
    -- M9 Parcours Client (10)
    240, 243, 244, 247, 248, 250, 251, 252, 267, 268,
    -- M10 Analytics, IA & Long terme (10)
    270, 271, 273, 274, 275, 278, 282, 284, 287, 289
  ]) AS ordre
)
UPDATE public.quiz_questions
SET archived_at = now()
WHERE quiz_id = 'da587693-afc2-4c7f-8d24-f811cf5a3a6e'
  AND archived_at IS NULL
  AND ordre NOT IN (SELECT ordre FROM md_retained);

-- 4. Archivage Community Management — 170 questions retirées sur 270
WITH cm_retained AS (
  SELECT unnest(ARRAY[
    -- C-A Identité de Marque & Charte (11)
    0, 9, 26, 30, 54, 68, 78, 100, 157, 166, 196,
    -- C-B Calendrier Éditorial (11)
    11, 27, 35, 92, 93, 124, 148, 170, 177, 190, 201,
    -- C-C Modération & Crise (11)
    7, 8, 34, 75, 83, 108, 112, 127, 149, 211, 261,
    -- C-D Reporting Client (11)
    1, 16, 23, 67, 74, 98, 131, 150, 155, 180, 269,
    -- C-E TikTok & LinkedIn (11)
    25, 33, 36, 42, 44, 86, 111, 133, 138, 173, 210,
    -- C-F Offres, Prix & Packs (11)
    12, 15, 29, 73, 101, 113, 115, 126, 132, 228, 244,
    -- C-G Premiers Clients & Prospection (11)
    51, 56, 58, 60, 69, 79, 91, 121, 145, 218, 222,
    -- C-H Relation Client (12)
    3, 10, 22, 28, 38, 46, 50, 95, 123, 171, 175, 221,
    -- C-I Métier CM & Compétences (11)
    14, 17, 18, 20, 24, 39, 66, 172, 199, 230, 247
  ]) AS ordre
)
UPDATE public.quiz_questions
SET archived_at = now()
WHERE quiz_id = '4c5c7df5-b47f-4a49-b5f5-3f576a7cfa2f'
  AND archived_at IS NULL
  AND ordre NOT IN (SELECT ordre FROM cm_retained);

-- 5. Renumérotation Marketing Digital : ordre 0-99 propre sur les 100 actifs
WITH md_reorder AS (
  SELECT
    id,
    ROW_NUMBER() OVER (ORDER BY ordre) - 1 AS new_ordre
  FROM public.quiz_questions
  WHERE quiz_id = 'da587693-afc2-4c7f-8d24-f811cf5a3a6e'
    AND archived_at IS NULL
)
UPDATE public.quiz_questions q
SET ordre = r.new_ordre
FROM md_reorder r
WHERE q.id = r.id
  AND q.ordre <> r.new_ordre;

-- 6. Renumérotation Community Management : ordre 0-99 propre sur les 100 actifs
WITH cm_reorder AS (
  SELECT
    id,
    ROW_NUMBER() OVER (ORDER BY ordre) - 1 AS new_ordre
  FROM public.quiz_questions
  WHERE quiz_id = '4c5c7df5-b47f-4a49-b5f5-3f576a7cfa2f'
    AND archived_at IS NULL
)
UPDATE public.quiz_questions q
SET ordre = r.new_ordre
FROM cm_reorder r
WHERE q.id = r.id
  AND q.ordre <> r.new_ordre;
