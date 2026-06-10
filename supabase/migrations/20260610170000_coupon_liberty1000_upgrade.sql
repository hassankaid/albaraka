-- =====================================================================
-- Upgrade Pass AL BARAKA -> Pass Liberty : code promo LIBERTY1000 (-4000 EUR)
-- =====================================================================
-- Objectif : un membre du Pass AL BARAKA peut passer au Pass Liberty pour
-- 1000 EUR (5000 - 4000) via le BON DE COMMANDE LIBERTY EXISTANT (/liberty,
-- 1x a 10x) + le code promo LIBERTY1000.
--
-- Garde-fou (demande Hassan) : le code n'est accepte QUE si l'adresse email
-- saisie correspond deja a un compte ayant un pass `al_baraka` actif. Ce
-- garde-fou fait d'une pierre deux coups :
--   1. reserve le tarif a 1000 EUR aux seuls membres AL BARAKA (un code "fuite"
--      ne sert a rien sans un compte AL BARAKA derriere l'email) ;
--   2. garantit que le pass Liberty tombe sur le BON compte : le webhook Stripe
--      retrouve le profil par email -> il ajoute Liberty au compte existant (et
--      conserve AL BARAKA, idempotent).
--
-- Mecanique de remise : reutilise le systeme de coupons existant (Sprint P).
-- Remise fixe de 4000 EUR ciblee sur l'offre Liberty -> total 1000 EUR, puis le
-- backend repartit ce total sur le nombre de mensualites du bon de commande
-- (1000 en 1x, en 6x, etc.). Meme principe que le coupon AB1000 (-1000 sur AL
-- BARAKA) deja en prod.

-- 1) Eligibilite : un coupon peut exiger un pass actif d'un certain type
ALTER TABLE public.coupons
  ADD COLUMN IF NOT EXISTS requires_active_pass text;
ALTER TABLE public.coupons
  DROP CONSTRAINT IF EXISTS coupons_requires_active_pass_check;
ALTER TABLE public.coupons
  ADD CONSTRAINT coupons_requires_active_pass_check
  CHECK (requires_active_pass IS NULL OR requires_active_pass IN ('al_baraka','liberty'));

COMMENT ON COLUMN public.coupons.requires_active_pass IS
  'Si non NULL, le coupon n''est valable que si l''email saisi correspond a un compte ayant un user_passes actif de ce type (ex. ''al_baraka'' pour LIBERTY1000). Verifie par validate_coupon(p_code,p_expected_category,p_email).';

