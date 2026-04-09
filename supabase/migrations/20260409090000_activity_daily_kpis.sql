-- ============================================================================
-- Refonte suivi d'activité : passage hebdomadaire → quotidien
-- ============================================================================
-- 1. Crée la table activity_daily_kpis (source de vérité)
-- 2. Ajoute une vue d'agrégation hebdomadaire activity_weekly_totals
-- 3. Ajoute la colonne daily_target sur activity_objectives + seed
-- 4. Archive l'ancienne table activity_kpis → activity_kpis_legacy
-- ============================================================================

-- ─── 1. Table activity_daily_kpis ──────────────────────────────────────────
CREATE TABLE public.activity_daily_kpis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  entry_date date NOT NULL,
  videos_published integer NOT NULL DEFAULT 0,
  messages_sent integer NOT NULL DEFAULT 0,
  replies_received integer NOT NULL DEFAULT 0,
  appointments integer NOT NULL DEFAULT 0,
  sales_made integer NOT NULL DEFAULT 0,
  ai_feedback text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, entry_date)
);

CREATE INDEX idx_activity_daily_kpis_user_date
  ON public.activity_daily_kpis (user_id, entry_date DESC);

CREATE INDEX idx_activity_daily_kpis_date
  ON public.activity_daily_kpis (entry_date);

ALTER TABLE public.activity_daily_kpis ENABLE ROW LEVEL SECURITY;

-- Lecture : son propre suivi
CREATE POLICY "Users can view own daily kpis" ON public.activity_daily_kpis
  FOR SELECT USING (user_id = auth.uid());

-- Lecture : tous les authentifiés (pour le leaderboard inter-utilisateurs)
CREATE POLICY "Authenticated can read daily kpis for leaderboard"
  ON public.activity_daily_kpis
  FOR SELECT TO authenticated USING (true);

-- Lecture : CEO voit tout (redondant avec la policy précédente mais explicite)
CREATE POLICY "CEO can view all daily kpis" ON public.activity_daily_kpis
  FOR SELECT USING (get_user_role() = 'ceo');

-- Insert : uniquement sa propre ligne, et sur une date de la semaine en cours
CREATE POLICY "Users can insert own daily kpis (current week only)"
  ON public.activity_daily_kpis
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND entry_date >= date_trunc('week', (now() AT TIME ZONE 'Europe/Paris'))::date
    AND entry_date <= (now() AT TIME ZONE 'Europe/Paris')::date
  );

-- Update : uniquement sa propre ligne, et sur une date de la semaine en cours
CREATE POLICY "Users can update own daily kpis (current week only)"
  ON public.activity_daily_kpis
  FOR UPDATE USING (
    user_id = auth.uid()
    AND entry_date >= date_trunc('week', (now() AT TIME ZONE 'Europe/Paris'))::date
    AND entry_date <= (now() AT TIME ZONE 'Europe/Paris')::date
  );

CREATE TRIGGER update_activity_daily_kpis_updated_at
  BEFORE UPDATE ON public.activity_daily_kpis
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ─── 2. Vue d'agrégation hebdomadaire ──────────────────────────────────────
CREATE OR REPLACE VIEW public.activity_weekly_totals AS
SELECT
  user_id,
  date_trunc('week', entry_date)::date  AS week_start,
  SUM(videos_published)::int            AS videos_published,
  SUM(messages_sent)::int               AS messages_sent,
  SUM(replies_received)::int            AS replies_received,
  SUM(appointments)::int                AS appointments,
  SUM(sales_made)::int                  AS sales_made,
  COUNT(*)::int                         AS days_filled
FROM public.activity_daily_kpis
GROUP BY user_id, date_trunc('week', entry_date);

-- Les vues héritent des RLS de leurs tables sources, donc activity_daily_kpis
-- protège déjà les lignes. Permission de lecture explicite pour cohérence :
GRANT SELECT ON public.activity_weekly_totals TO authenticated;

-- ─── 3. Cibles quotidiennes sur activity_objectives ────────────────────────
ALTER TABLE public.activity_objectives
  ADD COLUMN IF NOT EXISTS daily_target integer NOT NULL DEFAULT 0;

UPDATE public.activity_objectives SET daily_target = CASE kpi_key
  WHEN 'videos'       THEN 1
  WHEN 'messages'     THEN 72
  WHEN 'replies'      THEN 2
  WHEN 'appointments' THEN 2
  WHEN 'sales'        THEN 1
  ELSE daily_target
END;

-- ─── 4. Archivage de l'ancienne table hebdomadaire ─────────────────────────
ALTER TABLE public.activity_kpis RENAME TO activity_kpis_legacy;

DROP POLICY IF EXISTS "Users can view own kpis" ON public.activity_kpis_legacy;
DROP POLICY IF EXISTS "Users can insert own kpis" ON public.activity_kpis_legacy;
DROP POLICY IF EXISTS "Users can update own kpis" ON public.activity_kpis_legacy;
DROP POLICY IF EXISTS "Authenticated can read kpis for leaderboard" ON public.activity_kpis_legacy;

-- Le CEO conserve un accès en lecture à l'archive
-- (la policy "CEO can view all kpis" reste valide après le rename)
