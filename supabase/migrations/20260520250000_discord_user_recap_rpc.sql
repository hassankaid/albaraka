-- D5 v2 (20/05/2026) — RPC admin_discord_user_recap pour vue par élève
--
-- 1 ligne par élève éligible (= avec au moins un pass AL BARAKA ou Liberty actif).
-- Pour chaque élève, renvoie booléens "formation terminée" × 3 + "rôle Discord attribué" × 3
-- + état de la liaison Discord.

CREATE OR REPLACE FUNCTION public.admin_discord_user_recap()
RETURNS TABLE (
  user_id uuid,
  full_name text,
  email text,
  user_role text,
  pass_type text,
  discord_linked boolean,
  discord_username text,
  discord_global_name text,
  discord_avatar text,
  is_guild_member boolean,
  marketing_completed boolean,
  setting_completed boolean,
  closing_completed boolean,
  has_marketing_role boolean,
  has_setting_role boolean,
  has_closing_role boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_marketing_formation uuid := '4949ffda-77d2-450e-adad-83554645af32';
  v_setting_formation uuid := 'e9b91eb6-2612-45eb-b28d-947bfdaad974';
  v_closing_formation uuid := '7e533baa-7b5e-42cf-8473-6a9fd19c318f';
  v_marketing_role text := '1507701731402973265';
  v_setting_role text := '1507702355024416830';
  v_closing_role text := '1507702613225897984';
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ceo') THEN
    RAISE EXCEPTION 'Access denied: CEO only';
  END IF;

  RETURN QUERY
  WITH active_pass_users AS (
    SELECT
      up.user_id,
      -- Si l'user a les 2 passes actifs, on prend Liberty (qui inclut AL BARAKA)
      CASE
        WHEN bool_or(up.pass_type = 'liberty') THEN 'liberty'
        ELSE 'al_baraka'
      END AS pass_type
    FROM user_passes up
    WHERE up.revoked_at IS NULL
    GROUP BY up.user_id
  )
  SELECT
    apu.user_id,
    p.full_name,
    p.email,
    p.role::text AS user_role,
    apu.pass_type,
    (dl.user_id IS NOT NULL) AS discord_linked,
    dl.discord_username,
    dl.discord_global_name,
    dl.discord_avatar,
    dl.is_guild_member,
    COALESCE(get_formation_progress(apu.user_id, v_marketing_formation) >= 100, false) AS marketing_completed,
    COALESCE(get_formation_progress(apu.user_id, v_setting_formation) >= 100, false) AS setting_completed,
    COALESCE(get_formation_progress(apu.user_id, v_closing_formation) >= 100, false) AS closing_completed,
    EXISTS(
      SELECT 1 FROM discord_role_grants drg
      WHERE drg.user_id = apu.user_id
        AND drg.discord_role_id = v_marketing_role
        AND drg.status = 'success'
        AND drg.revoked_at IS NULL
    ) AS has_marketing_role,
    EXISTS(
      SELECT 1 FROM discord_role_grants drg
      WHERE drg.user_id = apu.user_id
        AND drg.discord_role_id = v_setting_role
        AND drg.status = 'success'
        AND drg.revoked_at IS NULL
    ) AS has_setting_role,
    EXISTS(
      SELECT 1 FROM discord_role_grants drg
      WHERE drg.user_id = apu.user_id
        AND drg.discord_role_id = v_closing_role
        AND drg.status = 'success'
        AND drg.revoked_at IS NULL
    ) AS has_closing_role
  FROM active_pass_users apu
  JOIN profiles p ON p.id = apu.user_id
  LEFT JOIN discord_links dl ON dl.user_id = apu.user_id AND dl.unlinked_at IS NULL
  ORDER BY p.full_name NULLS LAST, p.email;
END;
$$;

COMMENT ON FUNCTION public.admin_discord_user_recap IS
  'D5 v2 — Recap vue par eleve : 1 row par eleve avec pass actif + booleens completion formations + roles Discord';
