-- Discord Integration v1 (20/05/2026) — Tables OAuth + audit + mapping formation→role
--
-- Brique D2 : on ajoute la liaison user plateforme ↔ identité Discord (via OAuth2),
-- l'audit log des grants de rôles, et la table de mapping formation → rôle Discord.
-- Les triggers SQL qui appellent l'edge function discord-grant-role arrivent en D3.

-- ─── discord_links: user plateforme ↔ identité Discord ──────────────
CREATE TABLE IF NOT EXISTS discord_links (
  user_id uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  discord_user_id text NOT NULL,
  discord_username text NOT NULL,
  discord_global_name text,
  discord_avatar text,
  is_guild_member boolean DEFAULT false,
  linked_at timestamptz NOT NULL DEFAULT now(),
  unlinked_at timestamptz,
  link_source text NOT NULL DEFAULT 'oauth' CHECK (link_source IN ('oauth', 'manual_admin')),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_discord_links_active_discord_user
  ON discord_links(discord_user_id) WHERE unlinked_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_discord_links_discord_user_id
  ON discord_links(discord_user_id);

ALTER TABLE discord_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "discord_links_select_own" ON discord_links;
CREATE POLICY "discord_links_select_own" ON discord_links FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'ceo'
    )
  );

-- ─── discord_role_grants: audit log + idempotence ───────────────────
CREATE TABLE IF NOT EXISTS discord_role_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  discord_user_id text NOT NULL,
  discord_role_id text NOT NULL,
  formation_id uuid REFERENCES formations(id) ON DELETE SET NULL,
  granted_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  reason text NOT NULL,
  source text NOT NULL CHECK (source IN ('auto', 'manual', 'sync', 'hot_check', 'rejoin')),
  granted_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'failed', 'pending')),
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_discord_role_grants_active
  ON discord_role_grants(user_id, discord_role_id)
  WHERE revoked_at IS NULL AND status = 'success';

CREATE INDEX IF NOT EXISTS idx_discord_role_grants_user ON discord_role_grants(user_id);
CREATE INDEX IF NOT EXISTS idx_discord_role_grants_role ON discord_role_grants(discord_role_id);
CREATE INDEX IF NOT EXISTS idx_discord_role_grants_status ON discord_role_grants(status);

ALTER TABLE discord_role_grants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "discord_role_grants_select_own" ON discord_role_grants;
CREATE POLICY "discord_role_grants_select_own" ON discord_role_grants FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'ceo'
    )
  );

-- ─── formation_discord_roles: mapping formation → role Discord ─────
CREATE TABLE IF NOT EXISTS formation_discord_roles (
  formation_id uuid PRIMARY KEY REFERENCES formations(id) ON DELETE CASCADE,
  discord_role_id text NOT NULL,
  discord_role_label text NOT NULL,
  channel_ids text[] DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE formation_discord_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "formation_discord_roles_select" ON formation_discord_roles;
CREATE POLICY "formation_discord_roles_select" ON formation_discord_roles FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "formation_discord_roles_manage_ceo" ON formation_discord_roles;
CREATE POLICY "formation_discord_roles_manage_ceo" ON formation_discord_roles FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ceo'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ceo'));

-- ─── Pré-remplissage du mapping (Marketing, Setting, Closing) ──────
INSERT INTO formation_discord_roles (formation_id, discord_role_id, discord_role_label, channel_ids) VALUES
  ('4949ffda-77d2-450e-adad-83554645af32', '1507701731402973265', '🎓 Marketing', ARRAY['1485599543931179008']),
  ('e9b91eb6-2612-45eb-b28d-947bfdaad974', '1507702355024416830', '🎓 Setting', ARRAY['1503032491118690304', '1447236495789523024']),
  ('7e533baa-7b5e-42cf-8473-6a9fd19c318f', '1507702613225897984', '🎓 Closing', ARRAY['1458554486351073488'])
ON CONFLICT (formation_id) DO UPDATE SET
  discord_role_id = EXCLUDED.discord_role_id,
  discord_role_label = EXCLUDED.discord_role_label,
  channel_ids = EXCLUDED.channel_ids,
  updated_at = now();

COMMENT ON TABLE discord_links IS 'D2 v1 — Liaison user plateforme ↔ identité Discord via OAuth2';
COMMENT ON TABLE discord_role_grants IS 'D2 v1 — Audit log + idempotence des grants/revokes de rôles Discord';
COMMENT ON TABLE formation_discord_roles IS 'D2 v1 — Mapping formation → rôle Discord à attribuer à la complétion';
