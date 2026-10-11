-- ─────────────────────────────────────────────────────────────────────────
-- Parcours en une seule formation (demandes de Sidali, vocaux du 11/10/2026).
--
-- 1. PARCOURS SETTING/CLOSING : une « PARTIE 0 — MUSLIM MINDSET » avant le
--    Setting (les parties existantes sont décalées d'un rang).
-- 2. PARCOURS COMMUNITY MANAGEMENT (nouveau, brouillon) : Muslim Mindset,
--    Personal Branding, Storytelling, Marketing Digital, Community Management,
--    une partie par formation, ses modules à la suite.
--
-- Tout est COPIÉ : les formations d'origine ne bougent pas (élèves en cours,
-- progression, certificats, déblocages). Chaque chapitre est copié avec ses
-- vidéos, ses ressources (rattachement aux vidéos conservé) et son quiz.
-- Le quiz « Validation finale » de chaque formation (rattaché à la formation
-- entière) devient le dernier chapitre de sa partie : un chapitre ne porte
-- qu'un quiz. Les intitulés « … — Vidéo complète » deviennent « MODULE n —
-- titre du module », comme Sidali l'a fait pour le Setting.
-- Les deux parcours passent en navigation libre (20261011120000).
--
-- Rejouable sans doublon : chaque partie n'est créée que si elle n'existe pas.
-- Appliqué en base le 11/10/2026.
-- ─────────────────────────────────────────────────────────────────────────

-- Copie d'un quiz et de ses questions vers un chapitre.
create or replace function pg_temp.copier_quiz(p_quiz uuid, p_chapitre uuid) returns uuid
language plpgsql as $$
declare v_nouveau uuid;
begin
  insert into public.quizzes (titre, description, max_errors, status, chapitre_id)
  select titre, description, max_errors, status, p_chapitre from public.quizzes where id = p_quiz
  returning id into v_nouveau;
  insert into public.quiz_questions (quiz_id, question, contexte, options, correct_index, explication, ordre, archived_at, explications)
  select v_nouveau, question, contexte, options, correct_index, explication, ordre, archived_at, explications
  from public.quiz_questions where quiz_id = p_quiz;
  return v_nouveau;
end $$;

-- Copie d'un chapitre (vidéos, ressources, quiz) dans un module.
create or replace function pg_temp.copier_chapitre(p_source uuid, p_module uuid, p_ordre int, p_titre text) returns uuid
language plpgsql as $$
declare
  v_chapitre uuid;
  v record;
  v_video uuid;
  q record;
begin
  insert into public.formation_chapitres (module_id, titre, description, ordre, status, duree_estimee_minutes, notes_formateur)
  select p_module, coalesce(p_titre, titre), description, p_ordre, status, duree_estimee_minutes, notes_formateur
  from public.formation_chapitres where id = p_source
  returning id into v_chapitre;

  -- ressources du chapitre (sans vidéo)
  insert into public.chapitre_ressources (chapitre_id, titre, type, url, ordre)
  select v_chapitre, titre, type, url, ordre from public.chapitre_ressources
  where chapitre_id = p_source and video_id is null;

  -- vidéos, puis les ressources rattachées à chacune
  for v in select * from public.chapitre_videos where chapitre_id = p_source order by ordre loop
    insert into public.chapitre_videos (chapitre_id, titre, url, vimeo_id, ordre, duree_secondes, notes)
    values (v_chapitre, v.titre, v.url, v.vimeo_id, v.ordre, v.duree_secondes, v.notes)
    returning id into v_video;
    insert into public.chapitre_ressources (chapitre_id, titre, type, url, ordre, video_id)
    select v_chapitre, titre, type, url, ordre, v_video from public.chapitre_ressources
    where chapitre_id = p_source and video_id = v.id;
  end loop;

  for q in select id from public.quizzes where chapitre_id = p_source loop
    perform pg_temp.copier_quiz(q.id, v_chapitre);
  end loop;
  return v_chapitre;
end $$;

-- Copie d'une formation entière comme une partie (module) d'un parcours.
create or replace function pg_temp.copier_partie(p_parcours uuid, p_source_slug text, p_ordre int, p_nom text) returns void
language plpgsql as $$
declare
  v_source uuid;
  v_module uuid;
  v_titre_partie text := 'PARTIE ' || p_ordre || ' — ' || p_nom;
  v_rang int := 0;
  c record;
  v_final record;
  v_chapitre uuid;
