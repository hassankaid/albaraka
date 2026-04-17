-- RPC manual_recycle_leads : permet au CEO d'envoyer manuellement des leads
-- dans "À recycler", indépendamment du cron recycle-stale-leads et du
-- recyclage instantané "pas_de_reponse" (RPC recycle_lead_by_setter).
--
-- Usage typique : réassigner les leads d'un setter/apporteur en arrêt.

CREATE OR REPLACE FUNCTION public.manual_recycle_leads(
  p_lead_ids uuid[],
  p_reason text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_role text;
  v_now timestamptz := now();
  v_note text;
  v_recycled_count int := 0;
  v_skipped uuid[] := ARRAY[]::uuid[];
  r RECORD;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;

  SELECT get_user_role() INTO v_role;
  IF v_role <> 'ceo' THEN
    RAISE EXCEPTION 'Seul le CEO peut recycler manuellement des leads';
  END IF;

  IF p_lead_ids IS NULL OR array_length(p_lead_ids, 1) IS NULL THEN
    RETURN jsonb_build_object('recycled_count', 0, 'skipped', '[]'::jsonb);
  END IF;

  v_note := COALESCE(
    'Recyclage manuel par le CEO' || CASE WHEN p_reason IS NOT NULL AND p_reason <> '' THEN ' — ' || p_reason ELSE '' END,
    'Recyclage manuel par le CEO'
  );

  FOR r IN
    SELECT id, assigned_to, status FROM public.leads
    WHERE id = ANY(p_lead_ids)
    FOR UPDATE
  LOOP
    IF r.assigned_to IS NOT NULL THEN
      INSERT INTO public.lead_activities(lead_id, user_id, action, old_value, new_value, note)
      VALUES (r.id, v_caller, 'unassigned', r.assigned_to::text, NULL, 'Désaffecté lors du recyclage manuel par le CEO');
    END IF;

    INSERT INTO public.lead_activities(lead_id, user_id, action, note)
    VALUES (r.id, v_caller, 'recycled', v_note);

    UPDATE public.leads
    SET recycled_at = v_now,
        assigned_to = NULL,
        assigned_at = NULL,
        updated_at  = v_now
    WHERE id = r.id;

    v_recycled_count := v_recycled_count + 1;
  END LOOP;

  v_skipped := ARRAY(
    SELECT x FROM unnest(p_lead_ids) AS x
    WHERE NOT EXISTS (SELECT 1 FROM public.leads l WHERE l.id = x)
  );

  RETURN jsonb_build_object(
    'recycled_count', v_recycled_count,
    'skipped', to_jsonb(v_skipped)
  );
END $$;

GRANT EXECUTE ON FUNCTION public.manual_recycle_leads(uuid[], text) TO authenticated;
