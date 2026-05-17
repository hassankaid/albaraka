-- Sprint R (17/05/2026) — Formations a la carte : prix 500 → 650€ + installments 1-3
-- (au lieu de 1× only). Mise a jour de :
--   1. Toutes les 9 offres a_la_carte : default_price_ht=650, max_installments_count=3
--   2. RPC create_formation_payment_link : accepter p_installments (default 1, rétrocompat)
--   3. Nouvelle RPC lookup_a_la_carte_offer : expose prix + min/max au frontend

-- ============================================================================
-- 1) Update des 9 offres formations a la carte
-- ============================================================================
UPDATE public.offers
SET
  default_price_ht = 650,
  min_installments_count = 1,
  max_installments_count = 3,
  updated_at = now()
WHERE category = 'a_la_carte'
  AND status = 'active';

-- ============================================================================
-- 2) RPC create_formation_payment_link : ajout p_installments
-- ============================================================================
DROP FUNCTION IF EXISTS public.create_formation_payment_link(TEXT, DATE, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.create_formation_payment_link(
  p_offer_slug TEXT,
  p_installments INTEGER DEFAULT 1,
  p_deferred_start DATE DEFAULT NULL,
  p_prefill_email TEXT DEFAULT NULL,
  p_prefill_full_name TEXT DEFAULT NULL,
  p_prefill_phone TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $func$
DECLARE
  v_offer RECORD;
  v_token TEXT;
  v_link_id UUID;
  v_attempts INT := 0;
BEGIN
  SELECT id, label, default_price_ht, formation_id, status, category,
         min_installments_count, max_installments_count
  INTO v_offer
  FROM public.offers
  WHERE slug = p_offer_slug
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'offer_not_found', 'slug', p_offer_slug);
  END IF;
  IF v_offer.category <> 'a_la_carte' THEN
    RETURN jsonb_build_object('error', 'offer_not_a_la_carte', 'category', v_offer.category);
  END IF;
  IF v_offer.status <> 'active' THEN
    RETURN jsonb_build_object('error', 'offer_not_active', 'status', v_offer.status);
  END IF;
  IF v_offer.formation_id IS NULL THEN
    RETURN jsonb_build_object('error', 'offer_no_formation_link', 'offer_id', v_offer.id);
  END IF;

  IF p_installments IS NULL
     OR p_installments < v_offer.min_installments_count
     OR p_installments > v_offer.max_installments_count THEN
    RETURN jsonb_build_object(
      'error', 'invalid_installments',
      'received', p_installments,
      'min', v_offer.min_installments_count,
      'max', v_offer.max_installments_count
    );
  END IF;

  IF p_deferred_start IS NOT NULL THEN
    IF p_deferred_start <= CURRENT_DATE THEN
      RETURN jsonb_build_object('error', 'deferred_start_must_be_future');
    END IF;
    IF p_deferred_start > CURRENT_DATE + INTERVAL '180 days' THEN
      RETURN jsonb_build_object('error', 'deferred_start_too_far',
        'message', 'La date de demarrage ne peut pas etre a plus de 6 mois.');
    END IF;
  END IF;

  LOOP
    v_attempts := v_attempts + 1;
    v_token := 'ALB-PL-' || UPPER(SUBSTRING(REPLACE(gen_random_uuid()::TEXT, '-', ''), 1, 8));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.payment_links WHERE token = v_token);
    IF v_attempts > 5 THEN
      RAISE EXCEPTION 'token_generation_failed';
    END IF;
  END LOOP;

  INSERT INTO public.payment_links (
    token, product_label, total_amount, installments_count,
    deferred_start_date,
    prefilled_full_name, prefilled_email, prefilled_phone,
    status, auto_generated,
    grants_formation_ids,
    notes
  )
  VALUES (
    v_token,
    v_offer.label,
    v_offer.default_price_ht,
    p_installments,
    p_deferred_start,
    NULLIF(TRIM(COALESCE(p_prefill_full_name, '')), ''),
    NULLIF(TRIM(LOWER(COALESCE(p_prefill_email, ''))), ''),
    NULLIF(TRIM(COALESCE(p_prefill_phone, '')), ''),
    'active',
    TRUE,
    ARRAY[v_offer.formation_id]::UUID[],
    'Lien auto-genere : formation a la carte ' || p_offer_slug || ' (' || p_installments || 'x)'
  )
  RETURNING id INTO v_link_id;

  RETURN jsonb_build_object(
    'success', TRUE,
    'token', v_token,
    'link_id', v_link_id,
    'product_label', v_offer.label,
    'total_amount', v_offer.default_price_ht,
    'installments_count', p_installments
  );
