-- Auto-libération hebdomadaire des leads apportés non qualifiés.
--
-- Règle métier :
--   - Un lead apporté est assigné à son apporteur jusqu'à la fin de SA
--     semaine d'inscription (lundi → dimanche, Europe/Paris).
--   - Le lundi suivant à minuit, s'il est encore au statut 'a_qualifier',
--     son assigned_to passe à NULL et il rejoint le pool "à traiter".
--   - L'apporteur_id reste : le tag d'apport est conservé (commissions,
--     traçabilité, vue "Mes leads apportés" de l'apporteur).
--
-- Cutoff de démarrage : 2026-05-18 00:00 Europe/Paris. Aucun traitement
-- rétroactif sur les leads existants avant cette date.

-- 1) Colonne de traçabilité de la bascule au pool
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS auto_released_at TIMESTAMPTZ;

-- 2) Index pour les requêtes "Pool à traiter"
CREATE INDEX IF NOT EXISTS idx_leads_pool
  ON public.leads (auto_released_at DESC)
  WHERE auto_released_at IS NOT NULL AND assigned_to IS NULL;

-- 3) Fonction appelée chaque lundi par pg_cron
CREATE OR REPLACE FUNCTION public.release_overdue_apported_leads()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
DECLARE
  v_count INTEGER;
  v_week_start TIMESTAMPTZ;
BEGIN
  v_week_start := (date_trunc('week', now() AT TIME ZONE 'Europe/Paris')) AT TIME ZONE 'Europe/Paris';

  UPDATE public.leads
  SET
    assigned_to = NULL,
    auto_released_at = now(),
    updated_at = now()
  WHERE apporteur_id IS NOT NULL
    AND assigned_to IS NOT NULL
    AND status = 'a_qualifier'
    AND created_at >= TIMESTAMPTZ '2026-05-18 00:00:00+02'
    AND created_at < v_week_start
    AND auto_released_at IS NULL;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$func$;

-- 4) RPC : un collaborateur CONFIRMÉ prend un lead du pool pour le traiter
CREATE OR REPLACE FUNCTION public.claim_lead_from_pool(p_lead_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
DECLARE
  v_caller UUID := auth.uid();
  v_level TEXT;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT collaborateur_level INTO v_level
  FROM public.profiles WHERE id = v_caller;

  IF v_level IS DISTINCT FROM 'confirme' THEN
    RAISE EXCEPTION 'Seuls les collaborateurs confirmés peuvent se servir dans le pool.';
  END IF;

  UPDATE public.leads
  SET
    assigned_to = v_caller,
    updated_at = now()
  WHERE id = p_lead_id
    AND auto_released_at IS NOT NULL
    AND assigned_to IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lead non disponible dans le pool (peut-être déjà pris).';
  END IF;
END;
$func$;

-- 5) RPC : un DISPATCHER (Sabrina, CEO) affecte un lead à un collab/apporteur
CREATE OR REPLACE FUNCTION public.dispatch_lead_to(p_lead_id UUID, p_target_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
DECLARE
  v_caller UUID := auth.uid();
  v_can_assign BOOLEAN;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT (can_assign_leads = true OR role = 'ceo') INTO v_can_assign
  FROM public.profiles WHERE id = v_caller;

  IF NOT COALESCE(v_can_assign, false) THEN
    RAISE EXCEPTION 'Vous n''êtes pas autorisé(e) à affecter des leads.';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_target_user_id AND is_active = true) THEN
    RAISE EXCEPTION 'Utilisateur cible introuvable ou inactif.';
  END IF;

  UPDATE public.leads
  SET
    assigned_to = p_target_user_id,
    updated_at = now()
  WHERE id = p_lead_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lead introuvable.';
  END IF;
END;
$func$;

GRANT EXECUTE ON FUNCTION public.claim_lead_from_pool(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.dispatch_lead_to(UUID, UUID) TO authenticated;

-- 6) Cron lundi 02:00 UTC (3h-4h Europe/Paris, robuste DST)
DO $cron$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'release-overdue-apported-leads') THEN
    PERFORM cron.schedule(
      'release-overdue-apported-leads',
      '0 2 * * 1',
      $job$SELECT public.release_overdue_apported_leads();$job$
    );
  END IF;
END
$cron$;
