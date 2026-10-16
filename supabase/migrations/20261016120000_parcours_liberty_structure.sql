-- ═══════════════════════════════════════════════════════════════════════
-- Parcours Liberty — phase 1 : la structure (cahiers des charges de Sidali du
-- 15/10/2026 « Parcours Liberty » et « Outils du Parcours Liberty » ; plan validé
-- par Sidali le 16/10 : 1A · 2A · 3A · 4A).
--
-- UNE seule formation linéaire, « parcours-liberty », en BROUILLON (visible du CEO
-- seul) jusqu'à l'ouverture (phase 6 : accès Pass Liberty uniquement, actuels et
-- futurs ; transition depuis l'ancien Parcours Liberty, anciennes tables parcours*).
--   - un module par étape : Introduction, Étapes 1 à 20, Bonus ; la partie est dans
--     formation_modules.etape (titre de groupe) ;
--   - les chapitres = les modules vidéo du cahier (vidéos déposées par Sidali au fil du
--     tournage), la page de chaque outil (formation_chapitres.outil), la slide de
--     validation (WhatsApp ou consulting) ; textes repris de Parcours_Liberty_Complet.pptx ;
--   - modules « en préparation » : étape 6, et modules 5 à 8 de l'étape 20 (ils
--     attendent le chantier « tunnel de l'élève sur la plateforme ») ;
--   - étape 12 : copie des modules 1 à 13 du Setting du parcours Setting/Closing et de
--     son quiz (18 questions, 3 erreurs max = au moins 80 % ; aucune question ne porte
--     sur les modules 14 à 16) ; étape 13 : copie de tout le Closing et de son quiz.
--     Le Closing copié s'ouvre quand le quiz Setting est réussi : nouveau verrou ciblé
--     formation_chapitres.verrou_quiz_id, qui marche aussi en navigation libre ;
--   - décision 2A : une seule progression. Chaque copie est reliée à son chapitre
--     d'origine (parcours_correspondances_chapitres / _quiz) : ce qui est fait d'un
--     côté est coché de l'autre (déclencheurs du 12/10), et l'existant est repris.
-- ═══════════════════════════════════════════════════════════════════════

-- ── 1. Le verrou ciblé et les codes des 11 outils ─────────────────────────
alter table public.formation_chapitres
  add column if not exists verrou_quiz_id uuid references public.quizzes(id) on delete set null;
comment on column public.formation_chapitres.verrou_quiz_id is
  'Quiz à réussir pour ouvrir ce chapitre, même en navigation libre (Closing du Parcours Liberty : quiz Setting à 80 %).';

alter table public.formation_chapitres drop constraint if exists formation_chapitres_outil_check;
alter table public.formation_chapitres add constraint formation_chapitres_outil_check
  check (outil is null or outil = any (array[
    'script_appel_setter_closer', 'script_appel_liberty',
    'liberty_niche_avatar', 'liberty_promesse_methode', 'liberty_fiche_offre', 'liberty_vsl_tunnel',
    'liberty_histoires', 'liberty_calendrier', 'liberty_accroches_scripts', 'liberty_script_setting',
    'liberty_scripts_closing', 'liberty_webinaire', 'liberty_mid_low']));

-- ── 2. get_locked_chapitres : définition de production (16/10) + le verrou ciblé ─
CREATE OR REPLACE FUNCTION public.get_locked_chapitres(p_user_id uuid, p_formation_id uuid)
 RETURNS TABLE(chapitre_id uuid, blocker_quiz_id uuid, blocker_quiz_titre text, blocker_chapitre_id uuid)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH formation_chapitres_ordered AS (
    SELECT c.id,
           c.module_id,
           ROW_NUMBER() OVER (ORDER BY m.ordre, c.ordre) AS formation_order
    FROM public.formation_chapitres c
    JOIN public.formation_modules m ON m.id = c.module_id
    WHERE m.formation_id = p_formation_id
      AND c.status = 'published'
      AND m.status = 'published'
      -- navigation libre : aucun quiz ne verrouille la suite (la progression reste suivie)
      AND NOT EXISTS (
        SELECT 1 FROM public.formations f
        WHERE f.id = p_formation_id AND f.navigation_libre
      )
  ),
  gates AS (
    SELECT q.chapitre_id AS blocker_chapitre_id,
           q.id AS blocker_quiz_id,
           q.titre AS blocker_quiz_titre
    FROM public.quizzes q
    WHERE q.chapitre_id IS NOT NULL
      AND q.status = 'published'
      AND q.chapitre_id IN (SELECT id FROM formation_chapitres_ordered)
    UNION ALL
    SELECT (
      SELECT c.id
      FROM public.formation_chapitres c
      WHERE c.module_id = q.module_id AND c.status = 'published'
      ORDER BY c.ordre DESC
      LIMIT 1
    ) AS blocker_chapitre_id,
    q.id AS blocker_quiz_id,
    q.titre AS blocker_quiz_titre
    FROM public.quizzes q
    JOIN public.formation_modules m ON m.id = q.module_id
    WHERE q.module_id IS NOT NULL
      AND q.status = 'published'
      AND m.formation_id = p_formation_id
  ),
  gates_ordered AS (
    SELECT g.blocker_quiz_id,
           g.blocker_quiz_titre,
           g.blocker_chapitre_id,
           fo.formation_order AS gate_order
    FROM gates g
    JOIN formation_chapitres_ordered fo ON fo.id = g.blocker_chapitre_id
  ),
  blocker_for_each AS (
    SELECT x.id AS chapitre_id,
           (SELECT go.blocker_quiz_id
            FROM gates_ordered go
            WHERE go.gate_order < x.formation_order
            ORDER BY go.gate_order DESC
            LIMIT 1) AS blocker_quiz_id,
           (SELECT go.blocker_quiz_titre
            FROM gates_ordered go
            WHERE go.gate_order < x.formation_order
            ORDER BY go.gate_order DESC
            LIMIT 1) AS blocker_quiz_titre,
           (SELECT go.blocker_chapitre_id
            FROM gates_ordered go
            WHERE go.gate_order < x.formation_order
            ORDER BY go.gate_order DESC
            LIMIT 1) AS blocker_chapitre_id
    FROM formation_chapitres_ordered x
  )
  SELECT b.chapitre_id, b.blocker_quiz_id, b.blocker_quiz_titre, b.blocker_chapitre_id
  FROM blocker_for_each b
  WHERE b.blocker_quiz_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.quiz_attempts qa
      WHERE qa.user_id = p_user_id
        AND qa.quiz_id = b.blocker_quiz_id
        AND qa.validated = true
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.chapitre_progress cp
      WHERE cp.user_id = p_user_id AND cp.chapitre_id = b.chapitre_id
    )
  UNION
  -- verrou ciblé (Parcours Liberty, 16/10/2026) : le chapitre s'ouvre quand le quiz
  -- verrou_quiz_id est réussi, même en navigation libre ; un chapitre déjà vu reste ouvert
  SELECT c.id, c.verrou_quiz_id, q.titre, q.chapitre_id
  FROM public.formation_chapitres c
  JOIN public.formation_modules m ON m.id = c.module_id
  JOIN public.quizzes q ON q.id = c.verrou_quiz_id
  WHERE m.formation_id = p_formation_id
    AND c.status = 'published'
    AND m.status = 'published'
    AND NOT EXISTS (
      SELECT 1 FROM public.quiz_attempts qa
      WHERE qa.user_id = p_user_id AND qa.quiz_id = c.verrou_quiz_id AND qa.validated = true
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.chapitre_progress cp
      WHERE cp.user_id = p_user_id AND cp.chapitre_id = c.id
    );
$function$;

-- ── 3. Outils de construction (temporaires) ──────────────────────────────
create or replace function pg_temp.liberty_module(p_f uuid, p_ordre int, p_etape text, p_titre text, p_desc text) returns uuid
language plpgsql as $$
declare v uuid;
begin
  insert into public.formation_modules (formation_id, titre, description, ordre, status, etape)
  values (p_f, p_titre, p_desc, p_ordre, 'published', p_etape) returning id into v;
  return v;
end $$;

