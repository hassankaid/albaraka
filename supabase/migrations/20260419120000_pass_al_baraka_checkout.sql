-- PASS AL BARAKA — Infrastructure de checkout Stripe + onboarding élève
-- Remplace les bons de commande externes (systeme.io) par un flow natif.

-- ============================================================
-- 1. profiles : flags d'origine et d'onboarding élève
-- ============================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS origin TEXT NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS discord_joined_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS welcome_video_completed_at TIMESTAMPTZ;

-- Rétro-fit : les apporteurs early_access existants ne doivent pas être bloqués
-- par le guard Discord. On les taggue 'early_access' pour qu'ils bypass le guard.
UPDATE public.profiles
SET origin = 'early_access'
WHERE origin = 'manual' AND early_access = true;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_origin_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_origin_check
  CHECK (origin IN ('manual', 'early_access', 'bon_commande', 'systeme_io'));

COMMENT ON COLUMN public.profiles.origin IS
  'Provenance du compte: manual (création admin), early_access (ouverture anticipée), bon_commande (checkout Stripe natif), systeme_io (webhook legacy)';
COMMENT ON COLUMN public.profiles.discord_joined_at IS
  'Timestamp du clic sur le bouton rejoindre Discord (débloque le parcours pour origin=bon_commande)';
COMMENT ON COLUMN public.profiles.welcome_video_completed_at IS
  'Timestamp de fin de visionnage de la vidéo bienvenue (1er chapitre Al Baraka)';

-- ============================================================
-- 2. sales : extension pour Stripe Checkout
-- ============================================================
ALTER TABLE public.sales
  ADD COLUMN IF NOT EXISTS stripe_session_id TEXT,
  ADD COLUMN IF NOT EXISTS coupon_code TEXT,
  ADD COLUMN IF NOT EXISTS discount_amount NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS buyer_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'sales_stripe_session_id_key'
  ) THEN
    ALTER TABLE public.sales ADD CONSTRAINT sales_stripe_session_id_key UNIQUE (stripe_session_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS sales_buyer_profile_id_idx ON public.sales(buyer_profile_id);

-- ============================================================
-- 3. payments : lien vers les objets Stripe
-- ============================================================
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_invoice_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

CREATE INDEX IF NOT EXISTS payments_stripe_subscription_id_idx
  ON public.payments(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS payments_stripe_payment_intent_id_idx
  ON public.payments(stripe_payment_intent_id);

-- ============================================================
-- 4. coupons : table dédiée pour la gestion des codes promo
-- ============================================================
CREATE TABLE IF NOT EXISTS public.coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  discount_percent INT NOT NULL CHECK (discount_percent BETWEEN 1 AND 100),
  stripe_coupon_id TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMPTZ,
  max_redemptions INT,
  times_redeemed INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "coupons_anon_read_active" ON public.coupons;
CREATE POLICY "coupons_anon_read_active"
  ON public.coupons FOR SELECT
  USING (active = true);

DROP POLICY IF EXISTS "coupons_ceo_manage" ON public.coupons;
CREATE POLICY "coupons_ceo_manage"
  ON public.coupons FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'ceo'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'ceo'
    )
  );

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.touch_coupons_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS coupons_touch_updated_at ON public.coupons;
CREATE TRIGGER coupons_touch_updated_at
  BEFORE UPDATE ON public.coupons
  FOR EACH ROW EXECUTE FUNCTION public.touch_coupons_updated_at();

-- Seed du coupon ALBARAKA20 (-20%)
INSERT INTO public.coupons (code, discount_percent, active)
VALUES ('ALBARAKA20', 20, true)
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- 5. Fonction RPC publique : validation d'un code promo côté checkout
-- ============================================================
CREATE OR REPLACE FUNCTION public.validate_coupon(p_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_coupon public.coupons%ROWTYPE;
BEGIN
  SELECT * INTO v_coupon
  FROM public.coupons
  WHERE UPPER(code) = UPPER(p_code) AND active = true
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'not_found');
  END IF;

  IF v_coupon.expires_at IS NOT NULL AND v_coupon.expires_at < now() THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'expired');
  END IF;

  IF v_coupon.max_redemptions IS NOT NULL
     AND v_coupon.times_redeemed >= v_coupon.max_redemptions THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'max_redemptions_reached');
  END IF;

  RETURN jsonb_build_object(
    'valid', true,
    'code', v_coupon.code,
    'discount_percent', v_coupon.discount_percent
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.validate_coupon(TEXT) TO anon, authenticated;