begin
  select id into v_source from public.formations where slug = p_source_slug;
  if v_source is null then
    raise exception 'formation source introuvable : %', p_source_slug;
  end if;
  if exists (select 1 from public.formation_modules where formation_id = p_parcours and titre = v_titre_partie) then
    raise notice 'partie déjà présente : %', v_titre_partie;
    return;
  end if;

  insert into public.formation_modules (formation_id, titre, ordre, status, etape)
  values (p_parcours, v_titre_partie, p_ordre, 'published', 'ÉTAPE ' || p_ordre || ' — ' || p_nom)
  returning id into v_module;

  for c in
    select ch.id, ch.titre, m.ordre as m_ordre, m.titre as m_titre
    from public.formation_chapitres ch
    join public.formation_modules m on m.id = ch.module_id
    where m.formation_id = v_source
    order by m.ordre, ch.ordre
  loop
    perform pg_temp.copier_chapitre(
      c.id, v_module, v_rang,
      case when c.titre ilike '%— Vidéo complète%'
           then 'MODULE ' || (c.m_ordre + 1) || ' — ' || trim(c.m_titre)
           else null end);
    v_rang := v_rang + 1;
  end loop;

  -- quiz de validation finale de la formation → dernier chapitre de la partie
  for v_final in
    select id, titre from public.quizzes
    where formation_id = v_source and chapitre_id is null and module_id is null and status = 'published'
  loop
    insert into public.formation_chapitres (module_id, titre, description, ordre, status)
    values (v_module, 'Validation finale — ' || initcap(lower(p_nom)),
            'Le quiz de validation de toute la partie ' || initcap(lower(p_nom)) || '.', v_rang, 'published')
    returning id into v_chapitre;
    perform pg_temp.copier_quiz(v_final.id, v_chapitre);
    v_rang := v_rang + 1;
  end loop;
end $$;

do $$
declare
  v_setting_closing uuid;
  v_cm uuid;
begin
  -- 1. PARCOURS SETTING/CLOSING : partie 0 Muslim Mindset, les autres décalées
  select id into v_setting_closing from public.formations where slug = 'parcours-setter-closer';
  if not exists (select 1 from public.formation_modules
                 where formation_id = v_setting_closing and titre = 'PARTIE 0 — MUSLIM MINDSET') then
    update public.formation_modules set ordre = ordre + 1 where formation_id = v_setting_closing;
    perform pg_temp.copier_partie(v_setting_closing, 'muslim-mindset', 0, 'MUSLIM MINDSET');
  end if;

  -- 2. PARCOURS COMMUNITY MANAGEMENT (brouillon : visible du CEO seul)
  select id into v_cm from public.formations where slug = 'parcours-community-management';
  if v_cm is null then
    insert into public.formations (slug, titre, description, couleur, cover_url, status, ordre, access_mode, navigation_libre)
    select 'parcours-community-management', 'PARCOURS COMMUNITY MANAGEMENT',
           'Muslim Mindset, Personal Branding, Storytelling, Marketing Digital et Community Management réunis dans un seul parcours, étape par étape.',
           couleur, cover_url, 'draft', ordre, 'parcours', true
    from public.formations where slug = 'community-management'
    returning id into v_cm;
  end if;
  perform pg_temp.copier_partie(v_cm, 'muslim-mindset', 0, 'MUSLIM MINDSET');
  perform pg_temp.copier_partie(v_cm, 'personal-branding', 1, 'PERSONAL BRANDING');
  perform pg_temp.copier_partie(v_cm, 'storytelling', 2, 'STORYTELLING');
  perform pg_temp.copier_partie(v_cm, 'marketing-digital', 3, 'MARKETING DIGITAL');
  perform pg_temp.copier_partie(v_cm, 'community-management', 4, 'COMMUNITY MANAGEMENT');

  -- 3. Navigation libre dans les deux parcours
  update public.formations set navigation_libre = true
  where slug in ('parcours-setter-closer', 'parcours-community-management');
end $$;
