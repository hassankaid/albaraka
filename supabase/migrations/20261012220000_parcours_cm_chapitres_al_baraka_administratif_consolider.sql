-- ─────────────────────────────────────────────────────────────────────────
-- Parcours Community Management : chapitres Al Baraka, Administratif et Consolider
-- (message de Sidali du 12/10/2026).
--
-- « Mettre les chapitres appropriés du parcours Al Baraka à la fin de chaque partie
--   (ex : les chapitres Al Baraka sur le marketing à la fin de la partie marketing du
--   parcours CM, idem pour les autres). Reprendre ensuite la partie 3 et 4 du parcours
--   setter closer et la copier à la fin du parcours CM. »
--
-- Comme pour le parcours Setting/Closing (choix validés le 12/10) : les chapitres Al
-- Baraka vont juste avant le chapitre de fin de la partie (« Validation finale », ou
-- « L'intention sincère + Conclusion » en partie 0), sans les « Introduction » de
-- phase, les « VA TE FORMER → » (la formation est déjà dans le parcours) ni les jalons.
--   PARTIE 0 — MUSLIM MINDSET      ← phase 1 Fondations : Ch. 8 « Le mindset de l'affilié »
--   PARTIE 1 — PERSONAL BRANDING   ← phase 2 : Ch. 3, Ch. 4
--   PARTIE 2 — STORYTELLING        ← phase 3 : Ch. 3
--   PARTIE 3 — MARKETING DIGITAL   ← phase 4 : Ch. 3
--   PARTIE 4 — COMMUNITY MANAGEMENT← phase 5 : Ch. 3
--   PARTIE 5 — ADMINISTRATIF       = copie de la partie 3 du parcours Setting/Closing
--   PARTIE 6 — CONSOLIDER          = copie de la partie 4 du parcours Setting/Closing
-- Tout est copié (vidéos, ressources, quiz) ; les sources ne bougent pas.
-- Le parcours CM est en brouillon (CEO seul). Rejouable sans doublon.
-- ─────────────────────────────────────────────────────────────────────────

create or replace function pg_temp.copier_depuis_parcours(p_source uuid, p_module uuid, p_ordre int) returns uuid
language plpgsql as $$
declare
  v_chapitre uuid;
  v record;
  v_video uuid;
begin
  insert into public.formation_chapitres (module_id, titre, description, ordre, status, duree_estimee_minutes)
  select p_module, titre, description, p_ordre, status, duree_estimee_minutes
  from public.parcours_chapitres where id = p_source
  returning id into v_chapitre;

  insert into public.chapitre_ressources (chapitre_id, titre, type, url, ordre)
  select v_chapitre, titre, type, url, ordre from public.parcours_chapitre_ressources
  where chapitre_id = p_source and video_id is null;

  for v in select * from public.parcours_chapitre_videos where chapitre_id = p_source order by ordre loop
    insert into public.chapitre_videos (chapitre_id, titre, url, vimeo_id, ordre, duree_secondes, notes)
    values (v_chapitre, v.titre, v.url, v.vimeo_id, v.ordre, v.duree_secondes, v.notes)
    returning id into v_video;
    insert into public.chapitre_ressources (chapitre_id, titre, type, url, ordre, video_id)
    select v_chapitre, titre, type, url, ordre, v_video from public.parcours_chapitre_ressources
    where chapitre_id = p_source and video_id = v.id;
  end loop;
  return v_chapitre;
end $$;

create or replace function pg_temp.copier_chapitre(p_source uuid, p_module uuid, p_ordre int) returns uuid
language plpgsql as $$
declare
  v_chapitre uuid;
  v record;
  v_video uuid;
  q record;
  v_quiz uuid;
begin
  insert into public.formation_chapitres (module_id, titre, description, ordre, status, duree_estimee_minutes, notes_formateur)
  select p_module, titre, description, p_ordre, status, duree_estimee_minutes, notes_formateur
  from public.formation_chapitres where id = p_source
  returning id into v_chapitre;

  insert into public.chapitre_ressources (chapitre_id, titre, type, url, ordre)
  select v_chapitre, titre, type, url, ordre from public.chapitre_ressources
  where chapitre_id = p_source and video_id is null;

  for v in select * from public.chapitre_videos where chapitre_id = p_source order by ordre loop
    insert into public.chapitre_videos (chapitre_id, titre, url, vimeo_id, ordre, duree_secondes, notes)
    values (v_chapitre, v.titre, v.url, v.vimeo_id, v.ordre, v.duree_secondes, v.notes)
    returning id into v_video;
    insert into public.chapitre_ressources (chapitre_id, titre, type, url, ordre, video_id)
    select v_chapitre, titre, type, url, ordre, v_video from public.chapitre_ressources
    where chapitre_id = p_source and video_id = v.id;
  end loop;

  for q in select * from public.quizzes where chapitre_id = p_source loop
    insert into public.quizzes (titre, description, max_errors, status, chapitre_id)
    values (q.titre, q.description, q.max_errors, q.status, v_chapitre)
    returning id into v_quiz;
    insert into public.quiz_questions (quiz_id, question, contexte, options, correct_index, explication, ordre, archived_at, explications)
    select v_quiz, question, contexte, options, correct_index, explication, ordre, archived_at, explications
    from public.quiz_questions where quiz_id = q.id;
  end loop;
  return v_chapitre;
end $$;

do $$
declare
  v_cm uuid;
  v_sc uuid;
  v_al_baraka uuid;
  v_module uuid;
  v_fin record;
  v_ordre int;
  c record;
  v_partie record;
  v_source_module record;
  v_n int;
  plan constant jsonb := '[
    {"partie": 0, "phase": 1, "chapitres": [8]},
    {"partie": 1, "phase": 2, "chapitres": [3, 4]},
    {"partie": 2, "phase": 3, "chapitres": [3]},
    {"partie": 3, "phase": 4, "chapitres": [3]},
    {"partie": 4, "phase": 5, "chapitres": [3]}
  ]';
  e jsonb;
