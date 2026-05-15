-- =====================================================================
-- Affichage exhaustif des formations dans /training (Mes formations)
-- + introduction de access_mode pour gérer les cas non-parcours
-- =====================================================================
-- Aujourd'hui la RLS de `formations` filtre par enrollment : un membre
-- ne voit QUE les formations où il est inscrit. Du coup les formations
-- pas encore débloquées (= pas encore enrollées via le parcours) ne sont
-- même pas listées avec cadenas → mauvaise UX.
--
-- Objectif : afficher TOUTES les formations publiées à tout user
-- authentifié (avec cadenas pour celles non accessibles), tout en
-- gardant le contenu pédagogique (modules/chapitres/vidéos) strictement
-- protégé par leurs propres RLS.
--
-- Notion d'access_mode (nouvelle colonne sur formations) :
--   - 'parcours'       : déblocage progressif via le parcours AL BARAKA
--                        (cadenas tant que pas enrolled — comportement actuel)
--   - 'free'           : librement accessible à tout user authentifié
--   - 'liberty_only'   : réservée aux membres pass Liberty (cadenas
--                        message "Liberty only" pour les AL BARAKA)
--   - 'al_baraka_only' : symétrique (futur usage)
--
-- Valeurs initiales appliquées :
--   - ESTIMACTION                       → free
--   - OFFER CREATION, COPYWRITING       → liberty_only
--   - Toutes les autres formations      → parcours (défaut, inchangé)

-- 0) Étendre le CHECK de formation_enrollments.source pour autoriser 'auto_free'
ALTER TABLE public.formation_enrollments
  DROP CONSTRAINT IF EXISTS formation_enrollments_source_check;
ALTER TABLE public.formation_enrollments
  ADD CONSTRAINT formation_enrollments_source_check
  CHECK (source = ANY (ARRAY['manual','systemeio','stripe','gift','coach_grant','import','parcours','auto_free']));

-- 1) Nouvelle colonne access_mode
ALTER TABLE public.formations
  ADD COLUMN IF NOT EXISTS access_mode TEXT NOT NULL DEFAULT 'parcours';

ALTER TABLE public.formations
  DROP CONSTRAINT IF EXISTS formations_access_mode_check;
ALTER TABLE public.formations
  ADD CONSTRAINT formations_access_mode_check
  CHECK (access_mode IN ('parcours', 'free', 'liberty_only', 'al_baraka_only'));

-- 2) Valeurs initiales
UPDATE public.formations SET access_mode = 'free'         WHERE slug = 'estimaction';
UPDATE public.formations SET access_mode = 'liberty_only' WHERE slug IN ('offer-creation', 'copywriting');

-- 3) RLS : SELECT publique sur les formations publiées (pour tout authentifié)
DROP POLICY IF EXISTS formations_select_public ON public.formations;
CREATE POLICY formations_select_public ON public.formations
  FOR SELECT
  TO authenticated
  USING (status = 'published');

-- 4) Backfill : enroller tous les users actifs aux formations 'free'
INSERT INTO public.formation_enrollments (user_id, formation_id, source, granted_at)
SELECT p.id, f.id, 'auto_free', now()
FROM public.profiles p
CROSS JOIN public.formations f
WHERE f.access_mode = 'free'
  AND f.status = 'published'
  AND p.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM public.formation_enrollments fe
    WHERE fe.user_id = p.id AND fe.formation_id = f.id AND fe.revoked_at IS NULL
  );

-- 5) Trigger : auto-enroll les NOUVEAUX users aux formations 'free'
CREATE OR REPLACE FUNCTION public.auto_enroll_user_to_free_formations()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
BEGIN
  INSERT INTO public.formation_enrollments (user_id, formation_id, source, granted_at)
  SELECT NEW.id, f.id, 'auto_free', now()
  FROM public.formations f
  WHERE f.access_mode = 'free' AND f.status = 'published'
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$func$;

DROP TRIGGER IF EXISTS trg_auto_enroll_free_formations ON public.profiles;
CREATE TRIGGER trg_auto_enroll_free_formations
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_enroll_user_to_free_formations();

-- 6) Trigger : à la création/passage en 'free' d'une formation, enroll tous les users actifs
CREATE OR REPLACE FUNCTION public.auto_enroll_all_users_to_new_free_formation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
BEGIN
  IF NEW.access_mode = 'free' AND NEW.status = 'published' THEN
    INSERT INTO public.formation_enrollments (user_id, formation_id, source, granted_at)
    SELECT p.id, NEW.id, 'auto_free', now()
    FROM public.profiles p
    WHERE p.is_active = true
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$func$;

DROP TRIGGER IF EXISTS trg_auto_enroll_on_free_formation ON public.formations;
CREATE TRIGGER trg_auto_enroll_on_free_formation
  AFTER INSERT OR UPDATE OF access_mode, status ON public.formations
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_enroll_all_users_to_new_free_formation();
