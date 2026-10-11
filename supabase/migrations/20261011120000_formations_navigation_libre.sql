-- ─────────────────────────────────────────────────────────────────────────
-- Navigation libre dans une formation (demande de Sidali, vocal du 11/10/2026).
--
-- Dans les parcours (Setting/Closing, Community Management), l'élève circule
-- librement entre les chapitres : les quiz restent en fin de partie mais ne
-- verrouillent plus la suite. La jauge de progression n'est pas touchée
-- (chapitre_progress / get_formation_progress).
--
-- Interrupteur par formation, désactivé par défaut : les autres formations
-- gardent leur verrouillage par quiz. get_locked_chapitres reprend la
-- définition en production au 11/10/2026 (4 colonnes, chapitres déjà vus jamais
-- reverrouillés) avec une seule condition en plus.
-- ─────────────────────────────────────────────────────────────────────────

alter table public.formations
  add column if not exists navigation_libre boolean not null default false;

comment on column public.formations.navigation_libre is
  'Si vrai, les quiz ne verrouillent pas les chapitres suivants (parcours en navigation libre).';

CREATE OR REPLACE FUNCTION public.get_locked_chapitres(p_user_id uuid, p_formation_id uuid)
 RETURNS TABLE(chapitre_id uuid, blocker_quiz_id uuid, blocker_quiz_titre text, blocker_chapitre_id uuid)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH formation_chapitres_ordered AS (
    SELECT c.id,
           c.module_id,
           ROW_NUMBER() OVER (ORDER BY m.ordre, c.ordre) AS formation_order
    FROM public.formation_chapitres c
    JOIN public.formation_modules m ON m.id = c.module_id
    WHERE m.formation_id = p_formation_id
      AND c.status = 'published'
      AND m.status = 'published'
      -- navigation libre : aucun quiz ne verrouille la suite (la progression reste suivie)
      AND NOT EXISTS (
        SELECT 1 FROM public.formations f
        WHERE f.id = p_formation_id AND f.navigation_libre
      )
  ),
  gates AS (
    SELECT q.chapitre_id AS blocker_chapitre_id,
           q.id AS blocker_quiz_id,
           q.titre AS blocker_quiz_titre
    FROM public.quizzes q
    WHERE q.chapitre_id IS NOT NULL
      AND q.status = 'published'
      AND q.chapitre_id IN (SELECT id FROM formation_chapitres_ordered)
    UNION ALL
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
           g.blocker_chapitre_id,
           fo.formation_order AS gate_order
    FROM gates g
    JOIN formation_chapitres_ordered fo ON fo.id = g.blocker_chapitre_id
  ),
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
            LIMIT 1) AS blocker_quiz_titre,
           (SELECT go.blocker_chapitre_id
            FROM gates_ordered go
            WHERE go.gate_order < x.formation_order
            ORDER BY go.gate_order DESC
            LIMIT 1) AS blocker_chapitre_id
    FROM formation_chapitres_ordered x
  )
  SELECT b.chapitre_id, b.blocker_quiz_id, b.blocker_quiz_titre, b.blocker_chapitre_id
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
$function$;
