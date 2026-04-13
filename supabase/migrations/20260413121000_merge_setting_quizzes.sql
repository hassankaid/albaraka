-- Fusionne les 2 quiz Setting Message (Fondamentaux 62q + Avancé 91q) en un seul "Quiz Setting Message"
-- Les tentatives utilisateurs sont rattachées au quiz fusionné (audit préservé)
-- Décidé avec Sidali : plus de scission F/A sur la page d'entraînement, un seul quiz cohérent.

do $$
declare
  v_fonda uuid := '009efd25-19df-4cc6-98d7-5941e973e4de';
  v_avance uuid := '0b91dcf2-80d8-4988-bd9a-12cce7bdb2a3';
  v_offset int;
begin
  if not exists (select 1 from public.quizzes where id = v_avance) then
    raise notice 'Quiz Setting Avancé déjà fusionné, skip.';
    return;
  end if;

  select coalesce(max(ordre), -1) + 1 into v_offset
  from public.quiz_questions where quiz_id = v_fonda;

  update public.quiz_questions
  set quiz_id = v_fonda,
      ordre = ordre + v_offset
  where quiz_id = v_avance;

  update public.quiz_attempts
  set quiz_id = v_fonda
  where quiz_id = v_avance;

  delete from public.quizzes where id = v_avance;

  update public.quizzes
  set titre = 'Quiz Setting Message',
      description = 'Teste tes connaissances sur le setting (fondamentaux + techniques avancées).',
      updated_at = now()
  where id = v_fonda;
end $$;