begin
  select id into v_cm from public.formations where slug = 'parcours-community-management';
  select id into v_sc from public.formations where slug = 'parcours-setter-closer';
  select id into v_al_baraka from public.parcours where slug = 'al-baraka';
  if v_cm is null or v_sc is null or v_al_baraka is null then
    raise exception 'parcours introuvable';
  end if;

  -- 1. les chapitres Al Baraka, avant le chapitre de fin de chaque partie
  for e in select * from jsonb_array_elements(plan) loop
    select id into v_module from public.formation_modules
     where formation_id = v_cm and ordre = (e->>'partie')::int;
    if v_module is null then
      raise exception 'partie % introuvable', e->>'partie';
    end if;
    select id, ordre into v_fin from public.formation_chapitres
     where module_id = v_module order by ordre desc limit 1;
    v_ordre := v_fin.ordre;
    v_n := 0;
    for c in
      select pc.id, pc.titre from public.parcours_chapitres pc
        join public.parcours_phases ph on ph.id = pc.phase_id
       where ph.parcours_id = v_al_baraka and ph.ordre = (e->>'phase')::int
         and pc.numero in (select jsonb_array_elements_text(e->'chapitres')::int)
       order by pc.numero
    loop
      continue when exists (select 1 from public.formation_chapitres where module_id = v_module and titre = c.titre);
      perform pg_temp.copier_depuis_parcours(c.id, v_module, v_ordre + v_n);
      v_n := v_n + 1;
    end loop;
    if v_n > 0 then  -- le chapitre de fin reste le dernier
      update public.formation_chapitres set ordre = v_fin.ordre + v_n where id = v_fin.id;
    end if;
  end loop;

  -- 2. parties 3 et 4 du parcours Setting/Closing → parties 5 et 6 du parcours CM
  for v_source_module in
    select * from public.formation_modules where formation_id = v_sc and ordre in (3, 4) order by ordre
  loop
    v_ordre := v_source_module.ordre + 2;
    continue when exists (select 1 from public.formation_modules where formation_id = v_cm and ordre = v_ordre);
    insert into public.formation_modules (formation_id, titre, description, ordre, status)
    values (v_cm,
            regexp_replace(v_source_module.titre, '^PARTIE \d+', 'PARTIE ' || v_ordre),
            v_source_module.description, v_ordre, v_source_module.status)
    returning id into v_module;
    for c in select id, ordre from public.formation_chapitres where module_id = v_source_module.id order by ordre loop
      perform pg_temp.copier_chapitre(c.id, v_module, c.ordre);
    end loop;
  end loop;
end $$;
