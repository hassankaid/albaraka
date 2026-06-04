-- Le déblocage `working_activity` (rappel d'activité quotidien "Rappel : ton
-- activité du jour" + accès à la page /working/activity) se fait désormais à la
-- complétion de la formation SETTING, au lieu de MARKETING DIGITAL.
-- `quiz_organisation` reste débloqué à la complétion de MARKETING DIGITAL.
--
-- Appliqué en prod le 2026-06-04. En plus de ce trigger :
--   * backfill : working_activity accordé aux apprenants ayant déjà fini Setting
--     (inclus ci-dessous, idempotent) ;
--   * révocation one-shot (NON rejouée ici, car destructive et spécifique prod) :
--       delete from user_feature_unlocks ufu using profiles p
--       where ufu.feature='working_activity' and p.id=ufu.user_id
--         and p.role='apporteur'
--         and <Setting non terminé>;
--     => 16 apporteurs réalignés (avaient l'accès via Marketing sans avoir fini Setting).

-- IDs formations
--   MARKETING DIGITAL : 4949ffda-77d2-450e-adad-83554645af32
--   SETTING           : e9b91eb6-2612-45eb-b28d-947bfdaad974

drop trigger if exists chapitre_progress_unlock_features on public.chapitre_progress;
drop function if exists public.unlock_features_on_marketing_complete();

create or replace function public.unlock_features_on_formation_complete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_marketing_id uuid := '4949ffda-77d2-450e-adad-83554645af32';
  v_setting_id   uuid := 'e9b91eb6-2612-45eb-b28d-947bfdaad974';
  v_formation_id uuid;
begin
  select f.id into v_formation_id
  from public.formation_chapitres ch
  join public.formation_modules m on m.id = ch.module_id
  join public.formations f on f.id = m.formation_id
  where ch.id = NEW.chapitre_id;

  if v_formation_id is null then
    return NEW;
  end if;

  -- MARKETING DIGITAL 100% -> quiz_organisation
  if v_formation_id = v_marketing_id
     and coalesce(public.get_formation_progress(NEW.user_id, v_marketing_id), 0) >= 100 then
    insert into public.user_feature_unlocks (user_id, feature, unlocked_by)
    values (NEW.user_id, 'quiz_organisation', 'marketing_digital_complete')
    on conflict (user_id, feature) do nothing;
  end if;

  -- SETTING 100% -> working_activity (rappel d'activité + accès page activité)
  if v_formation_id = v_setting_id
     and coalesce(public.get_formation_progress(NEW.user_id, v_setting_id), 0) >= 100 then
    insert into public.user_feature_unlocks (user_id, feature, unlocked_by)
    values (NEW.user_id, 'working_activity', 'setting_complete')
    on conflict (user_id, feature) do nothing;
  end if;

  return NEW;
end;
$$;

create trigger chapitre_progress_unlock_features
  after insert on public.chapitre_progress
  for each row
  execute function public.unlock_features_on_formation_complete();

-- Backfill idempotent : working_activity pour les apprenants ayant terminé Setting
insert into public.user_feature_unlocks (user_id, feature, unlocked_by)
select distinct cp.user_id, 'working_activity', 'setting_complete'
from public.chapitre_progress cp
join public.formation_chapitres ch on ch.id = cp.chapitre_id
join public.formation_modules m on m.id = ch.module_id
where m.formation_id = 'e9b91eb6-2612-45eb-b28d-947bfdaad974'
  and public.get_formation_progress(cp.user_id, 'e9b91eb6-2612-45eb-b28d-947bfdaad974') >= 100
on conflict (user_id, feature) do nothing;