create or replace function pg_temp.liberty_chapitre(p_module uuid, p_ordre int, p_titre text, p_desc text, p_outil text) returns uuid
language plpgsql as $$
declare v uuid;
begin
  insert into public.formation_chapitres (module_id, titre, description, ordre, status, outil)
  values (p_module, p_titre, p_desc, p_ordre, 'published', p_outil) returning id into v;
  return v;
end $$;

-- copie d'un quiz (questions comprises) dans un chapitre, reliée à son original
create or replace function pg_temp.copier_quiz(p_quiz uuid, p_chapitre uuid, p_titre text default null) returns uuid
language plpgsql as $$
declare v_nouveau uuid;
begin
  insert into public.quizzes (titre, description, max_errors, status, chapitre_id)
  select coalesce(p_titre, titre), description, max_errors, status, p_chapitre from public.quizzes where id = p_quiz
  returning id into v_nouveau;
  insert into public.quiz_questions (quiz_id, question, contexte, options, correct_index, explication, ordre, archived_at, explications)
  select v_nouveau, question, contexte, options, correct_index, explication, ordre, archived_at, explications
  from public.quiz_questions where quiz_id = p_quiz;
  insert into public.parcours_correspondances_quiz (copie_quiz_id, source_quiz_id) values (v_nouveau, p_quiz)
  on conflict do nothing;
  return v_nouveau;
end $$;

-- copie d'un chapitre (vidéos, ressources, quiz), reliée à son original
create or replace function pg_temp.copier_chapitre(p_source uuid, p_module uuid, p_ordre int) returns uuid
language plpgsql as $$
declare
  v_chapitre uuid;
  v record;
  v_video uuid;
  q record;
begin
  insert into public.formation_chapitres (module_id, titre, description, ordre, status, duree_estimee_minutes, notes_formateur)
  select p_module, titre, description, p_ordre, status, duree_estimee_minutes, notes_formateur
  from public.formation_chapitres where id = p_source
  returning id into v_chapitre;

  insert into public.chapitre_ressources (chapitre_id, titre, type, url, ordre, rubrique)
  select v_chapitre, titre, type, url, ordre, rubrique from public.chapitre_ressources
  where chapitre_id = p_source and video_id is null;

  for v in select * from public.chapitre_videos where chapitre_id = p_source order by ordre loop
    insert into public.chapitre_videos (chapitre_id, titre, url, vimeo_id, ordre, duree_secondes, notes)
    values (v_chapitre, v.titre, v.url, v.vimeo_id, v.ordre, v.duree_secondes, v.notes)
    returning id into v_video;
    insert into public.chapitre_ressources (chapitre_id, titre, type, url, ordre, video_id, rubrique)
    select v_chapitre, titre, type, url, ordre, v_video, rubrique from public.chapitre_ressources
    where chapitre_id = p_source and video_id = v.id;
  end loop;

  for q in select id from public.quizzes where chapitre_id = p_source loop
    perform pg_temp.copier_quiz(q.id, v_chapitre);
  end loop;

  insert into public.parcours_correspondances_chapitres (copie_id, source_chapitre_id) values (v_chapitre, p_source)
  on conflict do nothing;
  return v_chapitre;
end $$;

-- les modules 1 à 13 du Setting du parcours Setting/Closing
create or replace function pg_temp.liberty_copier_setting(p_module uuid, p_rang int) returns int
language plpgsql as $$
declare c record; v_rang int := p_rang; n int := 0;
begin
  for c in
    select ch.id from public.formation_chapitres ch
    join public.formation_modules m on m.id = ch.module_id
    join public.formations f on f.id = m.formation_id
    where f.slug = 'parcours-setter-closer' and m.titre = 'PARTIE 1 — SETTING' and ch.status = 'published'
      and substring(ch.titre from '^MODULE (\d+) ')::int between 1 and 13
    order by ch.ordre
  loop
    perform pg_temp.copier_chapitre(c.id, p_module, v_rang);
    v_rang := v_rang + 1; n := n + 1;
  end loop;
  if n <> 13 then
    raise exception 'Setting : 13 modules attendus, % trouvés', n;
  end if;
  return v_rang;
end $$;

-- le quiz Setting, dans son propre chapitre
create or replace function pg_temp.liberty_quiz_setting(p_module uuid, p_rang int) returns uuid
language plpgsql as $$
declare v_source uuid; v_chapitre uuid;
begin
  select q.id into v_source from public.quizzes q
  join public.formation_chapitres ch on ch.id = q.chapitre_id
  join public.formation_modules m on m.id = ch.module_id
  join public.formations f on f.id = m.formation_id
  where f.slug = 'parcours-setter-closer' and m.titre = 'PARTIE 1 — SETTING' and q.status = 'published';
  if v_source is null then
    raise exception 'quiz Setting introuvable';
  end if;
  v_chapitre := pg_temp.liberty_chapitre(p_module, p_rang, 'Quiz Setting — modules 1 à 13',
    'Le quiz de fin du Setting : 18 questions. Avec au moins 80 % de bonnes réponses (3 erreurs au maximum), la formation Closing de l''étape 13 s''ouvre.',
    null);
  insert into public.parcours_correspondances_chapitres (copie_id, source_chapitre_id)
  select v_chapitre, chapitre_id from public.quizzes where id = v_source
  on conflict do nothing;
  return pg_temp.copier_quiz(v_source, v_chapitre, 'Quiz Setting — modules 1 à 13');
end $$;

-- tout le Closing du parcours Setting/Closing, ouvert par le quiz Setting
create or replace function pg_temp.liberty_copier_closing(p_module uuid, p_rang int, p_quiz uuid) returns int
language plpgsql as $$
declare c record; v_rang int := p_rang; v_chapitre uuid; n int := 0;
begin
  for c in
    select ch.id from public.formation_chapitres ch
    join public.formation_modules m on m.id = ch.module_id
    join public.formations f on f.id = m.formation_id
    where f.slug = 'parcours-setter-closer' and m.titre = 'PARTIE 2 — CLOSING' and ch.status = 'published'
    order by ch.ordre
  loop
    v_chapitre := pg_temp.copier_chapitre(c.id, p_module, v_rang);
    update public.formation_chapitres set verrou_quiz_id = p_quiz where id = v_chapitre;
    v_rang := v_rang + 1; n := n + 1;
  end loop;
  if n = 0 then
    raise exception 'Closing introuvable';
  end if;
  return v_rang;
end $$;

-- ── 4. La formation et sa structure ──────────────────────────────────────
do $$
declare
  v_f uuid;
  v_module uuid;
  v_rang int;
  v_quiz_setting uuid;
