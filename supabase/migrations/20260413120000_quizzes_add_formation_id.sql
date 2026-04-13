-- Ajoute formation_id nullable sur quizzes pour distinguer les 3 types de quiz :
-- 1. Entraînement libre : module_id NULL AND formation_id NULL (page /training/quiz)
-- 2. Quiz de module : module_id set (validation pédagogique au fil des modules)
-- 3. Quiz de validation finale : formation_id set AND module_id NULL (requis pour valider l'étape VA TE FORMER du parcours AL BARAKA)

alter table public.quizzes
  add column formation_id uuid references public.formations(id) on delete set null;

create index quizzes_formation_id_idx on public.quizzes(formation_id) where formation_id is not null;

alter table public.quizzes
  add constraint quizzes_attachment_exclusive
  check (module_id is null or formation_id is null);
