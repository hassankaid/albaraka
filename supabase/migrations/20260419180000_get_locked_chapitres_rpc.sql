-- RPC utilisée côté frontend pour savoir quels chapitres sont verrouillés
-- par un quiz non validé. Règle universelle :
-- - Un chapitre X est verrouillé s'il existe un "gate" (quiz) strictement en amont
--   dans l'ordre formation (module.ordre, chapitre.ordre) qui n'est pas validé
--   par l'utilisateur ET que l'utilisateur n'a pas encore de chapitre_progress sur X
--   (grandfathering des élèves déjà engagés).
-- - Les gates proviennent de deux sources :
--   (1) quizzes.chapitre_id : quiz attaché à un chapitre → blocker = ce chapitre
--   (2) quizzes.module_id   : quiz de fin de module → blocker = dernier chapitre publié de ce module
-- - Les quiz d'entraînement (chapitre_id, module_id et formation_id tous NULL)
--   n'apparaissent pas et n'imposent donc aucune gate.

CREATE OR REPLACE FUNCTION public.get_locked_chapitres(
  p_user_id uuid,
  p_formation_id uuid
) RETURNS TABLE (
  chapitre_id uuid,
  blocker_quiz_id uuid,
  blocker_quiz_titre text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH formation_chapitres_ordered AS (
    SELECT c.id,
           c.module_id,
           ROW_NUMBER() OVER (ORDER BY m.ordre, c.ordre) AS formation_order
    FROM public.formation_chapitres c
    JOIN public.formation_modules m ON m.id = c.module_id
    WHERE m.formation_id = p_formation_id
      AND c.status = 'published'
      AND m.status = 'published'
  ),
  gates AS (
    -- Gates chapitre-level
    SELECT q.chapitre_id AS blocker_chapitre_id,
           q.id AS blocker_quiz_id,
           q.titre AS blocker_quiz_titre
    FROM public.quizzes q
    WHERE q.chapitre_id IS NOT NULL
      AND q.status = 'published'
      AND q.chapitre_id IN (SELECT id FROM formation_chapitres_ordered)

    UNION ALL

    -- Gates module-level (mappées sur le dernier chapitre publié du module)
    SELECT (
      SELECT c.id
      FROM public.formation_chapitres c
      WHERE c.module_id = q.module_id AND c.status = 'published'
      ORDER BY c.ordre DESC
      LIMIT 1
    ) AS blocker_chapitre_id,
    q.id AS blocker_quiz_id,
    q.titre AS blocker_quiz_titre
    FROM public.quizzes q
    JOIN public.formation_modules m ON m.id = q.module_id
    WHERE q.module_id IS NOT NULL
      AND q.status = 'published'
      AND m.formation_id = p_formation_id
  ),
  gates_ordered AS (
    SELECT g.blocker_quiz_id,
           g.blocker_quiz_titre,
           fo.formation_order AS gate_order
    FROM gates g
    JOIN formation_chapitres_ordered fo ON fo.id = g.blocker_chapitre_id
  ),
  -- Pour chaque chapitre X, on récupère la gate la plus récente < X
  blocker_for_each AS (
    SELECT x.id AS chapitre_id,
           (SELECT go.blocker_quiz_id
            FROM gates_ordered go
            WHERE go.gate_order < x.formation_order
            ORDER BY go.gate_order DESC
            LIMIT 1) AS blocker_quiz_id,
           (SELECT go.blocker_quiz_titre
            FROM gates_ordered go
            WHERE go.gate_order < x.formation_order
            ORDER BY go.gate_order DESC
            LIMIT 1) AS blocker_quiz_titre
    FROM formation_chapitres_ordered x
  )
  SELECT b.chapitre_id, b.blocker_quiz_id, b.blocker_quiz_titre
  FROM blocker_for_each b
  WHERE b.blocker_quiz_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.quiz_attempts qa
      WHERE qa.user_id = p_user_id
        AND qa.quiz_id = b.blocker_quiz_id
        AND qa.validated = true
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.chapitre_progress cp
      WHERE cp.user_id = p_user_id AND cp.chapitre_id = b.chapitre_id
    );
$$;

GRANT EXECUTE ON FUNCTION public.get_locked_chapitres(uuid, uuid) TO authenticated;
