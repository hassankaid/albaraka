-- =====================================================================
-- Sprint A — Catalogue des offres standards + extension codes promo
-- =====================================================================
-- Objectif : permettre la refonte de l'admin payment-links en 3 onglets.
--   - Table `offers` : catalogue officiel des offres (AL BARAKA, Liberty,
--     formations à la carte) — prix et fourchette de mensualités pilotables
--     depuis l'admin.
--   - `coupons` : étendu avec type (percent ou fixed_eur) et ciblage par
--     offre ou catégorie.
--   - Seed : AL BARAKA 3000€ (1-8×), Liberty 5000€ (1-10×), 9 formations à
--     la carte à 500€ (toutes sauf Muslim Mindset et Administratif).
--   - Code promo AB1000 (-1000€ sur AL BARAKA).
--   - Nettoyage : suppression des anciens codes promo non utilisés
--     (ALBARAKA20, LIBERTY2000).

-- 1) Catalogue des offres officielles
CREATE TABLE IF NOT EXISTS public.offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  category text NOT NULL CHECK (category IN ('al_baraka','liberty','a_la_carte')),
  label text NOT NULL,
  default_price_ht numeric NOT NULL CHECK (default_price_ht > 0),
  min_installments_count int NOT NULL DEFAULT 1 CHECK (min_installments_count >= 1),
  max_installments_count int NOT NULL DEFAULT 1 CHECK (max_installments_count >= 1),
  formation_id uuid REFERENCES public.formations(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT offers_min_le_max CHECK (min_installments_count <= max_installments_count)
);
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS offers_select_authenticated ON public.offers;
CREATE POLICY offers_select_authenticated ON public.offers
  FOR SELECT TO authenticated USING (status = 'active' OR is_ceo(auth.uid()));
DROP POLICY IF EXISTS offers_write_ceo ON public.offers;
CREATE POLICY offers_write_ceo ON public.offers
  FOR ALL TO authenticated USING (is_ceo(auth.uid())) WITH CHECK (is_ceo(auth.uid()));

-- 2) Étendre coupons : type + ciblage
ALTER TABLE public.coupons
  ADD COLUMN IF NOT EXISTS discount_type text NOT NULL DEFAULT 'percent';
ALTER TABLE public.coupons
  DROP CONSTRAINT IF EXISTS coupons_discount_type_check;
ALTER TABLE public.coupons
  ADD CONSTRAINT coupons_discount_type_check
  CHECK (discount_type IN ('percent','fixed_eur'));

ALTER TABLE public.coupons
  ADD COLUMN IF NOT EXISTS discount_amount_eur numeric,
  ADD COLUMN IF NOT EXISTS applies_to_offer_ids uuid[],
  ADD COLUMN IF NOT EXISTS applies_to_categories text[];

ALTER TABLE public.coupons ALTER COLUMN discount_percent DROP NOT NULL;
ALTER TABLE public.coupons DROP CONSTRAINT IF EXISTS coupons_discount_percent_check;
ALTER TABLE public.coupons ADD CONSTRAINT coupons_discount_percent_check
  CHECK (discount_percent IS NULL OR (discount_percent BETWEEN 1 AND 100));

ALTER TABLE public.coupons DROP CONSTRAINT IF EXISTS coupons_value_consistency;
ALTER TABLE public.coupons ADD CONSTRAINT coupons_value_consistency CHECK (
  (discount_type = 'percent'   AND discount_percent IS NOT NULL AND discount_amount_eur IS NULL)
  OR
  (discount_type = 'fixed_eur' AND discount_amount_eur IS NOT NULL AND discount_percent IS NULL)
);

DROP POLICY IF EXISTS coupons_select_active ON public.coupons;
CREATE POLICY coupons_select_active ON public.coupons
  FOR SELECT TO authenticated USING (active = true OR is_ceo(auth.uid()));
DROP POLICY IF EXISTS coupons_write_ceo ON public.coupons;
CREATE POLICY coupons_write_ceo ON public.coupons
  FOR ALL TO authenticated USING (is_ceo(auth.uid())) WITH CHECK (is_ceo(auth.uid()));
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

-- 3) Nettoyer codes promo obsolètes
DELETE FROM public.coupons WHERE code IN ('ALBARAKA20','LIBERTY2000');

-- 4) Seed des 2 offres officielles
INSERT INTO public.offers (slug, category, label, default_price_ht, min_installments_count, max_installments_count) VALUES
  ('al-baraka', 'al_baraka', 'Pass AL BARAKA', 3000, 1, 8),
  ('liberty',   'liberty',   'Pass Liberty',   5000, 1, 10)
ON CONFLICT (slug) DO NOTHING;

-- 5) Seed des formations à la carte (toutes sauf Muslim Mindset + Administratif)
INSERT INTO public.offers (slug, category, label, default_price_ht, min_installments_count, max_installments_count, formation_id)
SELECT f.slug, 'a_la_carte', 'Formation ' || f.titre, 500, 1, 1, f.id
FROM public.formations f
WHERE f.status = 'published'
  AND f.slug NOT IN ('muslim-mindset', 'administratif')
ON CONFLICT (slug) DO NOTHING;

-- 6) Créer AB1000 (-1000€ sur AL BARAKA)
INSERT INTO public.coupons (code, discount_type, discount_amount_eur, discount_percent, applies_to_offer_ids, active)
SELECT 'AB1000', 'fixed_eur', 1000, NULL, ARRAY[id], true
FROM public.offers WHERE slug = 'al-baraka'
ON CONFLICT (code) DO NOTHING;

-- 7) Trigger updated_at sur offers
CREATE OR REPLACE FUNCTION public.tg_offers_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $func$
BEGIN NEW.updated_at := now(); RETURN NEW; END;
$func$;

DROP TRIGGER IF EXISTS trg_offers_updated_at ON public.offers;
CREATE TRIGGER trg_offers_updated_at BEFORE UPDATE ON public.offers
  FOR EACH ROW EXECUTE FUNCTION public.tg_offers_updated_at();
