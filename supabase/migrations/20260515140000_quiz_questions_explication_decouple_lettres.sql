-- Bug : les explications des quiz Setting suivent un format
--   ❌ A) [analyse]
--   ✅ B) [analyse]
--   ❌ C) [analyse]
-- qui référence les lettres A/B/C des positions originales. Mais le frontend
-- shuffle les options à chaque tentative (Fisher-Yates dans QuizPage.tsx) :
-- ce que l'élève voit comme "A" peut être la C originale → l'explication
-- pointe vers la mauvaise option.
--
-- Correctif : on remplace chaque "❌ A)" / "✅ A)" / etc. par le texte de
-- l'option correspondante entre guillemets (« … » — ). Comme ça l'explication
-- suit le contenu de l'option, peu importe la position d'affichage.
--
-- Périmètre : 34 questions, toutes dans la formation Setting, toutes au
-- même format A/B/C (3 options). Identifiées par la présence des 3 lettres
-- "A)" "B)" "C)" dans l'explication. Aucune autre formation n'est touchée.

UPDATE public.quiz_questions
SET
  explication =
    replace(
      replace(
        replace(
          replace(
            replace(
              replace(
                explication,
                '❌ A) ', '❌ « ' || (options->>0) || ' » — '
              ),
              '✅ A) ', '✅ « ' || (options->>0) || ' » — '
            ),
            '❌ B) ', '❌ « ' || (options->>1) || ' » — '
          ),
          '✅ B) ', '✅ « ' || (options->>1) || ' » — '
        ),
        '❌ C) ', '❌ « ' || (options->>2) || ' » — '
      ),
      '✅ C) ', '✅ « ' || (options->>2) || ' » — '
    ),
  updated_at = now()
WHERE explication ~ '\mA\)'
  AND explication ~ '\mB\)'
  AND explication ~ '\mC\)';
