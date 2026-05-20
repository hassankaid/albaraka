-- B4 (20/05/2026) — RPC d'update atomique pour studio_projects.segments_json
--
-- Probleme : quand on lance "Tout generer" sur N segments en parallele,
-- chaque edge function studio-generate-broll fait :
--   1. SELECT segments_json
--   2. mutate localement
--   3. UPDATE segments_json
-- Resultat : le dernier call ecrase les precedents (race condition classique).
-- Symptome : un seul b-roll persiste, les autres "disparaissent" apres apparition.
--
-- Fix : RPC qui (a) locke la row via FOR UPDATE, (b) re-lit segments_json,
-- (c) mute UN segment via jsonb_set en preservant les autres, (d) UPDATE
-- atomiquement. Les calls paralleles sont serialises a la persistence
-- (le travail lourd Claude+fal.ai reste parallele).

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

  v_segments := jsonb_set(
    v_segments,
    ARRAY[v_array_idx::text],
    v_segments->v_array_idx
      || jsonb_build_object(
        'broll_path', p_broll_path,
        'broll_prompt', p_broll_prompt
      )
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

GRANT EXECUTE ON FUNCTION update_studio_segment_broll(uuid, int, text, text)
  TO service_role;

COMMENT ON FUNCTION update_studio_segment_broll IS
  'B4 (20/05/2026) — Update atomique d''un seul segment dans studio_projects.segments_json. Utilise FOR UPDATE pour serialiser les writes paralleles depuis les multiples edge functions studio-generate-broll lancees en parallele (sinon race condition + ecrasement).';