-- 2) Surcharge a 3 arguments : ajoute p_email pour verifier l'eligibilite
--    "pass actif requis". C'est l'implementation de reference.
CREATE OR REPLACE FUNCTION public.validate_coupon(
  p_code text,
  p_expected_category text,
  p_email text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_coupon public.coupons%ROWTYPE;
  v_cats_empty boolean;
  v_offers_empty boolean;
  v_category_match boolean;
  v_offer_in_category_match boolean;
  v_has_pass boolean;
BEGIN
  SELECT * INTO v_coupon FROM public.coupons
  WHERE UPPER(code) = UPPER(p_code) AND active = true LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'not_found');
  END IF;
  IF v_coupon.expires_at IS NOT NULL AND v_coupon.expires_at < now() THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'expired');
  END IF;
  IF v_coupon.max_redemptions IS NOT NULL AND v_coupon.times_redeemed >= v_coupon.max_redemptions THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'max_redemptions_reached');
  END IF;

  -- Check targeting si une category attendue a ete fournie
  IF p_expected_category IS NOT NULL AND p_expected_category <> '' THEN
    v_cats_empty := (v_coupon.applies_to_categories IS NULL OR array_length(v_coupon.applies_to_categories, 1) IS NULL);
    v_offers_empty := (v_coupon.applies_to_offer_ids IS NULL OR array_length(v_coupon.applies_to_offer_ids, 1) IS NULL);

    IF NOT (v_cats_empty AND v_offers_empty) THEN
      -- A un targeting : verifier qu'il matche
      v_category_match := (NOT v_cats_empty) AND (p_expected_category = ANY(v_coupon.applies_to_categories));

      v_offer_in_category_match := false;
      IF NOT v_offers_empty THEN
        v_offer_in_category_match := EXISTS (
          SELECT 1 FROM public.offers o
          WHERE o.id = ANY(v_coupon.applies_to_offer_ids)
            AND o.category = p_expected_category
        );
      END IF;

      IF NOT (v_category_match OR v_offer_in_category_match) THEN
        RETURN jsonb_build_object(
          'valid', false,
          'reason', 'targeting_mismatch',
          'code', v_coupon.code,
          'expected_category', p_expected_category,
          'applies_to_categories', v_coupon.applies_to_categories,
          'applies_to_offer_ids', v_coupon.applies_to_offer_ids
        );
      END IF;
    END IF;
    -- Sinon (no targeting) : accepte par defaut, fall through
  END IF;

  -- Check eligibilite "pass actif requis" (garde-fou upgrade LIBERTY1000)
  IF v_coupon.requires_active_pass IS NOT NULL THEN
    IF p_email IS NULL OR btrim(p_email) = '' THEN
      RETURN jsonb_build_object(
        'valid', false,
        'reason', 'email_required',
        'requires_active_pass', v_coupon.requires_active_pass
      );
    END IF;
    v_has_pass := EXISTS (
      SELECT 1
      FROM public.profiles p
      JOIN public.user_passes up ON up.user_id = p.id
      WHERE lower(p.email) = lower(btrim(p_email))
        AND up.pass_type::text = v_coupon.requires_active_pass
        AND up.revoked_at IS NULL
    );
    IF NOT v_has_pass THEN
      RETURN jsonb_build_object(
        'valid', false,
        'reason', 'requires_pass',
        'requires_active_pass', v_coupon.requires_active_pass
      );
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'valid', true,
    'code', v_coupon.code,
    'discount_type', v_coupon.discount_type,
    'discount_percent', v_coupon.discount_percent,
    'discount_amount_eur', v_coupon.discount_amount_eur,
    'applies_to_offer_ids', v_coupon.applies_to_offer_ids,
    'applies_to_categories', v_coupon.applies_to_categories,
    'requires_active_pass', v_coupon.requires_active_pass
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.validate_coupon(text, text, text) TO anon, authenticated, service_role;

COMMENT ON FUNCTION public.validate_coupon(text, text, text) IS
  'Valide un coupon : targeting (p_expected_category) + eligibilite pass actif (p_email -> requires_active_pass). Upgrade Liberty 10/06/2026.';

-- 3) La surcharge a 2 arguments delegue desormais a la 3-args (email NULL).
--    Consequence : un coupon a `requires_active_pass` appele SANS email retourne
--    {valid:false, reason:'email_required'} -> les anciens appelants (frontends
--    non encore deployes) ne peuvent PAS appliquer LIBERTY1000 sans email.
CREATE OR REPLACE FUNCTION public.validate_coupon(
  p_code text,
  p_expected_category text
)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT public.validate_coupon(p_code, p_expected_category, NULL::text);
$function$;

GRANT EXECUTE ON FUNCTION public.validate_coupon(text, text) TO anon, authenticated, service_role;

-- 4) Creer / mettre a jour le code LIBERTY1000 : -4000 EUR sur Liberty,
--    reserve aux membres ayant un pass al_baraka actif. Permanent (pas
--    d'expiration ni de plafond d'utilisations).
INSERT INTO public.coupons (
  code, discount_type, discount_amount_eur, discount_percent,
  applies_to_offer_ids, requires_active_pass, active
)
SELECT 'LIBERTY1000', 'fixed_eur', 4000, NULL, ARRAY[id], 'al_baraka', true
FROM public.offers WHERE slug = 'liberty'
ON CONFLICT (code) DO UPDATE SET
  discount_type        = EXCLUDED.discount_type,
  discount_amount_eur  = EXCLUDED.discount_amount_eur,
  discount_percent     = EXCLUDED.discount_percent,
  applies_to_offer_ids = EXCLUDED.applies_to_offer_ids,
  requires_active_pass = EXCLUDED.requires_active_pass,
  active               = true;
