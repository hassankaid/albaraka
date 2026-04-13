-- Restructure Closing selon le plan Sidali (PLAN_FORMATION_CLOSING.docx)
-- AVANT : 5 modules (qui étaient des "parties") / 8 chapitres placeholder sans vidéo
-- APRÈS : 8 modules (1 par module du plan) / 8 chapitres (1 par module, titre = chapitre intégré du plan)

do $$
declare
  v_closing_id uuid := '7e533baa-7b5e-42cf-8473-6a9fd19c318f';
  v_module_id uuid;
begin
  -- Idempotence : le premier nouveau module s'appelle "Introduction & Mindset"
  if exists (
    select 1 from public.formation_modules
    where formation_id = v_closing_id
      and titre = 'Introduction & Mindset'
      and ordre = 0
  ) then
    raise notice 'Closing déjà restructuré, skip.';
    return;
  end if;

  -- Nettoyage cascade de l'ancienne structure
  delete from public.chapitre_videos where chapitre_id in (select c.id from public.formation_chapitres c join public.formation_modules m on m.id = c.module_id where m.formation_id = v_closing_id);
  delete from public.chapitre_ressources where chapitre_id in (select c.id from public.formation_chapitres c join public.formation_modules m on m.id = c.module_id where m.formation_id = v_closing_id);
  delete from public.video_progress where video_id in (select cv.id from public.chapitre_videos cv join public.formation_chapitres c on c.id = cv.chapitre_id join public.formation_modules m on m.id = c.module_id where m.formation_id = v_closing_id);
  delete from public.chapitre_progress where chapitre_id in (select c.id from public.formation_chapitres c join public.formation_modules m on m.id = c.module_id where m.formation_id = v_closing_id);
  delete from public.formation_chapitres where module_id in (select id from public.formation_modules where formation_id = v_closing_id);
  delete from public.formation_modules where formation_id = v_closing_id;

  update public.formations
    set description = 'L''art de conclure une vente — 8 modules, 122 slides, 280 questions.',
        updated_at = now()
  where id = v_closing_id;

  -- Module 1 — Introduction & Mindset
  insert into public.formation_modules (formation_id, titre, description, ordre, status)
    values (v_closing_id, 'Introduction & Mindset', 'Partie 1 — Qu''est-ce que le closing, profil du closer d''excellence, scénarios types.', 0, 'published')
    returning id into v_module_id;
  insert into public.formation_chapitres (module_id, titre, description, ordre, status)
    values (v_module_id, 'Comprendre la vente', 'Chapitre intégré du Module 1.', 0, 'published');

  -- Module 2 — Psychologie de la Décision
  insert into public.formation_modules (formation_id, titre, description, ordre, status)
    values (v_closing_id, 'Psychologie de la Décision', 'Partie 1 — Système émotionnel vs rationnel, douleur, confiance, 7 déclencheurs.', 1, 'published')
    returning id into v_module_id;
  insert into public.formation_chapitres (module_id, titre, description, ordre, status)
    values (v_module_id, 'Les boutons de confiance', 'Chapitre intégré du Module 2.', 0, 'published');

  -- Module 3 — Préparer son Appel
  insert into public.formation_modules (formation_id, titre, description, ordre, status)
    values (v_closing_id, 'Préparer son Appel', 'Partie 2 — Recherche prospect, état d''esprit, environnement, objectifs.', 2, 'published')
    returning id into v_module_id;
  insert into public.formation_chapitres (module_id, titre, description, ordre, status)
    values (v_module_id, 'Préparer son Appel — Vidéo complète', 'Contenu complet du module.', 0, 'published');

  -- Module 4 — Structure de l'Appel — Le Script Complet
  insert into public.formation_modules (formation_id, titre, description, ordre, status)
    values (v_closing_id, 'Structure de l''Appel — Le Script Complet', 'Partie 2 — Framework DECODE, script millimétré en 6 étapes.', 3, 'published')
    returning id into v_module_id;
  insert into public.formation_chapitres (module_id, titre, description, ordre, status)
    values (v_module_id, 'Construire un script millimétré', 'Chapitre intégré du Module 4.', 0, 'published');

  -- Module 5 — L'Offre & Le Prix
  insert into public.formation_modules (formation_id, titre, description, ordre, status)
    values (v_closing_id, 'L''Offre & Le Prix', 'Partie 2 — Présenter l''offre, annoncer le prix, intonations, vocabulaire.', 4, 'published')
    returning id into v_module_id;
  insert into public.formation_chapitres (module_id, titre, description, ordre, status)
    values (v_module_id, 'Les intonations du closer', 'Chapitre intégré du Module 5.', 0, 'published');

  -- Module 6 — Gestion des Objections — 12 Scripts
  insert into public.formation_modules (formation_id, titre, description, ordre, status)
    values (v_closing_id, 'Gestion des Objections — 12 Scripts', 'Partie 3 — Formule C.A.R.E., 12 scripts d''objection prêts à l''emploi.', 5, 'published')
    returning id into v_module_id;
  insert into public.formation_chapitres (module_id, titre, description, ordre, status)
    values (v_module_id, 'Gestion des Objections — Vidéo complète', 'Contenu complet du module.', 0, 'published');

  -- Module 7 — Techniques de Closing
  insert into public.formation_modules (formation_id, titre, description, ordre, status)
    values (v_closing_id, 'Techniques de Closing', 'Partie 3 — Échelle de conviction, questions puissantes, techniques de close avancées.', 6, 'published')
    returning id into v_module_id;
  insert into public.formation_chapitres (module_id, titre, description, ordre, status)
    values (v_module_id, 'Les finesses du closing', 'Chapitre intégré du Module 7.', 0, 'published');

  -- Module 8 — KPIs, Éthique & Progression
  insert into public.formation_modules (formation_id, titre, description, ordre, status)
    values (v_closing_id, 'KPIs, Éthique & Progression', 'Partie 4 — Métriques du closer, éthique de la vente, progression continue.', 7, 'published')
    returning id into v_module_id;
  insert into public.formation_chapitres (module_id, titre, description, ordre, status)
    values (v_module_id, 'L''analyse et suivi', 'Chapitre intégré du Module 8.', 0, 'published');
end $$;
