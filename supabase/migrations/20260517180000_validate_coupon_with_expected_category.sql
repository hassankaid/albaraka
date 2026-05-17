-- Sprint P (17/05/2026) — Etend validate_coupon avec un argument optionnel
-- p_expected_category pour verifier le targeting cote SQL (= 1 source de
-- verite, utilisable par frontend + backend).
--
-- Si p_expected_category est NULL → comportement actuel (no-op, retourne le
-- coupon meme si targeting present, le caller doit verifier lui-meme).
--
-- Si p_expected_category est defini :
--   - applies_to_categories vide ET applies_to_offer_ids vide → accepte (no targeting)
--   - applies_to_categories contient expected_category → accepte
--   - au moins 1 id de applies_to_offer_ids appartient a offers(category=expected) → accepte
--   - sinon → retourne {valid: false, reason: 'targeting_mismatch'}
--
-- L'ancienne signature (p_code seul) est conservee pour retrocompat
-- complete avec les anciennes versions du frontend non encore deployees.

CREATE OR REPLACE FUNCTION public.validate_coupon(
  p_code text,
  p_expected_category text
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
$function$;

GRANT EXECUTE ON FUNCTION public.validate_coupon(text, text) TO anon, authenticated, service_role;

COMMENT ON FUNCTION public.validate_coupon(text, text) IS
  'Valide un coupon avec check targeting cote SQL via p_expected_category. Si null, comportement legacy (caller verifie lui-meme). Sprint P 17/05/2026.';
