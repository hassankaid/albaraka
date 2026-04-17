-- Anti-biais de position dans les quiz.
-- 1. Helper shuffle_quiz_options : permute options + recalcule correct_index.
-- 2. import_quiz_from_json : auto-shuffle à chaque insertion.
-- 3. Data fix one-shot appliqué via MCP sur les 462 questions "toujours A" (Closing & Objections, Création de Contenu, Setting Message). Backup dans quiz_questions_backup_20260417.

CREATE OR REPLACE FUNCTION public.shuffle_quiz_options(
  p_options jsonb,
  p_correct_index int
) RETURNS TABLE(shuffled_options jsonb, new_correct_index int)
LANGUAGE plpgsql
AS $$
DECLARE
  n int;
  perm int[];
  new_options jsonb := '[]'::jsonb;
  i int; j int; tmp int;
BEGIN
  n := jsonb_array_length(p_options);
  IF n <= 1 THEN
    shuffled_options := p_options;
    new_correct_index := p_correct_index;
    RETURN NEXT;
    RETURN;
  END IF;
  perm := ARRAY(SELECT gs - 1 FROM generate_series(1, n) gs);
  FOR i IN REVERSE n .. 2 LOOP
    j := floor(random() * i)::int + 1;
    tmp := perm[i]; perm[i] := perm[j]; perm[j] := tmp;
  END LOOP;
  FOR i IN 1..n LOOP
    new_options := new_options || jsonb_build_array(p_options->perm[i]);
  END LOOP;
  shuffled_options := new_options;
  new_correct_index := array_position(perm, p_correct_index) - 1;
  RETURN NEXT;
END $$;

CREATE OR REPLACE FUNCTION public.import_quiz_from_json(p_payload jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_quiz_id uuid;
  v_titre text := p_payload->>'titre';
  v_desc text := coalesce(p_payload->>'description', '');
  v_max_errors int := coalesce((p_payload->>'max_errors')::int, 3);
  v_status text := coalesce(p_payload->>'status', 'published');
  v_module_id uuid := nullif(p_payload->>'module_id', '')::uuid;
  v_formation_id uuid := nullif(p_payload->>'formation_id', '')::uuid;
  v_question jsonb;
  v_idx int := 0;
  v_src_options jsonb;
  v_src_correct int;
  v_shuffled record;
BEGIN
  IF v_titre IS NULL OR v_titre = '' THEN
    RAISE EXCEPTION 'import_quiz_from_json: titre requis';
  END IF;

  DELETE FROM public.quiz_attempts WHERE quiz_id IN (SELECT id FROM public.quizzes WHERE titre = v_titre);
  DELETE FROM public.quiz_questions WHERE quiz_id IN (SELECT id FROM public.quizzes WHERE titre = v_titre);
  DELETE FROM public.quizzes WHERE titre = v_titre;

  INSERT INTO public.quizzes (titre, description, max_errors, status, module_id, formation_id)
  VALUES (v_titre, v_desc, v_max_errors, v_status, v_module_id, v_formation_id)
  RETURNING id INTO v_quiz_id;

  FOR v_question IN SELECT * FROM jsonb_array_elements(p_payload->'questions')
  LOOP
    v_src_options := coalesce(v_question->'options', '[]'::jsonb);
    v_src_correct := coalesce((v_question->>'correct_index')::int, 0);
    SELECT * INTO v_shuffled FROM public.shuffle_quiz_options(v_src_options, v_src_correct);

    INSERT INTO public.quiz_questions (quiz_id, question, contexte, options, correct_index, explication, ordre)
    VALUES (
      v_quiz_id,
      v_question->>'question',
      coalesce(v_question->>'contexte', ''),
      v_shuffled.shuffled_options,
      v_shuffled.new_correct_index,
      coalesce(v_question->>'explication', ''),
      v_idx
    );
    v_idx := v_idx + 1;
  END LOOP;

  RETURN v_quiz_id;
END;
$function$;
