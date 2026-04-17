-- Audit des actions d'accès utilisateur : invitations envoyées, changements
-- d'email, toggles early access (pass et enrollments sont déjà tracés dans
-- user_passes / formation_enrollments).
--
-- Cette table permet d'alimenter la timeline unifiée dans la page
-- /admin/training/access via la RPC get_user_access_timeline().

CREATE TABLE IF NOT EXISTS public.access_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN (
    'invitation_sent', 'email_changed',
    'early_access_granted', 'early_access_revoked',
    'pass_granted', 'pass_revoked',
    'enrollment_granted', 'enrollment_revoked'
  )),
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  performed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_access_audit_log_user_created
  ON public.access_audit_log (user_id, created_at DESC);

ALTER TABLE public.access_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "CEO manages audit log" ON public.access_audit_log;
CREATE POLICY "CEO manages audit log" ON public.access_audit_log
  FOR ALL
  USING (public.get_user_role() = 'ceo')
  WITH CHECK (public.get_user_role() = 'ceo');

DROP POLICY IF EXISTS "Users read own audit log" ON public.access_audit_log;
CREATE POLICY "Users read own audit log" ON public.access_audit_log
  FOR SELECT
  USING (user_id = auth.uid() OR public.get_user_role() = 'ceo');

-- RPC timeline : combine user_passes, formation_enrollments, access_audit_log
-- en une seule vue chronologique par user, utilisée par le dialog Historique.
CREATE OR REPLACE FUNCTION public.get_user_access_timeline(p_user_id uuid)
RETURNS TABLE (
  event_at timestamptz,
  event_type text,
  title text,
  subtitle text,
  performed_by_name text,
  details jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    up.granted_at AS event_at,
    'pass_granted' AS event_type,
    'Pass ' || up.pass_type AS title,
    NULL::text AS subtitle,
    (SELECT full_name FROM profiles WHERE id = up.granted_by) AS performed_by_name,
    jsonb_build_object('pass_type', up.pass_type, 'notes', up.notes) AS details
  FROM user_passes up
  WHERE up.user_id = p_user_id

  UNION ALL

  SELECT
    up.revoked_at, 'pass_revoked',
    'Pass ' || up.pass_type || ' — révoqué', NULL,
    (SELECT full_name FROM profiles WHERE id = up.revoked_by),
    jsonb_build_object('pass_type', up.pass_type)
  FROM user_passes up
  WHERE up.user_id = p_user_id AND up.revoked_at IS NOT NULL

  UNION ALL

  SELECT
    fe.granted_at, 'enrollment_granted',
    (SELECT titre FROM formations WHERE id = fe.formation_id),
    'Formation à la carte ajoutée',
    (SELECT full_name FROM profiles WHERE id = fe.granted_by),
    jsonb_build_object('formation_id', fe.formation_id, 'source', fe.source)
  FROM formation_enrollments fe
  WHERE fe.user_id = p_user_id AND fe.source = 'manual'

  UNION ALL

  SELECT
    fe.revoked_at, 'enrollment_revoked',
    (SELECT titre FROM formations WHERE id = fe.formation_id),
    'Formation à la carte retirée', NULL,
    jsonb_build_object('formation_id', fe.formation_id)
  FROM formation_enrollments fe
  WHERE fe.user_id = p_user_id AND fe.revoked_at IS NOT NULL AND fe.source = 'manual'

  UNION ALL

  SELECT
    al.created_at, al.action,
    CASE al.action
      WHEN 'invitation_sent' THEN 'Invitation envoyée'
      WHEN 'email_changed' THEN 'Email modifié'
      WHEN 'early_access_granted' THEN 'Early access activé'
      WHEN 'early_access_revoked' THEN 'Early access désactivé'
      ELSE al.action
    END,
    CASE al.action
      WHEN 'invitation_sent' THEN COALESCE(al.details->>'recipient_email', '')
        || CASE WHEN (al.details->>'test_mode')::bool THEN ' (test)' ELSE '' END
      WHEN 'email_changed' THEN (al.details->>'old_email') || ' → ' || (al.details->>'new_email')
      ELSE NULL
    END,
    (SELECT full_name FROM profiles WHERE id = al.performed_by),
    al.details
  FROM access_audit_log al
  WHERE al.user_id = p_user_id
    AND al.action IN ('invitation_sent', 'email_changed', 'early_access_granted', 'early_access_revoked')

  ORDER BY event_at DESC NULLS LAST;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_access_timeline(uuid) TO authenticated;
