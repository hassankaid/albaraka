-- Sprint F1 — Prepare la BDD pour le checkout des formations a la carte.
--
-- 1) Backfill `offers.formation_id` : pour chaque offre 'a_la_carte', on lie
--    la formation portant le meme slug. Convention validee par audit : les
--    9 offres a la carte ont toutes une formation correspondante (closing,
--    community-management, copywriting, estimaction, marketing-digital,
--    offer-creation, personal-branding, setting, storytelling).
--
-- 2) CHECK formation_enrollments.source : ajouter 'a_la_carte' aux sources
--    autorisees, pour distinguer un enrollment issu d'un paiement formation
--    (vs. parcours AL BARAKA, gift, manual, etc.).

-- ── 1) Backfill formation_id par slug ────────────────────────────────────
UPDATE public.offers o
SET formation_id = f.id,
    updated_at = NOW()
FROM public.formations f
WHERE o.category = 'a_la_carte'
  AND o.formation_id IS NULL
  AND f.slug = o.slug
  AND f.status = 'published';

-- Verifier qu'on a bien rempli toutes les offres a la carte (sinon plante)
DO $$
DECLARE
  unfilled_count INT;
  unfilled_slugs TEXT;
BEGIN
  SELECT COUNT(*), STRING_AGG(slug, ', ')
  INTO unfilled_count, unfilled_slugs
  FROM public.offers
  WHERE category = 'a_la_carte' AND formation_id IS NULL;

  IF unfilled_count > 0 THEN
    RAISE EXCEPTION
      'Backfill incomplet: % offres a la carte sans formation_id : %',
      unfilled_count, unfilled_slugs;
  END IF;
END $$;

-- ── 2) Etendre le CHECK formation_enrollments.source ────────────────────
ALTER TABLE public.formation_enrollments
  DROP CONSTRAINT IF EXISTS formation_enrollments_source_check;

ALTER TABLE public.formation_enrollments
  ADD CONSTRAINT formation_enrollments_source_check
  CHECK (source = ANY (ARRAY[
    'manual'::text,
    'systemeio'::text,
    'stripe'::text,
    'gift'::text,
    'coach_grant'::text,
    'import'::text,
    'parcours'::text,
    'auto_free'::text,
    'a_la_carte'::text
  ]));

-- ── 3) Commentaire de doc ──
COMMENT ON COLUMN public.offers.formation_id IS
  'Pour les offres categorie=a_la_carte, FK vers la formation a debloquer apres paiement. Backfill par convention slug commun.';
