-- Sprint P (17/05/2026) — Expose `expected_coupon_category` dans lookup_payment_link.
-- DROP necessaire car PostgreSQL n'autorise pas de changer le type de retour
-- d'une fonction sans DROP (return type immutable).

DROP FUNCTION IF EXISTS public.lookup_payment_link(text);

CREATE FUNCTION public.lookup_payment_link(p_token text)
RETURNS TABLE(
  link_id uuid,
  product_label text,
  total_amount numeric,
  installments_count integer,
  deposit_amount numeric,
  deferred_start_date date,
  prefilled_full_name text,
  prefilled_email text,
  prefilled_phone text,
  is_valid boolean,
  reason text,
  expected_coupon_category text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_normalized TEXT;
  v_rec        public.payment_links%ROWTYPE;
  v_expected_category TEXT;
BEGIN
  v_normalized := upper(trim(coalesce(p_token, '')));
  IF v_normalized = '' THEN
    RETURN QUERY SELECT NULL::UUID, NULL::TEXT, 0::NUMERIC, 0, NULL::NUMERIC, NULL::DATE,
      NULL::TEXT, NULL::TEXT, NULL::TEXT, FALSE, 'token_required'::TEXT, NULL::TEXT;
    RETURN;
  END IF;

  SELECT * INTO v_rec FROM public.payment_links WHERE token = v_normalized;

  IF v_rec.id IS NULL THEN
    RETURN QUERY SELECT NULL::UUID, NULL::TEXT, 0::NUMERIC, 0, NULL::NUMERIC, NULL::DATE,
      NULL::TEXT, NULL::TEXT, NULL::TEXT, FALSE, 'not_found'::TEXT, NULL::TEXT;
    RETURN;
  END IF;

  IF v_rec.status = 'cancelled' THEN
    RETURN QUERY SELECT v_rec.id, v_rec.product_label, v_rec.total_amount,
      v_rec.installments_count, v_rec.deposit_amount, v_rec.deferred_start_date,
      NULL::TEXT, NULL::TEXT, NULL::TEXT, FALSE, 'cancelled'::TEXT, NULL::TEXT;
    RETURN;
  END IF;

  IF v_rec.status = 'paid' THEN
    RETURN QUERY SELECT v_rec.id, v_rec.product_label, v_rec.total_amount,
      v_rec.installments_count, v_rec.deposit_amount, v_rec.deferred_start_date,
      NULL::TEXT, NULL::TEXT, NULL::TEXT, FALSE, 'already_paid'::TEXT, NULL::TEXT;
    RETURN;
  END IF;

  -- Determine la category attendue pour les coupons applicables a ce lien
  v_expected_category := NULL;
  IF v_rec.auto_generated THEN
    IF v_rec.grants_offer_id IS NOT NULL THEN
      SELECT o.category INTO v_expected_category
      FROM public.offers o WHERE o.id = v_rec.grants_offer_id;
    ELSIF v_rec.grants_formation_ids IS NOT NULL
          AND array_length(v_rec.grants_formation_ids, 1) > 0 THEN
      v_expected_category := 'a_la_carte';
    END IF;
  END IF;
  -- Sinon (lien custom CEO classique) : NULL → aucun coupon ne devrait s'appliquer

  RETURN QUERY SELECT
    v_rec.id, v_rec.product_label, v_rec.total_amount, v_rec.installments_count,
    v_rec.deposit_amount, v_rec.deferred_start_date,
    v_rec.prefilled_full_name, v_rec.prefilled_email, v_rec.prefilled_phone,
    TRUE, NULL::TEXT, v_expected_category;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.lookup_payment_link(text) TO anon, authenticated, service_role;

COMMENT ON FUNCTION public.lookup_payment_link IS
  'Lookup d''un payment_link par token. Sprint P 17/05/2026 : expose expected_coupon_category pour filtrer les coupons applicables cote UI/edge function.';
