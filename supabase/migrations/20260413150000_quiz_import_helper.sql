-- Helper d'import de quiz depuis JSON standardisé.
-- Idempotent : si un quiz avec le même titre existe déjà, il est supprimé et recréé (clean slate).

create or replace function public.import_quiz_from_json(p_payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_quiz_id uuid;
  v_titre text := p_payload->>'titre';
  v_desc text := coalesce(p_payload->>'description', '');
  v_max_errors int := coalesce((p_payload->>'max_errors')::int, 3);
  v_status text := coalesce(p_payload->>'status', 'published');
  v_module_id uuid := nullif(p_payload->>'module_id', '')::uuid;
  v_formation_id uuid := nullif(p_payload->>'formation_id', '')::uuid;
  v_question jsonb;
  v_idx int := 0;
begin
  if v_titre is null or v_titre = '' then
    raise exception 'import_quiz_from_json: titre requis';
  end if;

  delete from public.quiz_attempts where quiz_id in (select id from public.quizzes where titre = v_titre);
  delete from public.quiz_questions where quiz_id in (select id from public.quizzes where titre = v_titre);
  delete from public.quizzes where titre = v_titre;

  insert into public.quizzes (titre, description, max_errors, status, module_id, formation_id)
  values (v_titre, v_desc, v_max_errors, v_status, v_module_id, v_formation_id)
  returning id into v_quiz_id;

  for v_question in select * from jsonb_array_elements(p_payload->'questions')
  loop
    insert into public.quiz_questions (quiz_id, question, contexte, options, correct_index, explication, ordre)
    values (
      v_quiz_id,
      v_question->>'question',
      coalesce(v_question->>'contexte', ''),
      coalesce(v_question->'options', '[]'::jsonb),
      coalesce((v_question->>'correct_index')::int, 0),
      coalesce(v_question->>'explication', ''),
      v_idx
    );
    v_idx := v_idx + 1;
  end loop;

  return v_quiz_id;
end;
$$;