END;
$func$;

GRANT EXECUTE ON FUNCTION public.create_formation_payment_link(TEXT, INTEGER, DATE, TEXT, TEXT, TEXT)
  TO anon, authenticated;

COMMENT ON FUNCTION public.create_formation_payment_link IS
  'Sprint R 17/05/2026 : cree un payment_link a la volee pour une formation a la carte. p_installments dans [min..max] de l''offre (par defaut 1, max 3).';

-- ============================================================================
-- 3) Nouvelle RPC publique : lookup_a_la_carte_offer
-- ============================================================================
CREATE OR REPLACE FUNCTION public.lookup_a_la_carte_offer(p_slug TEXT)
RETURNS TABLE(
  offer_id UUID,
  label TEXT,
  default_price_ht NUMERIC,
  min_installments_count INTEGER,
  max_installments_count INTEGER,
  is_valid BOOLEAN,
  reason TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $func$
DECLARE
  v_offer RECORD;
BEGIN
  IF p_slug IS NULL OR TRIM(p_slug) = '' THEN
    RETURN QUERY SELECT NULL::UUID, NULL::TEXT, 0::NUMERIC, 0, 0, FALSE, 'slug_required'::TEXT;
    RETURN;
  END IF;

  SELECT o.id, o.label, o.default_price_ht, o.min_installments_count,
         o.max_installments_count, o.status, o.category, o.formation_id
  INTO v_offer
  FROM public.offers o
  WHERE o.slug = p_slug
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN QUERY SELECT NULL::UUID, NULL::TEXT, 0::NUMERIC, 0, 0, FALSE, 'offer_not_found'::TEXT;
    RETURN;
  END IF;

  IF v_offer.category <> 'a_la_carte' THEN
    RETURN QUERY SELECT v_offer.id, v_offer.label, v_offer.default_price_ht,
      v_offer.min_installments_count, v_offer.max_installments_count, FALSE, 'offer_not_a_la_carte'::TEXT;
    RETURN;
  END IF;

  IF v_offer.status <> 'active' THEN
    RETURN QUERY SELECT v_offer.id, v_offer.label, v_offer.default_price_ht,
      v_offer.min_installments_count, v_offer.max_installments_count, FALSE, 'offer_not_active'::TEXT;
    RETURN;
  END IF;

  IF v_offer.formation_id IS NULL THEN
    RETURN QUERY SELECT v_offer.id, v_offer.label, v_offer.default_price_ht,
      v_offer.min_installments_count, v_offer.max_installments_count, FALSE, 'offer_no_formation_link'::TEXT;
    RETURN;
  END IF;

  RETURN QUERY SELECT v_offer.id, v_offer.label, v_offer.default_price_ht,
    v_offer.min_installments_count, v_offer.max_installments_count, TRUE, NULL::TEXT;
END;
$func$;

GRANT EXECUTE ON FUNCTION public.lookup_a_la_carte_offer(TEXT) TO anon, authenticated;

COMMENT ON FUNCTION public.lookup_a_la_carte_offer IS
  'Lookup public d''une offre formation a la carte pour le frontend (FormationCheckout). Retourne prix + min/max installments + status. Sprint R 17/05/2026.';
