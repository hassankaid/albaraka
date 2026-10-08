-- Une explication par réponse (08/10/2026, parcours setter/closer).
--
-- `explication` reste l'explication générale de la question. `explications`
-- commente chaque réponse : explications[i] s'affiche quand l'élève choisit
-- options[i]. Null = format historique, rien ne change pour ces questions.

alter table public.quiz_questions
  add column if not exists explications jsonb;

alter table public.quiz_questions
  drop constraint if exists quiz_questions_explications_alignees;

alter table public.quiz_questions
  add constraint quiz_questions_explications_alignees check (
    explications is null
    or (
      jsonb_typeof(explications) = 'array'
      and jsonb_array_length(explications) = jsonb_array_length(options)
    )
  );

comment on column public.quiz_questions.explications is
  'Explication par réponse, alignée sur options (explications[i] commente options[i]). Null = une seule explication (colonne explication).';
