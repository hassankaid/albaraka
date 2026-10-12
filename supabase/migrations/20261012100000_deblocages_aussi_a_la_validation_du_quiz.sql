-- ─────────────────────────────────────────────────────────────────────────
-- Déblocages de fin de formation : vérifiés aussi quand un quiz est validé.
--
-- Constat du 12/10/2026 (vocal de Sidali sur Amina Kitoko) : Setting fini,
-- tous ses outils restaient verrouillés. En production, la règle exige la
-- formation complète QUIZ COMPRIS (is_formation_complete_for_user), mais elle
-- n'était vérifiée qu'au moment où un chapitre se termine. Amina a fini son
-- dernier chapitre à 21 h 27 et validé le quiz final à 21 h 35 : à 21 h 27 la
-- formation n'était pas complète, et la validation du quiz ne déclenchait rien.
-- Trois élèves bloqués ainsi (Setting, Marketing Digital, Community Management).
--
-- 1. Les règles sont regroupées dans debloquer_fin_de_formation(élève, formation)
--    (mêmes règles qu'en production au 12/10/2026, inchangées).
-- 2. Elles sont appelées à la fin d'un chapitre (comme avant) ET à la
--    validation d'un quiz (nouveau déclencheur sur quiz_attempts).
-- 3. Rattrapage : chaque élève au pass actif dont une de ces formations est
--    complète reçoit ce qui lui manque.
-- Appliqué en base le 12/10/2026.
-- ─────────────────────────────────────────────────────────────────────────

create or replace function public.debloquer_fin_de_formation(p_user_id uuid, p_formation_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_marketing_id uuid := '4949ffda-77d2-450e-adad-83554645af32';
  v_setting_id   uuid := 'e9b91eb6-2612-45eb-b28d-947bfdaad974';
  v_cm_id        uuid := '9eb4a903-ec69-4d4e-be8b-1da855a411f4';
  v_admin_id     uuid := '55ecc5b4-2f0c-41c4-8467-3d6136e886b4';
begin
  if p_formation_id is null or p_formation_id not in (v_marketing_id, v_setting_id, v_cm_id) then
    return;
  end if;
  if not public.is_formation_complete_for_user(p_user_id, p_formation_id) then
    return;
  end if;

  -- MARKETING DIGITAL complet -> quiz d'organisation
  if p_formation_id = v_marketing_id then
    insert into public.user_feature_unlocks (user_id, feature, unlocked_by)
    values (p_user_id, 'quiz_organisation', 'marketing_digital_complete')
    on conflict (user_id, feature) do nothing;
  end if;

  -- SETTING complet -> page activité + liens de paiement
  if p_formation_id = v_setting_id then
    insert into public.user_feature_unlocks (user_id, feature, unlocked_by)
    values (p_user_id, 'working_activity', 'setting_complete')
    on conflict (user_id, feature) do nothing;
    insert into public.user_feature_unlocks (user_id, feature, unlocked_by)
    values (p_user_id, 'payment_links', 'setting_complete')
    on conflict (user_id, feature) do nothing;
  end if;

  -- COMMUNITY MANAGEMENT complet -> inscription ADMINISTRATIF
  if p_formation_id = v_cm_id then
    insert into public.formation_enrollments (user_id, formation_id, source, granted_by)
    values (p_user_id, v_admin_id, 'auto_cm_complete', p_user_id)
    on conflict (user_id, formation_id) do update set revoked_at = null;
  end if;
end;
$function$;

-- À la fin d'un chapitre (déclencheur existant chapitre_progress_unlock_features)
create or replace function public.unlock_features_on_formation_complete()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_formation_id uuid;
begin
  select m.formation_id into v_formation_id
  from public.formation_chapitres ch
  join public.formation_modules m on m.id = ch.module_id
  where ch.id = NEW.chapitre_id;
  perform public.debloquer_fin_de_formation(NEW.user_id, v_formation_id);
  return NEW;
end;
$function$;

-- À la validation d'un quiz (quiz de chapitre, de module ou final)
create or replace function public.debloquer_apres_quiz_valide()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_formation_id uuid;
begin
  if not coalesce(NEW.validated, false) then
    return NEW;
  end if;
  select coalesce(q.formation_id, mq.formation_id, mc.formation_id) into v_formation_id
  from public.quizzes q
  left join public.formation_modules mq on mq.id = q.module_id
  left join public.formation_chapitres ch on ch.id = q.chapitre_id
  left join public.formation_modules mc on mc.id = ch.module_id
  where q.id = NEW.quiz_id;
  perform public.debloquer_fin_de_formation(NEW.user_id, v_formation_id);
  return NEW;
end;
$function$;

drop trigger if exists quiz_attempts_debloquer_fin_de_formation on public.quiz_attempts;
create trigger quiz_attempts_debloquer_fin_de_formation
  after insert or update of validated on public.quiz_attempts
  for each row execute function public.debloquer_apres_quiz_valide();

-- Rattrapage des élèves déjà bloqués
do $$
declare
  r record;
begin
  for r in
    select distinct up.user_id, f.id as formation_id
    from public.user_passes up
    cross join (values ('4949ffda-77d2-450e-adad-83554645af32'::uuid),
                       ('e9b91eb6-2612-45eb-b28d-947bfdaad974'::uuid),
                       ('9eb4a903-ec69-4d4e-be8b-1da855a411f4'::uuid)) as f(id)
    where up.revoked_at is null
  loop
    perform public.debloquer_fin_de_formation(r.user_id, r.formation_id);
  end loop;
end $$;
