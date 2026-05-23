-- Discord Integration v1 (20/05/2026) — D3 : trigger SQL grant role à la complétion
--
-- Quand un élève marque le dernier chapitre d'une formation gated comme complété,
-- ce trigger appelle automatiquement l'edge function discord-grant-role qui
-- assigne le rôle Discord correspondant.
--
-- Le trigger fait UN check synchrone (formation_id appartient aux 3 gated)
-- avant d'invoquer net.http_post (async) — on ne paye le coût HTTP que si pertinent.
--
-- Pattern calqué sur unlock_features_on_marketing_complete() (migration parcours).

-- ─── Fonction trigger : check + appel async ─────────────────────────
CREATE OR REPLACE FUNCTION public.discord_grant_on_formation_complete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_formation_id uuid;
  v_progress numeric;
  v_gated_formations uuid[] := ARRAY[
    '4949ffda-77d2-450e-adad-83554645af32',  -- MARKETING DIGITAL
    'e9b91eb6-2612-45eb-b28d-947bfdaad974',  -- SETTING
    '7e533baa-7b5e-42cf-8473-6a9fd19c318f'   -- CLOSING
  ];
  v_anon_key text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0dnN6anpyeWFiamd4eW9idHljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwMDQwODYsImV4cCI6MjA4NzU4MDA4Nn0.Hck5qF0GQ9-KEMvJiuu10-i-9562mEWBOBuHMTG33ZY';
BEGIN
  -- 1. Quelle formation pour ce chapitre ?
  SELECT f.id INTO v_formation_id
  FROM public.formation_chapitres ch
  JOIN public.formation_modules m ON m.id = ch.module_id
  JOIN public.formations f ON f.id = m.formation_id
  WHERE ch.id = NEW.chapitre_id;

  -- 2. Skip si formation pas gated
  IF v_formation_id IS NULL OR NOT (v_formation_id = ANY(v_gated_formations)) THEN
    RETURN NEW;
  END IF;

  -- 3. Check si formation maintenant 100% complète
  SELECT public.get_formation_progress(NEW.user_id, v_formation_id) INTO v_progress;
  IF v_progress IS NULL OR v_progress < 100 THEN
    RETURN NEW;
  END IF;

  -- 4. Appel async edge function (pg_net retourne immédiat avec request_id)
  -- L'edge function gère elle-même la lookup discord_link + idempotence + audit
  PERFORM net.http_post(
    url := 'https://ktvszjzryabjgxyobtyc.supabase.co/functions/v1/discord-grant-role',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_anon_key
    ),
    body := jsonb_build_object(
      'user_id', NEW.user_id,
      'formation_id', v_formation_id,
      'reason', 'formation_completed',
      'source', 'auto'
    )
  );

  RETURN NEW;
END;
$$;

-- ─── Trigger AFTER INSERT sur chapitre_progress ────────────────────
DROP TRIGGER IF EXISTS chapitre_progress_discord_grant ON public.chapitre_progress;
CREATE TRIGGER chapitre_progress_discord_grant
  AFTER INSERT ON public.chapitre_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.discord_grant_on_formation_complete();

COMMENT ON FUNCTION public.discord_grant_on_formation_complete IS
  'D3 v1 — Trigger qui appelle discord-grant-role edge function quand une formation gated (Marketing/Setting/Closing) est terminée à 100%';

-- ─── BACKFILL : marquer en pending les couples (user, formation) ────
-- Pour chaque (user, formation gated) où la formation est 100% complète,
-- on INSERT un grant pending → la cron D4 ou la liaison Discord D2-extended
-- les processera. On évite de spammer net.http_post depuis la migration.
INSERT INTO public.discord_role_grants
  (user_id, discord_user_id, discord_role_id, formation_id, reason, source, status, error_message)
SELECT DISTINCT
  cp.user_id,
  'PENDING_BACKFILL' AS discord_user_id,
  fdr.discord_role_id,
  fdr.formation_id,
  'backfill_existing_completion' AS reason,
  'sync' AS source,
  'pending' AS status,
  'Backfill au déploiement D3 — sera processé par la sync' AS error_message
FROM public.chapitre_progress cp
JOIN public.formation_chapitres ch ON ch.id = cp.chapitre_id
JOIN public.formation_modules m ON m.id = ch.module_id
JOIN public.formation_discord_roles fdr ON fdr.formation_id = m.formation_id
WHERE public.get_formation_progress(cp.user_id, m.formation_id) >= 100
  AND fdr.is_active = true
ON CONFLICT DO NOTHING;

-- Note : la UNIQUE INDEX idx_discord_role_grants_active n'inclut que
-- WHERE revoked_at IS NULL AND status = 'success', donc les pending peuvent
-- coexister avec d'éventuels success existants.

-- ─── Realtime : permet au frontend (useDiscordGrantNotifications) de ────
-- recevoir les INSERTs en temps réel pour afficher le toast d'unlock.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'discord_role_grants'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.discord_role_grants;
  END IF;
END $$;
