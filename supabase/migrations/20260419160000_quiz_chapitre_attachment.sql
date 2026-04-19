-- Permet d'attacher un quiz à un chapitre précis (en plus de module_id / formation_id).
-- Cas d'usage : quiz de bloc en milieu de formation (ex: Muslim Mindset, 5 blocs sur 11 chapitres).
-- Le quiz est affiché sous la vidéo du chapitre ; sa validation débloque le chapitre suivant.

ALTER TABLE public.quizzes
  ADD COLUMN IF NOT EXISTS chapitre_id uuid
  REFERENCES public.formation_chapitres(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_quizzes_chapitre_id
  ON public.quizzes(chapitre_id)
  WHERE chapitre_id IS NOT NULL;

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
  v_chapitre_id uuid := nullif(p_payload->>'chapitre_id', '')::uuid;
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

  INSERT INTO public.quizzes (titre, description, max_errors, status, module_id, formation_id, chapitre_id)
  VALUES (v_titre, v_desc, v_max_errors, v_status, v_module_id, v_formation_id, v_chapitre_id)
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
