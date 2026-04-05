
CREATE OR REPLACE FUNCTION public.move_chapitre(
  p_chapitre_id uuid,
  p_target_module_id uuid,
  p_target_ordre int
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_source_module_id uuid;
  v_source_ordre int;
BEGIN
  IF NOT public.is_ceo(v_user_id) THEN
    RAISE EXCEPTION 'Seul le CEO peut déplacer les chapitres';
  END IF;

  SELECT module_id, ordre INTO v_source_module_id, v_source_ordre
  FROM formation_chapitres WHERE id = p_chapitre_id;

  IF v_source_module_id IS NULL THEN
    RAISE EXCEPTION 'Chapter not found';
  END IF;

  IF v_source_module_id = p_target_module_id THEN
    IF p_target_ordre > v_source_ordre THEN
      UPDATE formation_chapitres
        SET ordre = ordre - 1, updated_at = now()
      WHERE module_id = p_target_module_id
        AND ordre > v_source_ordre
        AND ordre <= p_target_ordre;
    ELSIF p_target_ordre < v_source_ordre THEN
      UPDATE formation_chapitres
        SET ordre = ordre + 1, updated_at = now()
      WHERE module_id = p_target_module_id
        AND ordre >= p_target_ordre
        AND ordre < v_source_ordre;
    END IF;
    UPDATE formation_chapitres
      SET ordre = p_target_ordre, updated_at = now()
    WHERE id = p_chapitre_id;
  ELSE
    UPDATE formation_chapitres
      SET ordre = ordre - 1, updated_at = now()
    WHERE module_id = v_source_module_id
      AND ordre > v_source_ordre;

    UPDATE formation_chapitres
      SET ordre = ordre + 1, updated_at = now()
    WHERE module_id = p_target_module_id
      AND ordre >= p_target_ordre;

    UPDATE formation_chapitres
      SET module_id = p_target_module_id,
          ordre = p_target_ordre,
          updated_at = now()
    WHERE id = p_chapitre_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.move_chapitre(uuid, uuid, int) TO authenticated;
