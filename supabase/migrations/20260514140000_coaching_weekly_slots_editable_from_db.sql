-- ═══════════════════════════════════════════════════════════════════════════
-- Rend les 4 coachings hebdomadaires éditables depuis la base.
--
-- AVANT
--   Les 4 séances récurrentes (Setting Téléphonique, Créa de contenus,
--   Setting Message, Closing) étaient hardcodées dans le fichier client
--   src/config/coachingSlots.ts. Conséquence : impossible pour l'admin de
--   changer le coach, le jour ou l'heure d'une séance sans redéploiement.
--   Le bug "Saba remplacée par Sabrina" venait de là : l'admin modifiait
--   une autre config (coach_types) sans aucun effet sur le calendrier.
--
-- APRÈS
--   Table coaching_weekly_slots = source de vérité. Le calendrier et les
--   hooks lisent depuis ici. Un éditeur admin (CEO) permet de modifier
--   coach / jour / heure / durée / titre / emoji à la volée.
--
-- NOTE
--   L'id reste un TEXT (slug) car coaching_occurrences.slot_id y fait déjà
--   référence de façon implicite. On préserve les ids existants pour ne
--   pas casser l'historique des occurrences / replays / présences.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.coaching_weekly_slots (
  id               TEXT PRIMARY KEY,
  day              TEXT NOT NULL CHECK (day IN ('Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi','Dimanche')),
  hour             INT  NOT NULL CHECK (hour BETWEEN 0 AND 23),
  minute           INT  NOT NULL DEFAULT 0 CHECK (minute BETWEEN 0 AND 59),
  duration_minutes INT  NOT NULL DEFAULT 90 CHECK (duration_minutes > 0),
  title            TEXT NOT NULL,
  coach            TEXT NOT NULL,
  emoji            TEXT,
  display_order    INT  NOT NULL DEFAULT 0,
  is_active        BOOLEAN NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed : les 4 créneaux actuels (valeurs exactes du fichier coachingSlots.ts).
-- L'admin pourra ensuite ajuster coach/jour/heure depuis l'interface.
INSERT INTO public.coaching_weekly_slots
  (id, day, hour, minute, duration_minutes, title, coach, emoji, display_order)
VALUES
  ('setting-telephonique', 'Lundi',     20, 30, 90, 'Setting Téléphonique', 'Sabrina', '📞', 1),
  ('creation-contenus',    'Vendredi',  19,  0, 90, 'Créa de contenus',     'Miradie', '🎬', 2),
  ('setting-message',      'Samedi',    10,  0, 90, 'Setting Message',      'Saba',    '💬', 3),
  ('closing',              'Dimanche',   9,  0, 90, 'Closing',              'Hedi',    '🎯', 4)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.coaching_weekly_slots ENABLE ROW LEVEL SECURITY;

-- Lecture : tout utilisateur authentifié (le calendrier en a besoin).
CREATE POLICY coaching_weekly_slots_select_authenticated
  ON public.coaching_weekly_slots
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Écriture (INSERT / UPDATE / DELETE) : CEO uniquement.
CREATE POLICY coaching_weekly_slots_ceo_write
  ON public.coaching_weekly_slots
  FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ceo'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ceo'));

-- updated_at auto
CREATE TRIGGER trg_coaching_weekly_slots_updated_at
  BEFORE UPDATE ON public.coaching_weekly_slots
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
