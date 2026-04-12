-- Affectation des coaches aux 4 coachings récurrents hebdo
-- Miradie → Création de Contenu
-- Saba → Setting Message
-- Sabrina → Setting Téléphonique
-- Hedi → Closing

do $$
declare
  v_miradie uuid := '016f6199-a0a2-468e-8b36-73d815fb7e50';
  v_saba    uuid := '943cbac1-284f-4971-a369-3ffa6cdaf560';
  v_hedi    uuid := '533b3a7f-cec4-4d44-8300-a8cd806ddad3';
  v_sabrina uuid := '071078ef-04ff-4ddc-9a38-f6ba8e6748c4';
begin
  update public.group_coaching_recurrences set coach_user_id = v_sabrina where title = 'Setting Téléphonique';
  update public.group_coaching_recurrences set coach_user_id = v_miradie where title = 'Création de Contenu';
  update public.group_coaching_recurrences set coach_user_id = v_saba    where title = 'Setting Message';
  update public.group_coaching_recurrences set coach_user_id = v_hedi    where title = 'Closing';

  -- Propager sur les sessions futures matérialisées
  update public.group_coaching_sessions s
  set coach_user_id = r.coach_user_id
  from public.group_coaching_recurrences r
  where s.recurrence_id = r.id
    and s.scheduled_at >= now()
    and s.coach_user_id <> r.coach_user_id;
end $$;
