-- D5 v1 (20/05/2026) — RPC admin_discord_overview pour la page /admin/discord
--
-- Renvoie 1 row par couple (user lié Discord × formation gated) avec :
--   - identité plateforme (full_name, email, role)
--   - identité Discord (handle, avatar, is_guild_member)
--   - formation (titre, slug, role mappé)
--   - progress de l'user sur la formation
--   - statut du dernier grant (success/failed/pending/none) + erreur si applicable
--
-- Réservé au CEO via guard interne (RAISE EXCEPTION si role != 'ceo').

CREATE OR REPLACE FUNCTION public.admin_discord_overview()
RETURNS TABLE (
  user_id uuid,
  full_name text,
  email text,
  user_role text,
  discord_user_id text,
  discord_username text,
  discord_global_name text,
  discord_avatar text,
  is_guild_member boolean,
  formation_id uuid,
  formation_titre text,
  formation_slug text,
  discord_role_id text,
  discord_role_label text,
  progress_pct numeric,
  grant_status text,
  grant_id uuid,
  grant_reason text,
  grant_source text,
  grant_error text,
  granted_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ceo') THEN
    RAISE EXCEPTION 'Access denied: CEO only';
  END IF;

  RETURN QUERY
  WITH base AS (
    SELECT
      dl.user_id,
      p.full_name,
      p.email,
      p.role::text AS user_role,
      dl.discord_user_id,
      dl.discord_username,
      dl.discord_global_name,
      dl.discord_avatar,
      dl.is_guild_member,
      fdr.formation_id,
      f.titre AS formation_titre,
      f.slug AS formation_slug,
      fdr.discord_role_id,
      fdr.discord_role_label,
      get_formation_progress(dl.user_id, fdr.formation_id) AS progress_pct
    FROM discord_links dl
    JOIN profiles p ON p.id = dl.user_id
    CROSS JOIN formation_discord_roles fdr
    JOIN formations f ON f.id = fdr.formation_id
    WHERE dl.unlinked_at IS NULL
      AND fdr.is_active = true
  ),
  latest_grant AS (
    SELECT DISTINCT ON (drg.user_id, drg.discord_role_id)
      drg.user_id,
      drg.discord_role_id,
      drg.id AS grant_id,
      drg.status,
      drg.reason,
      drg.source,
      drg.error_message,
      drg.granted_at,
      drg.revoked_at
    FROM discord_role_grants drg
    ORDER BY drg.user_id, drg.discord_role_id,
      CASE WHEN drg.revoked_at IS NULL AND drg.status = 'success' THEN 0 ELSE 1 END,
      drg.granted_at DESC
  )
  SELECT
    b.user_id,
    b.full_name,
    b.email,
    b.user_role,
    b.discord_user_id,
    b.discord_username,
    b.discord_global_name,
    b.discord_avatar,
    b.is_guild_member,
    b.formation_id,
    b.formation_titre,
    b.formation_slug,
    b.discord_role_id,
    b.discord_role_label,
    b.progress_pct,
    COALESCE(
      CASE
        WHEN lg.revoked_at IS NOT NULL THEN 'none'
        ELSE lg.status
      END,
      'none'
    ) AS grant_status,
    lg.grant_id,
    lg.reason AS grant_reason,
    lg.source AS grant_source,
    lg.error_message AS grant_error,
    lg.granted_at
  FROM base b
  LEFT JOIN latest_grant lg ON lg.user_id = b.user_id AND lg.discord_role_id = b.discord_role_id
  ORDER BY b.full_name, b.formation_titre;
END;
$$;

COMMENT ON FUNCTION public.admin_discord_overview IS
  'D5 v1 — RPC pour la page admin /admin/discord. Renvoie 1 row par (user lié × formation gated) avec status grant + progress.';
