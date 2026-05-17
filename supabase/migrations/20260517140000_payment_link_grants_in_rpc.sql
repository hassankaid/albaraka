-- Sprint H — Etend create_payment_link pour supporter le perimetre d'acces
-- (grants_offer_id + grants_formation_ids).
--
-- Le CEO peut maintenant, lors de la creation d'un lien personnalise, definir
-- ce qui sera deverrouille pour l'acheteur :
--   - grants_offer_id : un Pass (AL BARAKA / Liberty) - donne acces au parcours
--   - grants_formation_ids : 1+ formations a la carte
--   - les 2 combines : pass + formations supplementaires
--   - aucun (juste un encaissement, comportement actuel)
--
-- Le webhook (applyPaymentLinkGrants) cree le profile + l'access en
-- consequence apres paiement reussi.

-- Drop old signature (sans grants) puis recreate avec nouvelle signature.
-- CREATE OR REPLACE refuse de modifier la signature, d'ou le drop explicite.
DROP FUNCTION IF EXISTS public.create_payment_link(
  TEXT, NUMERIC, INTEGER, NUMERIC, DATE, TEXT, TEXT, TEXT, TEXT
);

CREATE OR REPLACE FUNCTION public.create_payment_link(
  p_product_label TEXT,
  p_total_amount NUMERIC,
  p_installments_count INTEGER DEFAULT 1,
  p_deposit_amount NUMERIC DEFAULT NULL,
  p_deferred_start_date DATE DEFAULT NULL,
  p_prefilled_full_name TEXT DEFAULT NULL,
  p_prefilled_email TEXT DEFAULT NULL,
  p_prefilled_phone TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_grants_offer_id UUID DEFAULT NULL,
  p_grants_formation_ids UUID[] DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_role TEXT;
  v_token TEXT;
  v_attempts INT := 0;
  v_id UUID;
  v_offer_category TEXT;
  v_formation_count INT;
BEGIN
  -- Garde CEO
  SELECT role INTO v_role FROM public.profiles WHERE id = auth.uid();
  IF v_role IS DISTINCT FROM 'ceo' THEN
    RAISE EXCEPTION 'forbidden_ceo_only';
  END IF;

  -- Validations existantes
  IF p_product_label IS NULL OR length(trim(p_product_label)) = 0 THEN
    RAISE EXCEPTION 'product_label_required';
  END IF;
  IF p_total_amount IS NULL OR p_total_amount <= 0 THEN
    RAISE EXCEPTION 'invalid_total_amount';
  END IF;
  IF p_installments_count IS NULL OR p_installments_count < 1 OR p_installments_count > 24 THEN
    RAISE EXCEPTION 'invalid_installments_count';
  END IF;
  IF p_deposit_amount IS NOT NULL
     AND (p_deposit_amount <= 0 OR p_deposit_amount >= p_total_amount) THEN
    RAISE EXCEPTION 'invalid_deposit_amount';
  END IF;

  -- Validations nouvelles (grants)
  IF p_grants_offer_id IS NOT NULL THEN
    SELECT category INTO v_offer_category
    FROM public.offers WHERE id = p_grants_offer_id;
    IF v_offer_category IS NULL THEN
      RAISE EXCEPTION 'grants_offer_not_found';
    END IF;
    IF v_offer_category NOT IN ('al_baraka', 'liberty') THEN
      RAISE EXCEPTION 'grants_offer_must_be_pass_only';
    END IF;
  END IF;

  IF p_grants_formation_ids IS NOT NULL AND array_length(p_grants_formation_ids, 1) > 0 THEN
    SELECT COUNT(*) INTO v_formation_count
    FROM public.formations
    WHERE id = ANY(p_grants_formation_ids) AND status = 'published';
    IF v_formation_count <> array_length(p_grants_formation_ids, 1) THEN
      RAISE EXCEPTION 'grants_formation_not_found_or_unpublished';
    END IF;
  END IF;

  -- Token unique ALB-PL-XXXXXXXX (8 chars, sans 0/O/I/1)
  LOOP
    v_token := 'ALB-PL-' || (
      SELECT string_agg(
        substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', (floor(random() * 32) + 1)::int, 1),
        ''
      )
      FROM generate_series(1, 8)
    );
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.payment_links WHERE token = v_token);
    v_attempts := v_attempts + 1;
    IF v_attempts > 20 THEN
      RAISE EXCEPTION 'failed_to_generate_unique_token';
    END IF;
  END LOOP;

  INSERT INTO public.payment_links (
    token, product_label, total_amount, installments_count, deposit_amount,
    deferred_start_date, prefilled_full_name, prefilled_email, prefilled_phone,
    created_by, notes,
    grants_offer_id, grants_formation_ids
  ) VALUES (
    v_token,
    trim(p_product_label),
    p_total_amount,
    p_installments_count,
    p_deposit_amount,
    p_deferred_start_date,
    nullif(trim(coalesce(p_prefilled_full_name, '')), ''),
    nullif(lower(trim(coalesce(p_prefilled_email, ''))), ''),
    nullif(trim(coalesce(p_prefilled_phone, '')), ''),
    auth.uid(),
    nullif(trim(coalesce(p_notes, '')), ''),
    p_grants_offer_id,
    CASE
      WHEN p_grants_formation_ids IS NULL OR array_length(p_grants_formation_ids, 1) IS NULL
        THEN NULL
      ELSE p_grants_formation_ids
    END
  )
  RETURNING id INTO v_id;

  RETURN jsonb_build_object('id', v_id, 'token', v_token);
END;
$function$;

COMMENT ON FUNCTION public.create_payment_link IS
  'Cree un lien de paiement custom CEO. Supporte grants_offer_id (Pass AL BARAKA/Liberty) et grants_formation_ids (formations a la carte multi-select) pour donner acces automatique apres paiement (gere par applyPaymentLinkGrants dans stripe-webhook).';
