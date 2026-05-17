-- Étend validate_coupon pour supporter les codes en montant fixe (fixed_eur).
-- Avant : la RPC ne renvoyait que `discount_percent`. Désormais elle renvoie
-- aussi `discount_type`, `discount_amount_eur` et le ciblage (offres /
-- catégories) pour que le frontend puisse appliquer correctement la
-- réduction (% ou € fixes).

CREATE OR REPLACE FUNCTION public.validate_coupon(p_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $func$
DECLARE
  v_coupon public.coupons%ROWTYPE;
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
  RETURN jsonb_build_object(
    'valid', true,
    'code', v_coupon.code,
    'discount_type', v_coupon.discount_type,
    'discount_percent', v_coupon.discount_percent,
    'discount_amount_eur', v_coupon.discount_amount_eur,
    'applies_to_offer_ids', v_coupon.applies_to_offer_ids,
    'applies_to_categories', v_coupon.applies_to_categories
  );
END;
$func$;