begin
  if exists (select 1 from public.formations where slug = 'parcours-liberty') then
    raise notice 'parcours-liberty existe déjà : rien à faire';
    return;
  end if;

  insert into public.formations (slug, titre, description, couleur, cover_url, status, ordre, access_mode, navigation_libre)
  select 'parcours-liberty', 'PARCOURS LIBERTY',
         'Votre propre offre high-ticket, la machine qui attire vos clients sur Instagram, vos scripts de setting et de closing, puis vos 10 premiers clients satisfaits, et enfin le passage au scaling. Chaque étape vous donne la théorie utile, puis vous construisez directement sur les outils de la plateforme.',
         couleur, cover_url, 'draft', -4, 'liberty_only', true
  from public.formations where slug = 'offer-creation'
  returning id into v_f;

  -- INTRODUCTION — BIENVENUE DANS LE PARCOURS LIBERTY
  v_module := pg_temp.liberty_module(v_f, 0, 'INTRODUCTION', 'INTRODUCTION — BIENVENUE DANS LE PARCOURS LIBERTY', 'Ce que vous allez construire : Votre propre offre high-ticket, la machine qui attire vos clients sur Instagram, vos scripts de setting et de closing, puis vos 10 premiers clients satisfaits. Ensuite, vous passerez à une formation avec coaching de groupe ou à du consulting.

Comment ça marche : Chaque étape vous donne uniquement la théorie utile, puis vous construisez directement sur les outils de la plateforme. Chaque outil vous génère un document PDF ou Word. Vous l''envoyez à Sidali, qui le valide avec vous.');
  v_rang := 0;
  perform pg_temp.liberty_chapitre(v_module, v_rang, 'Bienvenue', null, null); v_rang := v_rang + 1;
  perform pg_temp.liberty_chapitre(v_module, v_rang, 'Le vocabulaire du parcours', null, null); v_rang := v_rang + 1;
  perform pg_temp.liberty_chapitre(v_module, v_rang, 'Les 20 étapes', null, null); v_rang := v_rang + 1;
  perform pg_temp.liberty_chapitre(v_module, v_rang, 'Vos validations avec Sidali', null, null); v_rang := v_rang + 1;
  perform pg_temp.liberty_chapitre(v_module, v_rang, 'Vos repères dans le parcours', null, null); v_rang := v_rang + 1;
  perform pg_temp.liberty_chapitre(v_module, v_rang, 'Les règles du parcours', null, null); v_rang := v_rang + 1;
  perform pg_temp.liberty_chapitre(v_module, v_rang, 'Les principes premiers', null, null); v_rang := v_rang + 1;

  -- ÉTAPE 1 — COMPRENDRE LE MARCHÉ
  v_module := pg_temp.liberty_module(v_f, 1, 'PARTIE 1 — CONSTRUIRE VOTRE OFFRE HIGH-TICKET', 'ÉTAPE 1 — COMPRENDRE LE MARCHÉ', 'La théorie qui compte vraiment avant de construire votre offre');
  v_rang := 0;
  perform pg_temp.liberty_chapitre(v_module, v_rang, 'MODULE 1 — Le marché du digital', null, null); v_rang := v_rang + 1;
  perform pg_temp.liberty_chapitre(v_module, v_rang, 'MODULE 2 — Le marché est roi', null, null); v_rang := v_rang + 1;
  perform pg_temp.liberty_chapitre(v_module, v_rang, 'MODULE 3 — Le marché sophistiqué et l''océan bleu', null, null); v_rang := v_rang + 1;
  perform pg_temp.liberty_chapitre(v_module, v_rang, 'MODULE 4 — Les 5 niveaux de conscience de votre prospect', null, null); v_rang := v_rang + 1;
  perform pg_temp.liberty_chapitre(v_module, v_rang, 'MODULE 5 — La psychologie d''achat', null, null); v_rang := v_rang + 1;
  perform pg_temp.liberty_chapitre(v_module, v_rang, 'MODULE 6 — La preuve sociale', null, null); v_rang := v_rang + 1;

  -- ÉTAPE 2 — VOTRE CIBLE
  v_module := pg_temp.liberty_module(v_f, 2, 'PARTIE 1 — CONSTRUIRE VOTRE OFFRE HIGH-TICKET', 'ÉTAPE 2 — VOTRE CIBLE', 'Choisir et valider votre sous-niche 2.0, puis décrire votre client idéal

Ce que vous allez apprendre :
1. Trouver votre sous-niche 2.0
2. Vérifier qu''elle est viable
3. Décrire votre avatar comme une vraie personne
4. Remplir votre fiche sur la plateforme et l''envoyer à Sidali');
  v_rang := 0;
  perform pg_temp.liberty_chapitre(v_module, v_rang, 'Trouver votre sous-niche 2.0', null, null); v_rang := v_rang + 1;
  perform pg_temp.liberty_chapitre(v_module, v_rang, 'Vérifier qu''elle est viable', null, null); v_rang := v_rang + 1;
  perform pg_temp.liberty_chapitre(v_module, v_rang, 'Décrire votre avatar', null, null); v_rang := v_rang + 1;
  perform pg_temp.liberty_chapitre(v_module, v_rang, 'Remplir votre fiche', null, null); v_rang := v_rang + 1;
  perform pg_temp.liberty_chapitre(v_module, v_rang, 'Outil 1 — Niche & avatar', 'Ce que vous remplissez :
• Vos 5 niches, vos 5 compétences, les problèmes, peurs et désirs de chaque niche
• Les critères de votre sous-niche : sexe, âge, situation professionnelle, pouvoir d''achat, douleur, désirs
• Les questions de viabilité : demande, concurrence, durée, difficulté à copier, alignement avec vous
• Votre avatar : identité, situation, croyances, ses 3 problèmes principaux, objectif, conséquences, ce qu''il a essayé, ressenti, situation de rêve
• Ce qu''il dit vouloir et ce dont il a vraiment besoin, sa plus grande peur, ce qu''il risque de perdre, son objection principale
• Son vocabulaire exact : les phrases qu''il utilise pour décrire son problème, les mots qu''il écrit en commentaire ou en message
• Votre sous-niche 2.0 et votre avatar, chacun en une phrase

Ce que vous obtenez : Votre fiche sous-niche et avatar en PDF ou en Word, prête à être envoyée à Sidali.', 'liberty_niche_avatar'); v_rang := v_rang + 1;
  perform pg_temp.liberty_chapitre(v_module, v_rang, 'Validation — à envoyer à Sidali sur WhatsApp', 'Ce que vous envoyez : Votre fiche sous-niche et avatar (PDF ou Word générée par l''outil)

Comment : Envoyez-la sur le WhatsApp de Sidali, avec une phrase qui résume votre sous-niche.

Ensuite : Attendez son retour avant de passer à l''étape 3 : toute votre offre va se construire sur cette cible.', null); v_rang := v_rang + 1;

  -- ÉTAPE 3 — PROMESSE ET MÉTHODE
  v_module := pg_temp.liberty_module(v_f, 3, 'PARTIE 1 — CONSTRUIRE VOTRE OFFRE HIGH-TICKET', 'ÉTAPE 3 — PROMESSE ET MÉTHODE', 'Le résultat que vous promettez, le chemin pour y arriver, et le nom de votre offre

Ce que vous allez apprendre :
1. Écrire une promesse spécifique et crédible
2. Choisir le bon délai
3. Lister les problèmes de votre client et vos solutions
4. Transformer ces solutions en une méthode en étapes, votre mécanisme unique
5. Trouver le nom de votre offre');
  v_rang := 0;
  perform pg_temp.liberty_chapitre(v_module, v_rang, 'Promesse spécifique', null, null); v_rang := v_rang + 1;
  perform pg_temp.liberty_chapitre(v_module, v_rang, 'Le bon délai', null, null); v_rang := v_rang + 1;
  perform pg_temp.liberty_chapitre(v_module, v_rang, 'Problèmes et solutions', null, null); v_rang := v_rang + 1;
  perform pg_temp.liberty_chapitre(v_module, v_rang, 'Méthode et mécanisme unique', null, null); v_rang := v_rang + 1;
  perform pg_temp.liberty_chapitre(v_module, v_rang, 'Le nom de l''offre', null, null); v_rang := v_rang + 1;
  perform pg_temp.liberty_chapitre(v_module, v_rang, 'Outil 2 — Promesse & méthode', 'Ce que vous remplissez :
• Votre promesse générale, puis votre promesse spécifique (résultat chiffré + délai d''au moins 90 jours)
• La liste d''au moins 20 problèmes que rencontre votre client
• Pour chaque problème, la solution que vous apportez
• Vos 3 à 5 grandes étapes et leurs micro-étapes
• Votre mécanisme unique : pourquoi ça n''a pas marché avant, pourquoi ça va marcher maintenant
• Le nom de votre offre : bénéfice en 2 mots, émotion, ce qui vous distingue, 5 propositions, puis le nom choisi

Ce que vous obtenez : Votre fiche promesse & méthode en PDF ou en Word.', 'liberty_promesse_methode'); v_rang := v_rang + 1;
  perform pg_temp.liberty_chapitre(v_module, v_rang, 'Validation — à envoyer à Sidali sur WhatsApp', 'Ce que vous envoyez : Votre fiche promesse & méthode : promesse, liste problèmes → solutions, méthode en étapes, mécanisme unique, nom de l''offre

Comment : Une fois tout rempli et structuré, envoyez le document sur le WhatsApp de Sidali.

Ensuite : Attendez sa validation avant de construire votre offre complète à l''étape 4.', null); v_rang := v_rang + 1;

  -- ÉTAPE 4 — VOTRE OFFRE HIGH-TICKET
  v_module := pg_temp.liberty_module(v_f, 4, 'PARTIE 1 — CONSTRUIRE VOTRE OFFRE HIGH-TICKET', 'ÉTAPE 4 — VOTRE OFFRE HIGH-TICKET', 'Format, bonus, prix, garantie et contrat : votre offre complète sur une page

Ce que vous allez apprendre :
1. Les 7 composantes d''une offre irrésistible
2. Le format de votre accompagnement
3. Vos bonus
4. Fixer votre prix par la valeur
5. Votre garantie et ses conditions
6. Votre contrat
7. Deux exemples d''offres validées');
  v_rang := 0;
  perform pg_temp.liberty_chapitre(v_module, v_rang, 'Les 7 composantes', null, null); v_rang := v_rang + 1;
  perform pg_temp.liberty_chapitre(v_module, v_rang, 'Le format', null, null); v_rang := v_rang + 1;
  perform pg_temp.liberty_chapitre(v_module, v_rang, 'Les bonus', null, null); v_rang := v_rang + 1;
  perform pg_temp.liberty_chapitre(v_module, v_rang, 'Le prix', null, null); v_rang := v_rang + 1;
  perform pg_temp.liberty_chapitre(v_module, v_rang, 'La garantie', null, null); v_rang := v_rang + 1;
  perform pg_temp.liberty_chapitre(v_module, v_rang, 'Le contrat', null, null); v_rang := v_rang + 1;
  perform pg_temp.liberty_chapitre(v_module, v_rang, 'Exemples d''offres validées', null, null); v_rang := v_rang + 1;
  perform pg_temp.liberty_chapitre(v_module, v_rang, 'Outil 3 — Fiche offre high-ticket', 'Ce que vous remplissez :
• Nom de l''offre, sous-niche en une phrase, avatar en une phrase
• Promesse générale et promesse spécifique
• Le fonctionnement : durée, phases ou semaines, appels, suivi, documents
• Vos 2 ou 3 bonus et l''objection que chacun règle
• Votre prix et vos facilités de paiement
• Votre garantie : type, variables, actions exigées, preuves à fournir

Ce que vous obtenez : Votre fiche offre d''une page, l''annexe de garantie et votre contrat pré-rempli, en PDF ou en Word.', 'liberty_fiche_offre'); v_rang := v_rang + 1;
  perform pg_temp.liberty_chapitre(v_module, v_rang, 'Validation — à envoyer à Sidali sur WhatsApp', 'Ce que vous envoyez :
• Votre fiche offre d''une page
• Les conditions de votre garantie
• Votre contrat pré-rempli

Comment : Envoyez les trois documents sur le WhatsApp de Sidali.

Ensuite : Une fois votre offre validée, vous passez à votre VSL et à votre tunnel.', null); v_rang := v_rang + 1;

  -- ÉTAPE 5 — VOTRE VSL ET VOTRE TUNNEL
  v_module := pg_temp.liberty_module(v_f, 5, 'PARTIE 1 — CONSTRUIRE VOTRE OFFRE HIGH-TICKET', 'ÉTAPE 5 — VOTRE VSL ET VOTRE TUNNEL', 'La vidéo qui présente votre offre, et les vidéos qui préparent vos appels

Ce que vous allez apprendre :
1. Le rôle de la VSL dans votre tunnel
2. Les 4 questions auxquelles votre VSL doit répondre
3. La structure complète d''une VSL
4. Les vidéos qui suivent la réservation d''appel
5. Écrire vos scripts sur la plateforme');
  v_rang := 0;
  perform pg_temp.liberty_chapitre(v_module, v_rang, 'Le rôle de la VSL', null, null); v_rang := v_rang + 1;
  perform pg_temp.liberty_chapitre(v_module, v_rang, 'Les 4 questions', null, null); v_rang := v_rang + 1;
  perform pg_temp.liberty_chapitre(v_module, v_rang, 'La structure', null, null); v_rang := v_rang + 1;
  perform pg_temp.liberty_chapitre(v_module, v_rang, 'Les vidéos après la réservation', null, null); v_rang := v_rang + 1;
  perform pg_temp.liberty_chapitre(v_module, v_rang, 'Écrire vos scripts', null, null); v_rang := v_rang + 1;
  perform pg_temp.liberty_chapitre(v_module, v_rang, 'Outil 4 — Scripts de la VSL et du tunnel', 'Ce que vous remplissez :
• Votre VSL, partie par partie : appel de l''avatar, offre, garantie, scepticisme, preuves, appels à l''action, transition, mécanisme unique, résultats
• Le titre et le sous-titre de votre page VSL
• Les éléments repris automatiquement de vos étapes 2, 3 et 4 : avatar, promesse, délai, méthode, garantie
• Le script de votre vidéo de remerciement
• Le script de votre vidéo avant l''appel et de votre best-of
• Les questions de votre formulaire de réservation et vos 3 messages de rappel

Ce que vous obtenez : Tous vos scripts en PDF ou en Word, ainsi que le modèle de slides VSL à compléter.', 'liberty_vsl_tunnel'); v_rang := v_rang + 1;

  -- ÉTAPE 6 — SETUP TECHNIQUE
  v_module := pg_temp.liberty_module(v_f, 6, 'PARTIE 1 — CONSTRUIRE VOTRE OFFRE HIGH-TICKET', 'ÉTAPE 6 — SETUP TECHNIQUE', 'Mettre votre tunnel en ligne sur la plateforme');
  v_rang := 0;
  perform pg_temp.liberty_chapitre(v_module, v_rang, 'Setup technique : mettre votre tunnel en ligne', 'Module en préparation : il sera tourné et mis en ligne prochainement.', null); v_rang := v_rang + 1;
  perform pg_temp.liberty_chapitre(v_module, v_rang, 'Validation — consulting avec Sidali', 'Ce que vous envoyez :
• Votre VSL tournée et en ligne
• Votre tunnel complet : page VSL, réservation, vidéo de remerciement, vidéo avant l''appel, best-of, rappels
• Votre setup terminé sur la plateforme

Comment : Réservez un appel de consulting avec Sidali. Il vérifiera tout avec vous, en direct.

Ensuite : Une fois votre tunnel validé, vous passez à la partie 2 : votre identité.', null); v_rang := v_rang + 1;

  -- ÉTAPE 7 — VOTRE PROFIL
  v_module := pg_temp.liberty_module(v_f, 7, 'PARTIE 2 — VOTRE IDENTITÉ', 'ÉTAPE 7 — VOTRE PROFIL', 'Votre Instagram prêt à recevoir vos prospects

Ce que vous allez apprendre :
1. Pourquoi votre profil est la porte d''entrée de votre tunnel
2. Votre positionnement en une phrase et votre voix
3. Passer en compte professionnel Créateur
4. Nom, photo, bio, lien et stories à la une
5. Remplir votre fiche profil et envoyer le lien à Sidali');
  v_rang := 0;
  perform pg_temp.liberty_chapitre(v_module, v_rang, 'Le profil, porte d''entrée', null, null); v_rang := v_rang + 1;
  perform pg_temp.liberty_chapitre(v_module, v_rang, 'Positionnement et voix', null, null); v_rang := v_rang + 1;
  perform pg_temp.liberty_chapitre(v_module, v_rang, 'Compte pro Créateur', null, null); v_rang := v_rang + 1;
  perform pg_temp.liberty_chapitre(v_module, v_rang, 'Nom, photo, bio, lien, stories à la une', null, null); v_rang := v_rang + 1;
  perform pg_temp.liberty_chapitre(v_module, v_rang, 'Check-list avant d''envoyer le lien', null, null); v_rang := v_rang + 1;
  perform pg_temp.liberty_chapitre(v_module, v_rang, 'Validation — à envoyer à Sidali sur WhatsApp', 'Ce que vous envoyez : Le lien de votre profil Instagram, une fois tout mis en place

Comment : Envoyez-le sur le WhatsApp de Sidali.

Ensuite : Sidali vérifie votre photo, votre bio, votre lien et vos stories à la une. Ensuite, vous passez à vos histoires.', null); v_rang := v_rang + 1;

  -- ÉTAPE 8 — VOS HISTOIRES
  v_module := pg_temp.liberty_module(v_f, 8, 'PARTIE 2 — VOTRE IDENTITÉ', 'ÉTAPE 8 — VOS HISTOIRES', 'Les 4 histoires qui créent la confiance et donnent envie

Ce que vous allez apprendre :
1. Pourquoi une histoire vend mieux qu''un argument
2. La structure unique pour raconter n''importe quelle histoire
3. Vos 4 histoires de vente
4. Être authentique sans tout montrer
5. Raconter vos histoires en vidéo');
  v_rang := 0;
  perform pg_temp.liberty_chapitre(v_module, v_rang, 'Pourquoi une histoire vend', null, null); v_rang := v_rang + 1;
  perform pg_temp.liberty_chapitre(v_module, v_rang, 'La structure unique', null, null); v_rang := v_rang + 1;
  perform pg_temp.liberty_chapitre(v_module, v_rang, 'Vos 4 histoires', null, null); v_rang := v_rang + 1;
  perform pg_temp.liberty_chapitre(v_module, v_rang, 'Authentique sans tout montrer', null, null); v_rang := v_rang + 1;
  perform pg_temp.liberty_chapitre(v_module, v_rang, 'Raconter en vidéo', null, null); v_rang := v_rang + 1;
  perform pg_temp.liberty_chapitre(v_module, v_rang, 'Outil 5 — Mes 4 histoires', 'Ce que vous remplissez :
• Pour chaque histoire : situation, déclencheur, épreuve, transformation, résultat, invitation
• Votre histoire fondatrice, votre histoire client (ou la vôtre au début), votre découverte, la vie future de votre client
• La première phrase de chaque histoire, au milieu de l''action
• Le lien de la vidéo de chaque histoire, une fois tournée

Ce que vous obtenez : Vos 4 histoires rédigées, en PDF ou en Word.', 'liberty_histoires'); v_rang := v_rang + 1;
  perform pg_temp.liberty_chapitre(v_module, v_rang, 'Validation — à envoyer à Sidali sur WhatsApp', 'Ce que vous envoyez :
• Vos 4 histoires écrites (document généré par l''outil)
• Les liens de vos 4 vidéos

Comment : Envoyez-les sur le WhatsApp de Sidali.

Ensuite : Une fois vos histoires validées, vous passez à la partie 3 : attirer vos clients.', null); v_rang := v_rang + 1;

  -- ÉTAPE 9 — LES BASES DU CONTENU ORGANIQUE
  v_module := pg_temp.liberty_module(v_f, 9, 'PARTIE 3 — ATTIRER', 'ÉTAPE 9 — LES BASES DU CONTENU ORGANIQUE', 'Comprendre comment un inconnu devient un client, avant de filmer

Ce que vous allez apprendre :
1. Pourquoi Instagram, et pourquoi une seule plateforme
2. Les chiffres qui comptent vraiment
3. Le parcours d''un inconnu jusqu''au client
4. La stratégie TOFU, MOFU, BOFU
5. Vos piliers de contenu, vos formats et votre calendrier');
  v_rang := 0;
  perform pg_temp.liberty_chapitre(v_module, v_rang, 'Pourquoi Instagram', null, null); v_rang := v_rang + 1;
  perform pg_temp.liberty_chapitre(v_module, v_rang, 'Les chiffres qui comptent', null, null); v_rang := v_rang + 1;
  perform pg_temp.liberty_chapitre(v_module, v_rang, 'De l''inconnu au client', null, null); v_rang := v_rang + 1;
  perform pg_temp.liberty_chapitre(v_module, v_rang, 'TOFU, MOFU, BOFU', null, null); v_rang := v_rang + 1;
  perform pg_temp.liberty_chapitre(v_module, v_rang, 'Piliers, formats et calendrier', null, null); v_rang := v_rang + 1;
  perform pg_temp.liberty_chapitre(v_module, v_rang, 'Outil 6 — Ligne éditoriale & calendrier', 'Ce que vous remplissez :
• Vos sujets TOFU (marché), MOFU (segment) et BOFU (sous-niche), 10 idées pour chaque niveau
• Vos 3 à 5 thèmes principaux, reliés à votre méthode
• La répartition de vos piliers de contenu
• Votre rythme de publication réaliste
• Votre calendrier sur 30 jours, généré automatiquement à partir de vos idées
• Pour chaque publication : niveau (TOFU, MOFU, BOFU), format, sujet, accroche, appel à l''action, déclinaisons, statut (à faire, tourné, publié) et résultat

Ce que vous obtenez : Votre ligne éditoriale et votre calendrier de 30 jours, en PDF ou en Word.', 'liberty_calendrier'); v_rang := v_rang + 1;
  perform pg_temp.liberty_chapitre(v_module, v_rang, 'Validation — à envoyer à Sidali sur WhatsApp', 'Ce que vous envoyez : Votre ligne éditoriale et votre calendrier de 30 jours

Comment : Envoyez-les sur le WhatsApp de Sidali.

Ensuite : Une fois validés, vous passez à la création de vos vidéos.', null); v_rang := v_rang + 1;

  -- ÉTAPE 10 — CRÉER VOS VIDÉOS
  v_module := pg_temp.liberty_module(v_f, 10, 'PARTIE 3 — ATTIRER', 'ÉTAPE 10 — CRÉER VOS VIDÉOS', 'De l''idée au Reel publié : accroche, valeur, appel à l''action

Ce que vous allez apprendre :
1. La composition d''une vidéo : accroche, valeur, appel à l''action
2. Écrire une accroche qui arrête le scroll
3. Trouver des idées qui ont déjà fait leurs preuves
4. Écrire votre script
5. Tourner et monter sans être un professionnel');
  v_rang := 0;
  perform pg_temp.liberty_chapitre(v_module, v_rang, 'Composition d''une vidéo', null, null); v_rang := v_rang + 1;
  perform pg_temp.liberty_chapitre(v_module, v_rang, 'L''accroche', null, null); v_rang := v_rang + 1;
  perform pg_temp.liberty_chapitre(v_module, v_rang, 'Trouver des idées', null, null); v_rang := v_rang + 1;
  perform pg_temp.liberty_chapitre(v_module, v_rang, 'Écrire le script', null, null); v_rang := v_rang + 1;
  perform pg_temp.liberty_chapitre(v_module, v_rang, 'Tourner et monter', null, null); v_rang := v_rang + 1;
  perform pg_temp.liberty_chapitre(v_module, v_rang, 'Vos ressources d''écriture', 'Les 5 fiches à télécharger avant l’outil : banque d’accroches, règles de relecture, mots qui vendent, structures d’écriture et prompts Claude.', null); v_rang := v_rang + 1;
  perform pg_temp.liberty_chapitre(v_module, v_rang, 'Outil 7 — Accroches & scripts vidéo', 'Ce que vous remplissez :
• 30 accroches, classées par type, à partir de vos sujets TOFU, MOFU et BOFU
• 10 scripts complets : accroche, problème, histoire ou solution, preuve, appel à l''action
• 3 accroches à tester pour chaque script, choisies dans la banque d''accroches
• Pour chaque script : le type de vidéo et le niveau de l''entonnoir
• La check-list avant publication

Ce que vous obtenez : Vos accroches et vos 10 scripts, en PDF ou en Word.', 'liberty_accroches_scripts'); v_rang := v_rang + 1;
  perform pg_temp.liberty_chapitre(v_module, v_rang, 'Validation — à envoyer à Sidali sur WhatsApp', 'Ce que vous envoyez : Vos 10 scripts vidéo

Comment : Envoyez-les sur le WhatsApp de Sidali.

Ensuite : Une fois validés, tournez-les, publiez, et passez à l''étape 11 pour faire grandir votre compte.', null); v_rang := v_rang + 1;

  -- ÉTAPE 11 — ALGORITHME ET CROISSANCE
  v_module := pg_temp.liberty_module(v_f, 11, 'PARTIE 3 — ATTIRER', 'ÉTAPE 11 — ALGORITHME ET CROISSANCE', 'Comprendre ce qu''Instagram récompense, et faire grandir votre compte chaque jour

Ce que vous allez apprendre :
1. Comment Instagram décide de diffuser votre vidéo
2. L''ordre de priorité des signaux sociaux
3. Les bons réglages de publication
4. Les stories qui créent le lien et déclenchent les messages
5. Vos routines de croissance et le bilan de chaque semaine');
  v_rang := 0;
  perform pg_temp.liberty_chapitre(v_module, v_rang, 'Comment Instagram diffuse', null, null); v_rang := v_rang + 1;
  perform pg_temp.liberty_chapitre(v_module, v_rang, 'L''ordre des signaux', null, null); v_rang := v_rang + 1;
  perform pg_temp.liberty_chapitre(v_module, v_rang, 'Réglages de publication', null, null); v_rang := v_rang + 1;
  perform pg_temp.liberty_chapitre(v_module, v_rang, 'Les stories', null, null); v_rang := v_rang + 1;
  perform pg_temp.liberty_chapitre(v_module, v_rang, 'Routines et bilan de la semaine', null, null); v_rang := v_rang + 1;
  perform pg_temp.liberty_chapitre(v_module, v_rang, 'Validation — à envoyer à Sidali sur WhatsApp', 'Ce que vous envoyez : Le lien de votre profil Instagram, à la fin de chaque semaine

Comment : Envoyez-le sur le WhatsApp de Sidali. Il regarde votre contenu de la semaine et vous dit quoi ajuster.

Ensuite : Continuez à publier pendant vos 30 jours. N''attendez pas la fin pour avancer : pendant que vous publiez, passez aux étapes 12 et 13.', null); v_rang := v_rang + 1;

  -- ÉTAPE 12 — SETTING
  v_module := pg_temp.liberty_module(v_f, 12, 'PARTIE 3 — ATTIRER', 'ÉTAPE 12 — SETTING', 'Transformer les personnes qui vous écrivent en rendez-vous qualifiés

Ce que vous allez apprendre :
1. Ce que vous suivez dans le parcours setter/closer
2. Créer votre propre script de setting
3. Mener vos 5 conversations avec la cible');
  v_rang := 0;
  perform pg_temp.liberty_chapitre(v_module, v_rang, 'Ce que vous suivez', null, null); v_rang := v_rang + 1;
  v_rang := pg_temp.liberty_copier_setting(v_module, v_rang);
  v_quiz_setting := pg_temp.liberty_quiz_setting(v_module, v_rang); v_rang := v_rang + 1;
  perform pg_temp.liberty_chapitre(v_module, v_rang, 'Ce qui change pour vous', null, null); v_rang := v_rang + 1;
  perform pg_temp.liberty_chapitre(v_module, v_rang, 'Créez votre script de setting', null, null); v_rang := v_rang + 1;
  perform pg_temp.liberty_chapitre(v_module, v_rang, 'Outil 8 — Script de setting', 'Ce que vous remplissez :
• Vos informations reprises automatiquement : avatar, promesse, méthode, offre
• Votre premier message et votre premier vocal
• Vos questions de qualification et de découverte
• Votre transition vers l''appel et votre réponse sur le prix
• Vos réponses aux objections avec C.A.R.E., vos relances

Ce que vous obtenez : Votre script de setting au format Word, à envoyer à Sidali.', 'liberty_script_setting'); v_rang := v_rang + 1;
  perform pg_temp.liberty_chapitre(v_module, v_rang, 'Vos 5 conversations', null, null); v_rang := v_rang + 1;
  perform pg_temp.liberty_chapitre(v_module, v_rang, 'Validation — à envoyer à Sidali sur WhatsApp', 'Ce que vous envoyez : Votre script de setting, au format Word (généré par l''outil)

Comment : Envoyez-le sur le WhatsApp de Sidali.

Ensuite : Une fois votre script validé, vous passez à la partie 4 : le closing.', null); v_rang := v_rang + 1;

  -- ÉTAPE 13 — CLOSING
  v_module := pg_temp.liberty_module(v_f, 13, 'PARTIE 4 — VENDRE ET DÉLIVRER', 'ÉTAPE 13 — CLOSING', 'Vendre votre offre en appel, avec méthode et sans pression

Ce que vous allez apprendre :
1. Votre formation closing
2. Les règles de vos appels de vente
3. Créer votre script de closing et votre pitch en 3 piliers
4. Préparer chaque appel, et ce qui se passe après le « oui »
5. Suivre vos appels et vos encaissements');
  v_rang := 0;
  perform pg_temp.liberty_chapitre(v_module, v_rang, 'Votre formation closing', null, null); v_rang := v_rang + 1;
  v_rang := pg_temp.liberty_copier_closing(v_module, v_rang, v_quiz_setting);
  perform pg_temp.liberty_chapitre(v_module, v_rang, 'Structure DECODE', null, null); v_rang := v_rang + 1;
  perform pg_temp.liberty_chapitre(v_module, v_rang, 'Règles des appels', null, null); v_rang := v_rang + 1;
  perform pg_temp.liberty_chapitre(v_module, v_rang, 'Script et pitch en 3 piliers', null, null); v_rang := v_rang + 1;
  perform pg_temp.liberty_chapitre(v_module, v_rang, 'Outil 9 — Scripts de closing et d''appel découverte', 'Ce que vous remplissez :
• Vos informations reprises automatiquement : avatar, promesse, méthode, offre, garantie, prix
• Votre script d''appel découverte : accueil, questions de qualification, transition vers l''appel de vente
• Vos phrases pour chaque phase du DECODE et vos questions d''exploration
• Votre pitch en 3 piliers
• Vos réponses aux objections de votre niche, avec C.A.R.E.

Ce que vous obtenez : Votre script de closing et votre script d''appel découverte au format Word, à envoyer à Sidali.', 'liberty_scripts_closing'); v_rang := v_rang + 1;
  perform pg_temp.liberty_chapitre(v_module, v_rang, 'Préparer l''appel et l''après « oui »', null, null); v_rang := v_rang + 1;
  perform pg_temp.liberty_chapitre(v_module, v_rang, 'Suivre appels et encaissements', null, null); v_rang := v_rang + 1;
  perform pg_temp.liberty_chapitre(v_module, v_rang, 'Validation — à envoyer à Sidali sur WhatsApp', 'Ce que vous envoyez : Votre script de closing et votre script d''appel découverte, au format Word (générés par l''outil)

Comment : Envoyez-les sur le WhatsApp de Sidali.

Ensuite : Une fois validés, entraînez-vous en roleplay, puis passez à vos vrais appels.', null); v_rang := v_rang + 1;

  -- ÉTAPE 14 — DÉLIVRER
  v_module := pg_temp.liberty_module(v_f, 14, 'PARTIE 4 — VENDRE ET DÉLIVRER', 'ÉTAPE 14 — DÉLIVRER', 'Accueillir vos clients et les amener jusqu''au résultat promis

Ce que vous allez apprendre :
1. Pourquoi vos 10 premiers clients sont décisifs
2. Accueillir un nouveau client
3. Mener un appel de coaching en 3 phases
4. Garder vos clients satisfaits
5. Faire le bilan en fin d''accompagnement');
  v_rang := 0;
  perform pg_temp.liberty_chapitre(v_module, v_rang, 'Vos 10 premiers clients', null, null); v_rang := v_rang + 1;
  perform pg_temp.liberty_chapitre(v_module, v_rang, 'Accueillir un client', null, null); v_rang := v_rang + 1;
  perform pg_temp.liberty_chapitre(v_module, v_rang, 'L''appel de coaching en 3 phases', null, null); v_rang := v_rang + 1;
  perform pg_temp.liberty_chapitre(v_module, v_rang, 'Garder vos clients satisfaits', null, null); v_rang := v_rang + 1;
  perform pg_temp.liberty_chapitre(v_module, v_rang, 'Le bilan de fin', null, null); v_rang := v_rang + 1;
  perform pg_temp.liberty_chapitre(v_module, v_rang, 'Validation — à envoyer à Sidali sur WhatsApp', 'Ce que vous envoyez :
• Votre retour sur votre premier appel de coaching avec votre premier client : ce qui s''est bien passé, ce qui a été difficile
• Le fichier Word de suivi de ce client, rempli après ce premier appel

Comment : Envoyez-les sur le WhatsApp de Sidali.

Ensuite : Sidali vérifie votre façon de délivrer et vous aide à ajuster avant les clients suivants.', null); v_rang := v_rang + 1;

  -- ÉTAPE 15 — PROUVER
  v_module := pg_temp.liberty_module(v_f, 15, 'PARTIE 4 — VENDRE ET DÉLIVRER', 'ÉTAPE 15 — PROUVER', 'Récolter vos témoignages et les montrer partout

Ce que vous allez apprendre :
1. Quand demander un témoignage
2. Obtenir un témoignage vidéo
3. Le questionnaire B.A.T.M.A.N.
4. L''entretien client : votre meilleure étude de cas
5. Montrer vos preuves partout');
  v_rang := 0;
  perform pg_temp.liberty_chapitre(v_module, v_rang, 'Quand demander un témoignage', null, null); v_rang := v_rang + 1;
  perform pg_temp.liberty_chapitre(v_module, v_rang, 'Le témoignage vidéo', null, null); v_rang := v_rang + 1;
  perform pg_temp.liberty_chapitre(v_module, v_rang, 'Le questionnaire B.A.T.M.A.N.', null, null); v_rang := v_rang + 1;
  perform pg_temp.liberty_chapitre(v_module, v_rang, 'L''entretien client', null, null); v_rang := v_rang + 1;
  perform pg_temp.liberty_chapitre(v_module, v_rang, 'Montrer vos preuves', null, null); v_rang := v_rang + 1;
  perform pg_temp.liberty_chapitre(v_module, v_rang, 'Validation — consulting avec Sidali', 'Ce que vous envoyez : Vos 10 clients satisfaits, avec leurs témoignages

Comment : Une fois vos 10 clients satisfaits, revenez vers Sidali et réservez un consulting avec lui.

Ensuite : Pendant ce consulting, Sidali confirme avec vous que vous êtes prêt à passer au modèle DIY (partie 5).', null); v_rang := v_rang + 1;

  -- ÉTAPE 16 — TRANSITION DIY
  v_module := pg_temp.liberty_module(v_f, 16, 'PARTIE 5 — PASSER AU SCALING', 'ÉTAPE 16 — TRANSITION DIY', 'Passer du 1 to 1 à un programme qui ne dépend plus de votre temps

Ce que vous allez apprendre :
1. Pourquoi le 1 to 1 a une limite
2. Les 3 façons d''accompagner un client
3. Les 2 modèles vers lesquels vous pouvez évoluer
4. La structure d''un programme DIY vendu en high-ticket
5. Vérifier que vous êtes prêt à faire la transition');
  v_rang := 0;
  perform pg_temp.liberty_chapitre(v_module, v_rang, 'La limite du 1 to 1', null, null); v_rang := v_rang + 1;
  perform pg_temp.liberty_chapitre(v_module, v_rang, 'Les 3 façons d''accompagner', null, null); v_rang := v_rang + 1;
  perform pg_temp.liberty_chapitre(v_module, v_rang, 'Les 2 modèles', null, null); v_rang := v_rang + 1;
  perform pg_temp.liberty_chapitre(v_module, v_rang, 'Programme DIY high-ticket', null, null); v_rang := v_rang + 1;
  perform pg_temp.liberty_chapitre(v_module, v_rang, 'Êtes-vous prêt ?', null, null); v_rang := v_rang + 1;

  -- ÉTAPE 17 — VOTRE PROGRAMME V1
  v_module := pg_temp.liberty_module(v_f, 17, 'PARTIE 5 — PASSER AU SCALING', 'ÉTAPE 17 — VOTRE PROGRAMME V1', 'Une première version simple, qui résout le problème de votre client

Ce que vous allez apprendre :
1. Les principes d''un programme qui donne des résultats
2. Pourquoi commencer par une V1
3. Le squelette : programme, modules, chapitres, vidéos
4. Préparer, enregistrer et mettre en ligne vos vidéos
5. Faire évoluer votre programme');
  v_rang := 0;
  perform pg_temp.liberty_chapitre(v_module, v_rang, 'Principes d''un bon programme', null, null); v_rang := v_rang + 1;
  perform pg_temp.liberty_chapitre(v_module, v_rang, 'Pourquoi une V1', null, null); v_rang := v_rang + 1;
  perform pg_temp.liberty_chapitre(v_module, v_rang, 'Le squelette', null, null); v_rang := v_rang + 1;
  perform pg_temp.liberty_chapitre(v_module, v_rang, 'Préparer, enregistrer, mettre en ligne', null, null); v_rang := v_rang + 1;
  perform pg_temp.liberty_chapitre(v_module, v_rang, 'Faire évoluer', null, null); v_rang := v_rang + 1;
  perform pg_temp.liberty_chapitre(v_module, v_rang, 'Validation — à envoyer à Sidali sur WhatsApp', 'Ce que vous envoyez : Le plan de votre programme V1 (fichier Word rempli)

Comment : Envoyez-le sur le WhatsApp de Sidali.

Ensuite : Une fois votre plan validé, vous passez à la prévente : vous vendez votre programme avant de l''avoir entièrement tourné.', null); v_rang := v_rang + 1;

  -- ÉTAPE 18 — VENDRE LA PEAU DE L'OURS
  v_module := pg_temp.liberty_module(v_f, 18, 'PARTIE 5 — PASSER AU SCALING', 'ÉTAPE 18 — VENDRE LA PEAU DE L''OURS', 'Prévendre votre programme et répondre aux objections

Ce que vous allez apprendre :
1. Le principe de la prévente
2. Préparer votre communauté
3. Adapter votre pitch à votre programme
4. Votre offre fondateurs
5. Les 3 objections au programme DIY, et comment y répondre');
  v_rang := 0;
  perform pg_temp.liberty_chapitre(v_module, v_rang, 'Principe de la prévente', null, null); v_rang := v_rang + 1;
  perform pg_temp.liberty_chapitre(v_module, v_rang, 'Préparer la communauté', null, null); v_rang := v_rang + 1;
  perform pg_temp.liberty_chapitre(v_module, v_rang, 'Adapter le pitch', null, null); v_rang := v_rang + 1;
  perform pg_temp.liberty_chapitre(v_module, v_rang, 'Offre fondateurs', null, null); v_rang := v_rang + 1;
  perform pg_temp.liberty_chapitre(v_module, v_rang, 'Les 3 objections au DIY', null, null); v_rang := v_rang + 1;
  perform pg_temp.liberty_chapitre(v_module, v_rang, 'Validation — à envoyer à Sidali sur WhatsApp', 'Ce que vous envoyez : Votre script de prévente et votre offre fondateurs (fichier Word rempli)

Comment : Envoyez-les sur le WhatsApp de Sidali.

Ensuite : Une fois validés, lancez votre prévente. Ensuite, le webinaire vous permettra de vendre à plusieurs personnes à la fois.', null); v_rang := v_rang + 1;

  -- ÉTAPE 19 — LE WEBINAIRE
  v_module := pg_temp.liberty_module(v_f, 19, 'PARTIE 5 — PASSER AU SCALING', 'ÉTAPE 19 — LE WEBINAIRE', 'Présenter votre méthode à plusieurs personnes à la fois

Ce que vous allez apprendre :
1. Pourquoi un webinaire
2. Le déroulé du template
3. Personnaliser le template à votre niche
4. Faire venir du monde, puis animer
5. Ce qui se passe après, et les chiffres à suivre');
  v_rang := 0;
  perform pg_temp.liberty_chapitre(v_module, v_rang, 'Pourquoi un webinaire', null, null); v_rang := v_rang + 1;
  perform pg_temp.liberty_chapitre(v_module, v_rang, 'Le déroulé du template', null, null); v_rang := v_rang + 1;
  perform pg_temp.liberty_chapitre(v_module, v_rang, 'Le personnaliser', null, null); v_rang := v_rang + 1;
  perform pg_temp.liberty_chapitre(v_module, v_rang, 'Faire venir et animer', null, null); v_rang := v_rang + 1;
  perform pg_temp.liberty_chapitre(v_module, v_rang, 'L''après et les chiffres', null, null); v_rang := v_rang + 1;
  perform pg_temp.liberty_chapitre(v_module, v_rang, 'Outil 10 — Mon template webinaire', 'Ce que vous remplissez :
• Les éléments à personnaliser, entre « » dans le template : votre prénom et nom, votre méthode, votre pivot narratif, votre avatar et son résultat rêvé
• Vos preuves : constat chiffré, résultats de vos clients, témoignages
• Votre programme : nom, étapes, rythme du coaching, délai de réponse, bonus
• Votre offre : prix, réduction pour aujourd''hui, garantie reprise du contrat
• Les exemples du guide et le prompt Claude vous aident à trouver vos phrases

Ce que vous obtenez : Votre PowerPoint de 103 slides, généré automatiquement avec tous vos textes à la bonne place, prêt à présenter. Vous n''avez plus à modifier chaque slide à la main.', 'liberty_webinaire'); v_rang := v_rang + 1;
  perform pg_temp.liberty_chapitre(v_module, v_rang, 'Validation — à envoyer à Sidali sur WhatsApp', 'Ce que vous envoyez : Votre template webinaire personnalisé (généré par l''outil)

Comment : Envoyez-le sur le WhatsApp de Sidali.

Ensuite : Une fois validé, fixez votre date et lancez la promotion.', null); v_rang := v_rang + 1;

  -- ÉTAPE 20 — MEDIA BUYING
  v_module := pg_temp.liberty_module(v_f, 20, 'PARTIE 5 — PASSER AU SCALING', 'ÉTAPE 20 — MEDIA BUYING', 'Payer pour amplifier ce qui fonctionne déjà

Ce que vous allez apprendre :
1. Partie théorique : comprendre la publicité et son rôle dans votre tunnel
2. Écrire votre script publicitaire
3. Les règles publicitaires de Meta
4. Piloter une campagne avec vos chiffres
5. Partie pratique : votre page Facebook et votre Business Manager
6. Votre compte publicitaire, vos accès, votre pixel, puis votre première campagne');
  v_rang := 0;
  perform pg_temp.liberty_chapitre(v_module, v_rang, 'MODULE 1 — Comprendre la publicité', null, null); v_rang := v_rang + 1;
  perform pg_temp.liberty_chapitre(v_module, v_rang, 'MODULE 2 — Écrire votre script publicitaire', null, null); v_rang := v_rang + 1;
  perform pg_temp.liberty_chapitre(v_module, v_rang, 'MODULE 3 — Les règles de Meta', null, null); v_rang := v_rang + 1;
  perform pg_temp.liberty_chapitre(v_module, v_rang, 'MODULE 4 — Piloter une campagne avec vos chiffres', null, null); v_rang := v_rang + 1;
  perform pg_temp.liberty_chapitre(v_module, v_rang, 'Validation — à envoyer à Sidali sur WhatsApp', 'Ce que vous envoyez : Votre premier script publicitaire (fichier Word rempli), avec vos 3 accroches et votre plan de campagne

Comment : Envoyez-le sur le WhatsApp de Sidali.

Ensuite : Une fois votre script validé, tournez vos publicités. Puis passez à la partie pratique pour tout mettre en place.', null); v_rang := v_rang + 1;
  perform pg_temp.liberty_chapitre(v_module, v_rang, 'MODULE 5 — Votre page Facebook et votre Business Manager', 'Module en préparation : il sera tourné et mis en ligne prochainement.', null); v_rang := v_rang + 1;
  perform pg_temp.liberty_chapitre(v_module, v_rang, 'MODULE 6 — Paramétrer votre Business Manager', 'Module en préparation : il sera tourné et mis en ligne prochainement.', null); v_rang := v_rang + 1;
  perform pg_temp.liberty_chapitre(v_module, v_rang, 'MODULE 7 — Créer et connecter votre pixel', 'Module en préparation : il sera tourné et mis en ligne prochainement.', null); v_rang := v_rang + 1;
  perform pg_temp.liberty_chapitre(v_module, v_rang, 'MODULE 8 — Lancer votre première campagne', 'Module en préparation : il sera tourné et mis en ligne prochainement.', null); v_rang := v_rang + 1;
  perform pg_temp.liberty_chapitre(v_module, v_rang, 'Validation — consulting avec Sidali', 'Ce que vous envoyez :
• Votre Business Manager paramétré : page, Instagram, compte publicitaire, moyen de paiement, administrateurs
• Votre pixel, avec les événements « PageView » et « Lead » qui remontent
• Votre plan de campagne (celui de votre script publicitaire validé)

Comment : Réservez un consulting avec Sidali : il vérifie tout avec vous, en direct, avant que vous lanciez.

Ensuite : Une fois validé, publiez votre campagne et suivez vos chiffres chaque semaine (module 4).', null); v_rang := v_rang + 1;

  -- BONUS — MID-TICKET ET LOW-TICKET
  v_module := pg_temp.liberty_module(v_f, 21, 'BONUS', 'BONUS — MID-TICKET ET LOW-TICKET', 'Deux offres simples, construites à partir de votre programme

Ce que vous allez apprendre :
1. Le rôle de ces deux offres
2. Créer votre offre mid-ticket
3. Créer votre offre low-ticket
4. Votre page de vente
5. Votre séquence d''e-mails de bienvenue');
  v_rang := 0;
  perform pg_temp.liberty_chapitre(v_module, v_rang, 'Rôle de ces offres', null, null); v_rang := v_rang + 1;
  perform pg_temp.liberty_chapitre(v_module, v_rang, 'Offre mid-ticket', null, null); v_rang := v_rang + 1;
  perform pg_temp.liberty_chapitre(v_module, v_rang, 'Offre low-ticket', null, null); v_rang := v_rang + 1;
  perform pg_temp.liberty_chapitre(v_module, v_rang, 'Page de vente', null, null); v_rang := v_rang + 1;
  perform pg_temp.liberty_chapitre(v_module, v_rang, 'E-mails de bienvenue', null, null); v_rang := v_rang + 1;
  perform pg_temp.liberty_chapitre(v_module, v_rang, 'Outil 11 — Mes offres mid et low-ticket', 'Ce que vous remplissez :
• Mid-ticket : le contenu gardé, la durée d''accès, le prix
• Low-ticket : le format, le problème réglé, le titre, le plan des chapitres, le prix
• Votre page de vente, section par section
• Vos 5 e-mails de bienvenue

Ce que vous obtenez : Vos deux fiches offres, le texte de votre page de vente et vos 5 e-mails, en PDF ou Word.', 'liberty_mid_low'); v_rang := v_rang + 1;
  perform pg_temp.liberty_chapitre(v_module, v_rang, 'Validation — à envoyer à Sidali sur WhatsApp', 'Ce que vous envoyez : Vos offres mid-ticket et low-ticket (document généré par l''outil)

Comment : Envoyez-les sur le WhatsApp de Sidali.

Ensuite : Une fois validées, mettez-les en ligne et proposez-les au bon moment : en appel, après un webinaire, dans vos contenus.', null); v_rang := v_rang + 1;
end $$;

-- ── 5. Une seule progression (décision 2A) : reprise de l'existant ─────────
-- (sans déclencher Discord ni la synchronisation, comme le 12/10)
set local app.parcours_reprise = 'on';

insert into public.chapitre_progress (user_id, chapitre_id, completed_at)
select cp.user_id, corr.copie_id, min(cp.completed_at)
from public.chapitre_progress cp
join public.parcours_correspondances_chapitres corr on corr.source_chapitre_id = cp.chapitre_id
join public.formation_chapitres ch on ch.id = corr.copie_id
join public.formation_modules m on m.id = ch.module_id
join public.formations f on f.id = m.formation_id and f.slug = 'parcours-liberty'
group by cp.user_id, corr.copie_id
on conflict (user_id, chapitre_id) do nothing;

insert into public.quiz_attempts (user_id, quiz_id, errors_count, total_questions, answers, validated, completed_at)
select distinct on (qa.user_id, corr.copie_quiz_id)
       qa.user_id, corr.copie_quiz_id, qa.errors_count, qa.total_questions, qa.answers, true, qa.completed_at
from public.quiz_attempts qa
join public.parcours_correspondances_quiz corr on corr.source_quiz_id = qa.quiz_id
join public.quizzes qc on qc.id = corr.copie_quiz_id
join public.formation_chapitres ch on ch.id = qc.chapitre_id
join public.formation_modules m on m.id = ch.module_id
join public.formations f on f.id = m.formation_id and f.slug = 'parcours-liberty'
where qa.validated
  and not exists (select 1 from public.quiz_attempts x where x.user_id = qa.user_id and x.quiz_id = corr.copie_quiz_id and x.validated)
order by qa.user_id, corr.copie_quiz_id, qa.completed_at;

set local app.parcours_reprise = 'off';
