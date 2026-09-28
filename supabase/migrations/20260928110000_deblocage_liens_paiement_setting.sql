-- ─────────────────────────────────────────────────────────────────────────
-- SETTING à 100 % débloque aussi les liens de paiement.
--
-- Appliqué en base le 28/09/2026. Même condition que le rôle Discord
-- « Setting » (get_formation_progress >= 100), pour que les deux se
-- déclenchent au même moment : c'est ce que l'élève attend en terminant.
--
-- ⚠️ Ce déblocage est DÉFINITIF — la ligne n'est jamais retirée. Le pass, lui,
-- se révoque (23 pass révoqués sur 350 à ce jour). La page vérifie donc le
-- pass actif À LA LECTURE en plus de ce déblocage ; sans cela, un élève dont
-- on retire le pass garderait l'accès à vie. Voir la double condition dans
-- src/pages/working/LienDePaiement.tsx, verrouillée par un test.
--
-- Rattrapage appliqué au même moment pour les 33 élèves ayant déjà terminé
-- Setting — le déclencheur ne se déclenche qu'à la validation d'un chapitre,
-- et ils n'en ont plus à valider :
--
--   insert into public.user_feature_unlocks (user_id, feature, unlocked_by)
--   select distinct up.user_id, 'payment_links', 'setting_complete_rattrapage'
--   from user_passes up
--   where up.revoked_at is null
--     and public.get_formation_progress(up.user_id,
--           'e9b91eb6-2612-45eb-b28d-947bfdaad974') >= 100
--   on conflict (user_id, feature) do nothing;
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.unlock_features_on_formation_complete()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_marketing_id uuid := '4949ffda-77d2-450e-adad-83554645af32';
  v_setting_id   uuid := 'e9b91eb6-2612-45eb-b28d-947bfdaad974';
  v_cm_id        uuid := '9eb4a903-ec69-4d4e-be8b-1da855a411f4'; -- COMMUNITY MANAGEMENT
  v_admin_id     uuid := '55ecc5b4-2f0c-41c4-8467-3d6136e886b4'; -- ADMINISTRATIF
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

    -- SETTING 100% -> liens de paiement (catalogue seul, sans coupons ni mode test)
    insert into public.user_feature_unlocks (user_id, feature, unlocked_by)
    values (NEW.user_id, 'payment_links', 'setting_complete')
    on conflict (user_id, feature) do nothing;
  end if;

  -- COMMUNITY MANAGEMENT 100% -> inscription ADMINISTRATIF
  if v_formation_id = v_cm_id
     and coalesce(public.get_formation_progress(NEW.user_id, v_cm_id), 0) >= 100 then
    insert into public.formation_enrollments (user_id, formation_id, source, granted_by)
    values (NEW.user_id, v_admin_id, 'auto_cm_complete', NEW.user_id)
    on conflict (user_id, formation_id) do update set revoked_at = null;
  end if;

  return NEW;
end;
$function$;
