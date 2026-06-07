-- Communauté / Pass Al Baraka — corrige le blocage "formation terminée mais
-- étape parcours non débloquée" + aligne les quiz de leçon de COMMUNITY MANAGEMENT.
--
-- Contexte (2026-06-07) : des élèves (Abdelraouf, Rachel) avaient tout terminé
-- (chapitres + quiz) sur Community Management mais restaient bloqués, car le
-- déblocage de l'étape parcours "redirect_formation" était UNIQUEMENT déclenché
-- côté front (au moment du quiz OU de la fin de chapitre), dans un try/catch
-- silencieux, sans filet de sécurité. Selon l'ordre des actions, le déblocage
-- pouvait être manqué définitivement.
--
-- De plus, les 9 quiz de leçon de Community Management étaient rattachés au
-- MODULE (module_id) au lieu du CHAPITRE (chapitre_id) comme toutes les autres
-- formations -> l'écran de leçon (lookup par chapitre_id) ne les affichait pas.
--
-- ── Data ops one-shot appliquées en prod le 2026-06-07 (NON rejouées ici) ──
--   a) Re-rattachement des 9 quiz CM : module_id -> chapitre_id (1 chapitre/module) :
--        update quizzes q set chapitre_id = <chapitre du module>, module_id = null
--        where q.module_id in (modules de la formation 9eb4a903-…);
--   b) Backfill : déblocage de toutes les étapes redirect_formation pour les users
--        dont is_formation_complete_for_user() = true (a débloqué Abdelraouf + Rachel ;
--        Bachir reste à 8/9 quiz de leçon -> volontairement non débloqué).

-- 1) Logique de complétion d'une formation (réplique isFormationCompleteForUser)
create or replace function public.is_formation_complete_for_user(p_user uuid, p_formation uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_pub_chapitres int;
  v_chap_done boolean;
  v_quiz_pending int;
begin
  select count(*) into v_pub_chapitres
  from formation_chapitres ch
  join formation_modules m on m.id = ch.module_id
  where m.formation_id = p_formation and ch.status='published' and m.status='published';

  if v_pub_chapitres = 0 then
    return false;
  end if;

  select not exists (
    select 1
    from formation_chapitres ch
    join formation_modules m on m.id = ch.module_id
    where m.formation_id = p_formation and ch.status='published' and m.status='published'
      and not exists (
        select 1 from chapitre_progress cp
        where cp.user_id = p_user and cp.chapitre_id = ch.id
      )
  ) into v_chap_done;

  if not v_chap_done then
    return false;
  end if;

  select count(*) into v_quiz_pending
  from quizzes q
  where q.status='published'
    and (
      q.module_id in (select id from formation_modules where formation_id=p_formation and status='published')
      or q.chapitre_id in (
        select ch.id from formation_chapitres ch
        join formation_modules m on m.id=ch.module_id
        where m.formation_id=p_formation and ch.status='published' and m.status='published'
      )
      or (q.formation_id = p_formation and q.module_id is null)
    )
    and not exists (
      select 1 from quiz_attempts qa
      where qa.user_id = p_user and qa.quiz_id = q.id and qa.validated = true
    );

  return v_quiz_pending = 0;
end;
$$;

-- 2) Débloque l'étape parcours redirect_formation si la formation est finie
create or replace function public.try_complete_parcours_formation(p_user uuid, p_formation uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_formation is null then return; end if;
  if not public.is_formation_complete_for_user(p_user, p_formation) then return; end if;

  insert into parcours_chapitre_progress (user_id, chapitre_id)
  select p_user, pc.id
  from parcours_chapitres pc
  where pc.type = 'redirect_formation'
    and pc.formation_id = p_formation
    and pc.status = 'published'
  on conflict (user_id, chapitre_id) do nothing;
end;
$$;

-- 3) Trigger : quiz validé -> retente le déblocage
create or replace function public.trg_quiz_attempt_parcours()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare v_formation uuid;
begin
  if NEW.validated is distinct from true then return NEW; end if;
  select coalesce(
           q.formation_id,
           (select m.formation_id from formation_modules m where m.id = q.module_id),
           (select m2.formation_id from formation_chapitres ch
              join formation_modules m2 on m2.id = ch.module_id where ch.id = q.chapitre_id)
         )
    into v_formation
  from quizzes q where q.id = NEW.quiz_id;
  perform public.try_complete_parcours_formation(NEW.user_id, v_formation);
  return NEW;
end;
$$;

drop trigger if exists quiz_attempt_parcours_complete on public.quiz_attempts;
create trigger quiz_attempt_parcours_complete
  after insert on public.quiz_attempts
  for each row execute function public.trg_quiz_attempt_parcours();

-- 4) Trigger : chapitre complété -> retente le déblocage
create or replace function public.trg_chapitre_progress_parcours()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare v_formation uuid;
begin
  select m.formation_id into v_formation
  from formation_chapitres ch
  join formation_modules m on m.id = ch.module_id
  where ch.id = NEW.chapitre_id;
  perform public.try_complete_parcours_formation(NEW.user_id, v_formation);
  return NEW;
end;
$$;

drop trigger if exists chapitre_progress_parcours_complete on public.chapitre_progress;
create trigger chapitre_progress_parcours_complete
  after insert on public.chapitre_progress
  for each row execute function public.trg_chapitre_progress_parcours();
