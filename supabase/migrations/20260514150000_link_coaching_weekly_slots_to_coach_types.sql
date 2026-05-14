-- ═══════════════════════════════════════════════════════════════════════════
-- Unifie la gestion du coach : un créneau hebdomadaire est désormais rattaché
-- à un "thème de coaching" (coach_types). Le coach est dérivé du thème
-- (coach_types.assigned_coach_id) — une seule source de vérité, partagée
-- entre l'onglet "Coachs" (coaching individuel) et l'onglet "Coachings hebdo"
-- (lives de groupe).
--
-- AVANT
--   coaching_weekly_slots.coach était un texte libre, totalement déconnecté
--   de coach_types.assigned_coach_id. Conséquence : changer le coach du
--   "Closing" demandait 2 modifications dans 2 onglets différents (double
--   saisie signalée par Hassan).
--
-- APRÈS
--   coaching_weekly_slots.coach_type_id → coach_types(id).
--   Le coach affiché vient de coach_types.assigned_coach_id → profiles.
--   La colonne `coach` (texte) est conservée comme fallback pour un
--   éventuel créneau non encore rattaché à un thème.
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.coaching_weekly_slots
  ADD COLUMN IF NOT EXISTS coach_type_id UUID REFERENCES public.coach_types(id) ON DELETE SET NULL;

-- Mapping des 4 créneaux existants vers les thèmes de coaching.
-- Matching par `name` (pas d'id hardcodé). 3 correspondances évidentes ;
-- "Setting Téléphonique" est rattaché à "Appel Découverte" (le setting par
-- téléphone = l'appel de découverte) — ajustable ensuite via l'éditeur.
UPDATE public.coaching_weekly_slots s
SET coach_type_id = ct.id
FROM public.coach_types ct
WHERE (s.id = 'setting-telephonique' AND ct.name = 'appel_decouverte')
   OR (s.id = 'creation-contenus'    AND ct.name = 'creation_contenu')
   OR (s.id = 'setting-message'      AND ct.name = 'setting_message')
   OR (s.id = 'closing'              AND ct.name = 'closing');

CREATE INDEX IF NOT EXISTS idx_coaching_weekly_slots_coach_type
  ON public.coaching_weekly_slots (coach_type_id);
