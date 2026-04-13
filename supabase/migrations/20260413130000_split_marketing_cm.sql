-- Scission Marketing Digital / Community Management
-- AVANT : 1 formation "MARKETING DIGITAL & COMMUNITY MANAGEMENT" (id 4949ffda...) avec 4 modules / 12 chapitres fusionnés
-- APRÈS :
--   - Formation "MARKETING DIGITAL INSTAGRAM" (même id 4949ffda... pour préserver le parcours AL BARAKA)
--     → 10 modules (1 chapitre placeholder par module)
--   - Formation "COMMUNITY MANAGEMENT" (nouveau slug community-management, nouvel id)
--     → 9 modules (1 chapitre placeholder par module)

do $$
declare
  v_md_id uuid := '4949ffda-77d2-450e-adad-83554645af32';
  v_cm_id uuid;
  v_module_id uuid;
  v_chap_id uuid;
begin
  -- Protection idempotence
  if exists (select 1 from public.formations where slug = 'community-management') then
    raise notice 'Split Marketing/CM déjà effectué, skip.';
    return;
  end if;

  -- ═══════════════════════════════════════════
  -- 1. Nettoyage de l'ancienne formation (4 modules placeholder)
  -- ═══════════════════════════════════════════
  delete from public.chapitre_videos
    where chapitre_id in (
      select c.id from public.formation_chapitres c
      join public.formation_modules m on m.id = c.module_id
      where m.formation_id = v_md_id
    );
  delete from public.chapitre_ressources
    where chapitre_id in (
      select c.id from public.formation_chapitres c
      join public.formation_modules m on m.id = c.module_id
      where m.formation_id = v_md_id
    );
  delete from public.video_progress
    where video_id in (
      select cv.id from public.chapitre_videos cv
      join public.formation_chapitres c on c.id = cv.chapitre_id
      join public.formation_modules m on m.id = c.module_id
      where m.formation_id = v_md_id
    );
  delete from public.chapitre_progress
    where chapitre_id in (
      select c.id from public.formation_chapitres c
      join public.formation_modules m on m.id = c.module_id
      where m.formation_id = v_md_id
    );
  delete from public.formation_chapitres
    where module_id in (
      select id from public.formation_modules where formation_id = v_md_id
    );
  delete from public.formation_modules where formation_id = v_md_id;

  -- ═══════════════════════════════════════════
  -- 2. MARKETING DIGITAL INSTAGRAM — rename + 10 modules
  -- ═══════════════════════════════════════════
  update public.formations
    set titre = 'MARKETING DIGITAL INSTAGRAM',
        description = 'De la stratégie à l''acquisition client — 10 modules, 247 slides, 300 questions.',
        updated_at = now()
  where id = v_md_id;

  -- Module 1 — Fondements & Écosystème
  insert into public.formation_modules (formation_id, titre, description, ordre, status)
    values (v_md_id, 'Fondements & Écosystème', 'Marketing digital, Instagram, métriques clés, 4 piliers, parcours Étranger → Client.', 0, 'published')
    returning id into v_module_id;
  insert into public.formation_chapitres (module_id, titre, description, ordre, status)
    values (v_module_id, 'Fondements & Écosystème — Vidéo complète', 'Tour complet du module.', 0, 'published');

  -- Module 2 — Psychologie du consommateur digital
  insert into public.formation_modules (formation_id, titre, description, ordre, status)
    values (v_md_id, 'Psychologie du consommateur digital', 'Loi du moindre effort, WIIFM, biais cognitifs, éthique de la persuasion.', 1, 'published')
    returning id into v_module_id;
  insert into public.formation_chapitres (module_id, titre, description, ordre, status)
    values (v_module_id, 'Psychologie du consommateur — Vidéo complète', 'Tour complet du module.', 0, 'published');

  -- Module 3 — Stratégie de contenu, persona & repurposing
  insert into public.formation_modules (formation_id, titre, description, ordre, status)
    values (v_md_id, 'Stratégie de contenu, persona & repurposing', '5 questions fondatrices, persona 7D, 4 formats, calendrier 80/20, repurposing 1→7.', 2, 'published')
    returning id into v_module_id;
  insert into public.formation_chapitres (module_id, titre, description, ordre, status)
    values (v_module_id, 'Stratégie de contenu — Vidéo complète', 'Tour complet du module.', 0, 'published');

  -- Module 4 — Réseaux sociaux & profil Instagram optimisé
  insert into public.formation_modules (formation_id, titre, description, ordre, status)
    values (v_md_id, 'Réseaux sociaux & profil Instagram optimisé', 'Profil = carte de visite, bio 4 lignes, stories à la une, certification.', 3, 'published')
    returning id into v_module_id;
  insert into public.formation_chapitres (module_id, titre, description, ordre, status)
    values (v_module_id, 'Profil Instagram optimisé — Vidéo complète', 'Tour complet du module.', 0, 'published');

  -- Module 5 — Réels : Stratégie & Création
  insert into public.formation_modules (formation_id, titre, description, ordre, status)
    values (v_md_id, 'Réels : Stratégie & Création', 'TOFU-MOFU-BOFU, mimétisation, structure Hook→Problème→Solution→Preuve→CTA, MVE 7 éléments.', 4, 'published')
    returning id into v_module_id;
  insert into public.formation_chapitres (module_id, titre, description, ordre, status)
    values (v_module_id, 'Réels Stratégie & Création — Vidéo complète', 'Tour complet du module.', 0, 'published');

  -- Module 6 — Réels : Algorithme & Viralité
  insert into public.formation_modules (formation_id, titre, description, ordre, status)
    values (v_md_id, 'Réels : Algorithme & Viralité', 'Hashtags, heures, qualité, signaux sociaux (Watchtime > Partages > ...).', 5, 'published')
    returning id into v_module_id;
  insert into public.formation_chapitres (module_id, titre, description, ordre, status)
    values (v_module_id, 'Algorithme & Viralité — Vidéo complète', 'Tour complet du module.', 0, 'published');

  -- Module 7 — Stories & Routines de croissance
  insert into public.formation_modules (formation_id, titre, description, ordre, status)
    values (v_md_id, 'Stories & Routines de croissance', '5 types de stories, stickers, planning hebdo, routines 30-45min.', 6, 'published')
    returning id into v_module_id;
  insert into public.formation_chapitres (module_id, titre, description, ordre, status)
    values (v_module_id, 'Stories & Routines — Vidéo complète', 'Tour complet du module.', 0, 'published');

  -- Module 8 — Boost Instagram : Amplifier vos Réels
  insert into public.formation_modules (formation_id, titre, description, ordre, status)
    values (v_md_id, 'Boost Instagram : Amplifier vos Réels', '5 niveaux Schwartz, quand booster, guide step-by-step, lecture des résultats.', 7, 'published')
    returning id into v_module_id;
  insert into public.formation_chapitres (module_id, titre, description, ordre, status)
    values (v_module_id, 'Boost Instagram — Vidéo complète', 'Tour complet du module.', 0, 'published');

  -- Module 9 — Le Parcours Client
  insert into public.formation_modules (formation_id, titre, description, ordre, status)
    values (v_md_id, 'Le Parcours Client', '5 étapes : Attirer → Connecter → Engager → Convertir → Fidéliser.', 8, 'published')
    returning id into v_module_id;
  insert into public.formation_chapitres (module_id, titre, description, ordre, status)
    values (v_module_id, 'Parcours Client — Vidéo complète', 'Tour complet du module.', 0, 'published');

  -- Module 10 — Analytics, IA & Stratégie long terme
  insert into public.formation_modules (formation_id, titre, description, ordre, status)
    values (v_md_id, 'Analytics, IA & Stratégie long terme', 'Statistiques IG, Claude pour le contenu, VN/CapCut, stratégie par stade, 10 règles d''or.', 9, 'published')
    returning id into v_module_id;
  insert into public.formation_chapitres (module_id, titre, description, ordre, status)
    values (v_module_id, 'Analytics, IA & Stratégie — Vidéo complète', 'Tour complet du module.', 0, 'published');

  -- ═══════════════════════════════════════════
  -- 3. COMMUNITY MANAGEMENT — nouvelle formation + 9 modules
  -- ═══════════════════════════════════════════
  insert into public.formations (slug, titre, description, status, ordre)
    values (
      'community-management',
      'COMMUNITY MANAGEMENT',
      'De la stratégie à l''acquisition client — 9 modules, 92 slides, 270 questions.',
      'published',
      (select coalesce(max(ordre), 0) + 1 from public.formations)
    )
    returning id into v_cm_id;

  -- Module 01 — Le Métier de Community Manager
  insert into public.formation_modules (formation_id, titre, description, ordre, status)
    values (v_cm_id, 'Le Métier de Community Manager', 'CM pour soi vs CM pour client, compétences, journée type, outils, types de clients.', 0, 'published')
    returning id into v_module_id;
  insert into public.formation_chapitres (module_id, titre, description, ordre, status)
    values (v_module_id, 'Le Métier de CM — Vidéo complète', 'Tour complet du module.', 0, 'published');

  -- Module 02 — Extraire l'Identité de Marque d'un Client
  insert into public.formation_modules (formation_id, titre, description, ordre, status)
    values (v_cm_id, 'Extraire l''Identité de Marque d''un Client', 'Brief client 3 parties, charte éditoriale, piliers de contenu par niche.', 1, 'published')
    returning id into v_module_id;
  insert into public.formation_chapitres (module_id, titre, description, ordre, status)
    values (v_module_id, 'Identité de Marque — Vidéo complète', 'Tour complet du module.', 0, 'published');

  -- Module 03 — Calendrier Éditorial Professionnel
  insert into public.formation_modules (formation_id, titre, description, ordre, status)
    values (v_cm_id, 'Calendrier Éditorial Professionnel', 'Vue mensuelle + hebdo, 8 colonnes Google Sheet, production en lot, validation 48h.', 2, 'published')
    returning id into v_module_id;
  insert into public.formation_chapitres (module_id, titre, description, ordre, status)
    values (v_module_id, 'Calendrier Éditorial — Vidéo complète', 'Tour complet du module.', 0, 'published');

  -- Module 04 — Modération & Gestion de Crise
  insert into public.formation_modules (formation_id, titre, description, ordre, status)
    values (v_cm_id, 'Modération & Gestion de Crise', '3 niveaux de problème, protocole de crise 4 étapes, IA pour la modération.', 3, 'published')
    returning id into v_module_id;
  insert into public.formation_chapitres (module_id, titre, description, ordre, status)
    values (v_module_id, 'Modération & Gestion de Crise — Vidéo complète', 'Tour complet du module.', 0, 'published');

  -- Module 05 — Reporting Client & Résultats
  insert into public.formation_modules (formation_id, titre, description, ordre, status)
    values (v_cm_id, 'Reporting Client & Résultats', 'KPIs essentiels, PDF 5-8 pages en 7 sections, justifier sa valeur.', 4, 'published')
    returning id into v_module_id;
  insert into public.formation_chapitres (module_id, titre, description, ordre, status)
    values (v_module_id, 'Reporting Client — Vidéo complète', 'Tour complet du module.', 0, 'published');

  -- Module 06 — TikTok & LinkedIn
  insert into public.formation_modules (formation_id, titre, description, ordre, status)
    values (v_cm_id, 'TikTok & LinkedIn', 'Algo, formats, déclinaison depuis Instagram, quand proposer un 2e canal.', 5, 'published')
    returning id into v_module_id;
  insert into public.formation_chapitres (module_id, titre, description, ordre, status)
    values (v_module_id, 'TikTok & LinkedIn — Vidéo complète', 'Tour complet du module.', 0, 'published');

  -- Module 07 — Offres, Prix & Packs CM
  insert into public.formation_modules (formation_id, titre, description, ordre, status)
    values (v_cm_id, 'Offres, Prix & Packs CM', 'Pack Essentiel 300-500€ · Croissance 600-1000€ · Premium 1200-2000€.', 6, 'published')
    returning id into v_module_id;
  insert into public.formation_chapitres (module_id, titre, description, ordre, status)
    values (v_module_id, 'Offres, Prix & Packs — Vidéo complète', 'Tour complet du module.', 0, 'published');

  -- Module 08 — Trouver ses Premiers Clients
  insert into public.formation_modules (formation_id, titre, description, ordre, status)
    values (v_cm_id, 'Trouver ses Premiers Clients', 'Profil IG vitrine, audit gratuit, scripts DM, 5 canaux, portfolio.', 7, 'published')
    returning id into v_module_id;
  insert into public.formation_chapitres (module_id, titre, description, ordre, status)
    values (v_module_id, 'Trouver ses Premiers Clients — Vidéo complète', 'Tour complet du module.', 0, 'published');

  -- Module 09 — Gérer la Relation Client
  insert into public.formation_modules (formation_id, titre, description, ordre, status)
    values (v_cm_id, 'Gérer la Relation Client', 'Onboarding 7 jours, communication, gestion hors périmètre, augmentation de prix, fin de collaboration.', 8, 'published')
    returning id into v_module_id;
  insert into public.formation_chapitres (module_id, titre, description, ordre, status)
    values (v_module_id, 'Gérer la Relation Client — Vidéo complète', 'Tour complet du module.', 0, 'published');
end $$;
