-- Seed des 4 coachings de groupe récurrents AL BARAKA
-- Source : PARCOURS_ALBARAKA_PLAN_2.docx (chapitre 5 phase 1)
-- Coach pilote par défaut : Sidali (CEO) — réassignable via AdminCoachingSessions
-- Horizon de matérialisation : 6 mois (aligné sur HORIZON_MONTHS de useGroupCoaching.ts)

do $$
declare
  v_coach_id uuid := '37a05543-77eb-405e-87c8-2cac8d75fa5c'; -- Sidali
  v_rec_id uuid;
  v_until timestamptz := now() + interval '6 months';
begin
  -- Garde d'idempotence : si déjà seedé, on sort
  if exists (
    select 1 from public.group_coaching_recurrences
    where title in (
      'Setting Téléphonique',
      'Création de Contenu',
      'Setting Message',
      'Closing'
    )
  ) then
    raise notice 'Group coaching recurrences already seeded, skipping.';
    return;
  end if;

  -- Lundi 20h30 (Europe/Paris) — Setting Téléphonique
  insert into public.group_coaching_recurrences
    (title, description, coach_user_id, frequency, start_at, duration_minutes, meeting_provider, created_by)
  values
    ('Setting Téléphonique',
     'Coaching hebdomadaire sur les appels de setting (prise de RDV, qualification budget, transition conférence).',
     v_coach_id, 'weekly',
     '2026-04-13 20:30:00+02'::timestamptz,
     90, 'zoom', v_coach_id)
  returning id into v_rec_id;
  perform public.generate_recurrence_occurrences(v_rec_id, v_until);

  -- Mercredi 14h00 — Création de Contenu
  insert into public.group_coaching_recurrences
    (title, description, coach_user_id, frequency, start_at, duration_minutes, meeting_provider, created_by)
  values
    ('Création de Contenu',
     'Coaching hebdomadaire sur la création de contenu (Réels, TikTok, stories, storytelling AL BARAKA).',
     v_coach_id, 'weekly',
     '2026-04-15 14:00:00+02'::timestamptz,
     90, 'zoom', v_coach_id)
  returning id into v_rec_id;
  perform public.generate_recurrence_occurrences(v_rec_id, v_until);

  -- Samedi 10h00 — Setting Message
  insert into public.group_coaching_recurrences
    (title, description, coach_user_id, frequency, start_at, duration_minutes, meeting_provider, created_by)
  values
    ('Setting Message',
     'Coaching hebdomadaire sur le setting DM (messages d''approche, relances, qualification par écrit).',
     v_coach_id, 'weekly',
     '2026-04-18 10:00:00+02'::timestamptz,
     90, 'zoom', v_coach_id)
  returning id into v_rec_id;
  perform public.generate_recurrence_occurrences(v_rec_id, v_until);

  -- Dimanche 09h00 — Closing
  insert into public.group_coaching_recurrences
    (title, description, coach_user_id, frequency, start_at, duration_minutes, meeting_provider, created_by)
  values
    ('Closing',
     'Coaching hebdomadaire sur le closing (scripts À la carte / Pass / LIBERTY, objections, échelle de conviction).',
     v_coach_id, 'weekly',
     '2026-04-19 09:00:00+02'::timestamptz,
     90, 'zoom', v_coach_id)
  returning id into v_rec_id;
  perform public.generate_recurrence_occurrences(v_rec_id, v_until);
end $$;
