-- B4 v5 (20/05/2026) — Reference image pour image-to-video anchor
-- + assouplissement de la RPC update_studio_segment_broll pour
-- accepter un appel "planification only" (broll_path=NULL).

ALTER TABLE studio_projects
  ADD COLUMN IF NOT EXISTS reference_image_path text;

COMMENT ON COLUMN studio_projects.reference_image_path IS
  'B4 v5 (20/05/2026) — Photo de reference pour image-to-video anchor. Quand renseignee, studio-generate-broll bascule de text-to-video vers image-to-video Seedance pour garantir la persistance du personnage et la coherence visuelle entre clips.';

-- RPC mise a jour : accepte broll_path NULL pour planifier le prompt
-- sans toucher au chemin de la video. Utilise par studio-plan-brolls.

CREATE OR REPLACE FUNCTION update_studio_segment_broll(
  p_project_id uuid,
  p_segment_idx int,
  p_broll_path text,
  p_broll_prompt text
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
