-- ═══════════════════════════════════════════════════════════════════════════
-- Fix RLS : ouvrir la lecture de lead_scoring_responses aux collaborateurs
-- et apporteurs.
--
-- AVANT
--   Seule la policy lead_scoring_responses_ceo_select existait → seuls les
--   CEO pouvaient lire les réponses. Conséquence : quand SABA (collab)
--   ouvre la fiche contact d'un lead qui a rempli le quiz, le composant
--   ContactSheet (et le nouveau LeadScoringPanel) recevait 0 lignes et
--   affichait "Quiz non rempli", même quand le quiz l'était.
--
--   Détecté en testant la nouvelle UI scoring (commit 023122f) : Hassan
--   se connecte en SABA pour consulter norazeboudj74@gmail.com → "Quiz
--   non rempli" alors que la donnée existe bien en base. La RLS bloquait.
--
-- APRÈS
--   Tous les collaborateurs et apporteurs peuvent lire. Le frontend gère
--   le masquage du score + catégorie pour les non-CEO. La donnée elle-
--   même est faiblement sensible (réponses à un questionnaire que le
--   prospect a rempli volontairement) — pas besoin de filtre par lead
--   accessible, le lookup se fait toujours par email du contact que le
--   collab/apporteur consulte déjà légitimement.
-- ═══════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS lead_scoring_responses_collab_apporteur_select ON public.lead_scoring_responses;

CREATE POLICY lead_scoring_responses_collab_apporteur_select
  ON public.lead_scoring_responses
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('collaborateur', 'apporteur')
    )
  );
