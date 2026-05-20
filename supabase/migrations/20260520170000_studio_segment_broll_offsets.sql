-- B4 v7 (20/05/2026) — RPC update_studio_segment_broll étendue avec offsets
-- pour support du mode multi-shot Kling 3.0
--
-- Quand un appel multi-shot Kling produit 1 vidéo pour N segments, tous les
-- segments du groupe partagent le même broll_path mais avec des offsets
-- différents (chacun pointe sur sa portion). On stocke ces offsets dans
-- segments_json[i].broll_start_ms et broll_end_ms.
--
-- Le rendu final (B5) utilisera ces offsets pour découper la vidéo de
-- groupe en sous-clips.

CREATE OR REPLACE FUNCTION update_studio_segment_broll(
  p_project_id uuid,
  p_segment_idx int,
  p_broll_path text,
  p_broll_prompt text,
  p_broll_start_ms int DEFAULT NULL,
  p_broll_end_ms int DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_segments jsonb;
  v_array_idx int;
  v_all_ready boolean;
  v_merge jsonb;
BEGIN
  SELECT segments_json INTO v_segments
  FROM studio_projects
  WHERE id = p_project_id
  FOR UPDATE;

  IF v_segments IS NULL OR jsonb_typeof(v_segments) <> 'array' THEN
    RAISE EXCEPTION 'Projet % a un segments_json invalide', p_project_id;
  END IF;

  v_array_idx := NULL;
  FOR i IN 0..jsonb_array_length(v_segments) - 1 LOOP
    IF (v_segments->i->>'idx')::int = p_segment_idx THEN
      v_array_idx := i;
      EXIT;
    END IF;
  END LOOP;

  IF v_array_idx IS NULL THEN
    RAISE EXCEPTION 'Segment idx=% introuvable dans le projet %', p_segment_idx, p_project_id;
  END IF;

  v_merge := '{}'::jsonb;
  IF p_broll_prompt IS NOT NULL THEN
    v_merge := v_merge || jsonb_build_object('broll_prompt', p_broll_prompt);
  END IF;
  IF p_broll_path IS NOT NULL THEN
    v_merge := v_merge || jsonb_build_object('broll_path', p_broll_path);
  END IF;
  IF p_broll_start_ms IS NOT NULL THEN
    v_merge := v_merge || jsonb_build_object('broll_start_ms', p_broll_start_ms);
  END IF;
  IF p_broll_end_ms IS NOT NULL THEN
    v_merge := v_merge || jsonb_build_object('broll_end_ms', p_broll_end_ms);
  END IF;

  v_segments := jsonb_set(
    v_segments,
    ARRAY[v_array_idx::text],
    v_segments->v_array_idx || v_merge
  );

  v_all_ready := NOT EXISTS (
    SELECT 1
    FROM jsonb_array_elements(v_segments) AS s
    WHERE COALESCE(s->>'broll_path', '') = ''
  );

  UPDATE studio_projects
  SET
    segments_json = v_segments,
    status = CASE
      WHEN v_all_ready THEN 'broll_ready'::studio_project_status
      ELSE status
    END,
    updated_at = now()
  WHERE id = p_project_id;

  RETURN jsonb_build_object(
    'segments_json', v_segments,
    'all_ready', v_all_ready
  );
END;
$$;
