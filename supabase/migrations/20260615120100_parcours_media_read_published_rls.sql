-- Sécurité : les vidéos/ressources d'un chapitre de parcours en BROUILLON étaient
-- lisibles par tout utilisateur authentifié (policy SELECT qual = true). On exige
-- désormais que le chapitre parent soit publié (ou que l'appelant soit CEO), comme
-- pour les 3 tables parent (parcours / parcours_phases / parcours_chapitres).

DROP POLICY IF EXISTS parcours_videos_select_authenticated ON public.parcours_chapitre_videos;
CREATE POLICY parcours_videos_select_published ON public.parcours_chapitre_videos
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.parcours_chapitres c
      WHERE c.id = parcours_chapitre_videos.chapitre_id
        AND (c.status = 'published' OR public.get_user_role() = 'ceo')
    )
  );

DROP POLICY IF EXISTS parcours_ressources_select_authenticated ON public.parcours_chapitre_ressources;
CREATE POLICY parcours_ressources_select_published ON public.parcours_chapitre_ressources
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.parcours_chapitres c
      WHERE c.id = parcours_chapitre_ressources.chapitre_id
        AND (c.status = 'published' OR public.get_user_role() = 'ceo')
    )
  );
