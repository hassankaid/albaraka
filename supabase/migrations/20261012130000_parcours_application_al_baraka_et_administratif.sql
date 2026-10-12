-- ─────────────────────────────────────────────────────────────────────────
-- Parcours : chapitres Al Baraka, Administratif et phase « Consolider »
-- (messages de Sidali du 12/10/2026, 12 h 42 – 12 h 55).
--
-- PARCOURS SETTING/CLOSING (brouillon) :
--   PARTIE 1 — SETTING : après le MODULE 16, les chapitres 3 à 8 de la phase 6
--     « Prospecter » du parcours Al Baraka (Ch. 3, 4, 5, 7, 8 : il n'y a pas de
--     Ch. 6 ; Ch. 9 « TU ES OPÉRATIONNEL » n'en fait pas partie), puis un
--     chapitre « Validation finale — Setting » qui reprend le quiz de fin de
--     Setting, jusqu'ici rattaché au MODULE 16 (choix du CEO : en fin de partie).
--   PARTIE 2 — CLOSING : après le MODULE 10, les chapitres 3 à 6 de la phase 7
--     « Vendre » ; les modules 14, 15 et « Fin du Closing » suivent.
--   PARTIE 3 — ADMINISTRATIF : les 8 chapitres de la formation Administratif.
--   PARTIE 4 — CONSOLIDER : les chapitres de la phase 8 (Ch. 1 à 4 ; l'étape
--     « TU ES AUTONOME » n'a pas d'équivalent dans le nouveau format).
-- PARCOURS LIBERTY (en ligne) : une phase 7 « ADMINISTRATIF » en BROUILLON, avec
--   les 8 chapitres copiés. Invisible des élèves tant qu'elle n'est pas publiée.
--
-- Tout est copié (vidéos, ressources, quiz) : le parcours Al Baraka et la
-- formation Administratif ne bougent pas. Les ressources OneDrive des chapitres
-- Al Baraka sont converties en fichiers par 20261012131000.
-- Rejouable sans doublon. Appliqué en base le 12/10/2026.
-- ─────────────────────────────────────────────────────────────────────────

-- Un chapitre de l'ancien parcours (phases) → un chapitre de formation.
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

-- Un chapitre de formation → un chapitre de formation (vidéos, ressources, quiz).
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

-- Un chapitre de formation → un chapitre de l'ancien parcours (Liberty).
create or replace function pg_temp.copier_vers_parcours(p_source uuid, p_phase uuid, p_numero int) returns void
language plpgsql as $$
declare
  v_chapitre uuid;
  v record;
  v_video uuid;
begin
  insert into public.parcours_chapitres (phase_id, numero, titre, type, ordre, description, duree_estimee_minutes, status)
  select p_phase, p_numero, titre, 'video', p_numero, description, duree_estimee_minutes, status
  from public.formation_chapitres where id = p_source
  returning id into v_chapitre;

  insert into public.parcours_chapitre_ressources (chapitre_id, titre, type, url, ordre)
  select v_chapitre, titre, type, url, ordre from public.chapitre_ressources
  where chapitre_id = p_source and video_id is null;

  for v in select * from public.chapitre_videos where chapitre_id = p_source order by ordre loop
    insert into public.parcours_chapitre_videos (chapitre_id, titre, url, vimeo_id, ordre, duree_secondes, notes)
    values (v_chapitre, v.titre, v.url, v.vimeo_id, v.ordre, v.duree_secondes, v.notes)
    returning id into v_video;
    insert into public.parcours_chapitre_ressources (chapitre_id, titre, type, url, ordre, video_id)
    select v_chapitre, titre, type, url, ordre, v_video from public.chapitre_ressources
    where chapitre_id = p_source and video_id = v.id;
  end loop;
end $$;

do $$
declare
  v_parcours uuid;
  v_al_baraka uuid;
  v_admin uuid;
  v_setting uuid;
  v_closing uuid;
  v_module uuid;
  v_chapitre uuid;
  v_ordre int;
  v_liberty uuid;
  v_phase uuid;
  c record;
begin
  select id into v_parcours from public.formations where slug = 'parcours-setter-closer';
  select id into v_al_baraka from public.parcours where slug = 'al-baraka';
  select id into v_admin from public.formations where slug = 'administratif';
  select id into v_setting from public.formation_modules where formation_id = v_parcours and titre = 'PARTIE 1 — SETTING';
  select id into v_closing from public.formation_modules where formation_id = v_parcours and titre = 'PARTIE 2 — CLOSING';
  if v_parcours is null or v_al_baraka is null or v_admin is null or v_setting is null or v_closing is null then
    raise exception 'parcours, formation ou partie introuvable';
  end if;

  -- 1. PARTIE 1 — SETTING : chapitres Al Baraka, puis la validation finale
  if not exists (select 1 from public.formation_chapitres where module_id = v_setting and titre = 'Validation finale — Setting') then
    select coalesce(max(ordre), -1) + 1 into v_ordre from public.formation_chapitres where module_id = v_setting;
    for c in
      select ch.id from public.parcours_chapitres ch join public.parcours_phases ph on ph.id = ch.phase_id
      where ph.parcours_id = v_al_baraka and ph.numero = 6 and ch.numero between 3 and 8 and ch.type = 'video'
      order by ch.ordre
    loop
      perform pg_temp.copier_depuis_parcours(c.id, v_setting, v_ordre);
      v_ordre := v_ordre + 1;
    end loop;

    insert into public.formation_chapitres (module_id, titre, description, ordre, status)
    values (v_setting, 'Validation finale — Setting', 'Le quiz de validation de toute la partie Setting.', v_ordre, 'published')
    returning id into v_chapitre;
    update public.quizzes q set chapitre_id = v_chapitre
    from public.formation_chapitres ch
    where q.chapitre_id = ch.id and ch.module_id = v_setting and ch.titre like 'MODULE 16 —%'
      and q.titre = 'Quiz de fin d''étape 1 — Setting';
  end if;

  -- 2. PARTIE 2 — CLOSING : chapitres Al Baraka juste après le MODULE 10
  if not exists (select 1 from public.formation_chapitres where module_id = v_closing and titre = 'Script closing À la carte') then
    select ordre + 1 into v_ordre from public.formation_chapitres
    where module_id = v_closing and titre like 'MODULE 10 %';
    if v_ordre is null then
      raise exception 'MODULE 10 du Closing introuvable';
    end if;
    update public.formation_chapitres set ordre = ordre + 4 where module_id = v_closing and ordre >= v_ordre;
    for c in
      select ch.id from public.parcours_chapitres ch join public.parcours_phases ph on ph.id = ch.phase_id
      where ph.parcours_id = v_al_baraka and ph.numero = 7 and ch.numero between 3 and 6 and ch.type = 'video'
      order by ch.ordre
    loop
      perform pg_temp.copier_depuis_parcours(c.id, v_closing, v_ordre);
      v_ordre := v_ordre + 1;
    end loop;
  end if;

  -- 3. PARTIE 3 — ADMINISTRATIF
  if not exists (select 1 from public.formation_modules where formation_id = v_parcours and titre = 'PARTIE 3 — ADMINISTRATIF') then
    insert into public.formation_modules (formation_id, titre, ordre, status)
    values (v_parcours, 'PARTIE 3 — ADMINISTRATIF', 3, 'published')
    returning id into v_module;
    v_ordre := 0;
    for c in
      select ch.id from public.formation_chapitres ch join public.formation_modules m on m.id = ch.module_id
      where m.formation_id = v_admin order by m.ordre, ch.ordre
    loop
      perform pg_temp.copier_chapitre(c.id, v_module, v_ordre);
      v_ordre := v_ordre + 1;
    end loop;
  end if;

  -- 4. PARTIE 4 — CONSOLIDER (phase 8 du parcours Al Baraka)
  if not exists (select 1 from public.formation_modules where formation_id = v_parcours and titre = 'PARTIE 4 — CONSOLIDER') then
    insert into public.formation_modules (formation_id, titre, ordre, status)
    values (v_parcours, 'PARTIE 4 — CONSOLIDER', 4, 'published')
    returning id into v_module;
    v_ordre := 0;
    for c in
      select ch.id from public.parcours_chapitres ch join public.parcours_phases ph on ph.id = ch.phase_id
      where ph.parcours_id = v_al_baraka and ph.numero = 8 and ch.type = 'video'
      order by ch.ordre
    loop
      perform pg_temp.copier_depuis_parcours(c.id, v_module, v_ordre);
      v_ordre := v_ordre + 1;
    end loop;
  end if;

  -- 5. PARCOURS LIBERTY : phase 7 ADMINISTRATIF, en brouillon
  select id into v_liberty from public.parcours where slug = 'liberty';
  if v_liberty is null then
    raise exception 'parcours liberty introuvable';
  end if;
  if not exists (select 1 from public.parcours_phases where parcours_id = v_liberty and titre = 'ADMINISTRATIF') then
    insert into public.parcours_phases (parcours_id, numero, titre, emoji, description, ordre, status)
    values (v_liberty, 7, 'ADMINISTRATIF', '📑',
            'Se déclarer · URSSAF · Impôts · Facturer · Suivre sa trésorerie.', 7, 'draft')
    returning id into v_phase;
    v_ordre := 1;
    for c in
      select ch.id from public.formation_chapitres ch join public.formation_modules m on m.id = ch.module_id
      where m.formation_id = v_admin order by m.ordre, ch.ordre
    loop
      perform pg_temp.copier_vers_parcours(c.id, v_phase, v_ordre);
      v_ordre := v_ordre + 1;
    end loop;
  end if;
end $$;
