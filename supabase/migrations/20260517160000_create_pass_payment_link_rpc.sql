-- Sprint L - RPC create_pass_payment_link : creer a la volee un payment_link
-- pour le checkout differe d'un Pass (AL BARAKA / Liberty).
--
-- Stratégie wrapper-redirect : pour eviter de toucher Checkout.tsx +
-- LibertyCheckout.tsx + edge function CPI branches pass_al_baraka/pass_liberty
-- + webhook handleSubscriptionCreated pour gerer le mode differe specifique
-- aux passes (gros refactor), on REUTILISE le flow /pay/<token> qui supporte
-- deja parfaitement le mode differe via Sprint K + l'attribution du pass via
-- grants_offer_id (Sprint H2).
--
-- Flow :
--   1. CEO copie depuis catalogue : /checkout/8?test=1&start=2026-05-20
--   2. Client ouvre l'URL → Checkout.tsx detecte ?start present
--   3. Appel create_pass_payment_link('al-baraka', 8, '2026-05-20')
--   4. Insert payment_link auto_generated=true + grants_offer_id=al_baraka_offer
--   5. Redirect vers /pay/<token>?test=1
--   6. PaymentLinkCheckout affiche ScheduleBlock complet (calendrier + date editable)
--   7. Au paiement, webhook cree sale + grant pass al_baraka + email d'acces
--
-- Le flow immediat /checkout/N (sans ?start=) reste inchange et passe par
-- pass_al_baraka/pass_liberty branches de create-payment-intent.

CREATE OR REPLACE FUNCTION public.create_pass_payment_link(
  p_pass_slug TEXT,
  p_installments INTEGER,
  p_deferred_start DATE,
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
  -- ── Validation de l'offre (slug + categorie pass uniquement) ──
  SELECT id, label, default_price_ht, category, status,
         min_installments_count, max_installments_count
  INTO v_offer
  FROM public.offers
  WHERE slug = p_pass_slug
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'pass_not_found', 'slug', p_pass_slug);
  END IF;
  IF v_offer.category NOT IN ('al_baraka', 'liberty') THEN
    RETURN jsonb_build_object('error', 'offer_is_not_a_pass', 'category', v_offer.category);
  END IF;
  IF v_offer.status <> 'active' THEN
    RETURN jsonb_build_object('error', 'pass_not_active', 'status', v_offer.status);
  END IF;

  -- ── Validation installments ──
  IF p_installments IS NULL OR p_installments < v_offer.min_installments_count OR p_installments > v_offer.max_installments_count THEN
    RETURN jsonb_build_object(
      'error', 'invalid_installments',
      'received', p_installments,
      'min', v_offer.min_installments_count,
      'max', v_offer.max_installments_count
    );
  END IF;

  -- ── Validation deferred_start (obligatoire ici - c'est le but du RPC) ──
  IF p_deferred_start IS NULL THEN
    RETURN jsonb_build_object('error', 'deferred_start_required',
      'message', 'Ce RPC est dedie au mode differe. Pour immediat, utilisez /checkout/N directement.');
  END IF;
  IF p_deferred_start <= CURRENT_DATE THEN
    RETURN jsonb_build_object('error', 'deferred_start_must_be_future');
  END IF;
  IF p_deferred_start > CURRENT_DATE + INTERVAL '180 days' THEN
    RETURN jsonb_build_object('error', 'deferred_start_too_far',
      'message', 'La date de demarrage ne peut pas etre a plus de 6 mois.');
  END IF;

  -- ── Generation du token unique ──
  LOOP
    v_attempts := v_attempts + 1;
    v_token := 'ALB-PL-' || UPPER(SUBSTRING(REPLACE(gen_random_uuid()::TEXT, '-', ''), 1, 8));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.payment_links WHERE token = v_token);
    IF v_attempts > 5 THEN
      RAISE EXCEPTION 'token_generation_failed';
    END IF;
  END LOOP;

  -- ── Creation du lien (auto_generated=true → invisible CustomLinksTab) ──
  INSERT INTO public.payment_links (
    token,
    product_label,
    total_amount,
    installments_count,
    deferred_start_date,
    prefilled_full_name,
    prefilled_email,
    prefilled_phone,
    status,
    auto_generated,
    grants_offer_id,
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
    v_offer.id,
    'Lien auto-genere : Pass ' || v_offer.category || ' (' || p_installments || 'x), differe au ' || p_deferred_start
  )
  RETURNING id INTO v_link_id;

  RETURN jsonb_build_object(
    'success', TRUE,
    'token', v_token,
    'link_id', v_link_id,
    'product_label', v_offer.label,
    'total_amount', v_offer.default_price_ht,
    'installments_count', p_installments,
    'deferred_start_date', p_deferred_start
  );
END;
$func$;

GRANT EXECUTE ON FUNCTION public.create_pass_payment_link(TEXT, INTEGER, DATE, TEXT, TEXT, TEXT)
  TO anon, authenticated;

COMMENT ON FUNCTION public.create_pass_payment_link IS
  'Cree a la volee un payment_link pour le mode differe d''un Pass (AL BARAKA ou Liberty). Appele par Checkout.tsx / LibertyCheckout.tsx quand ?start=YYYY-MM-DD est present dans l''URL. Le client est redirige vers /pay/<token> qui affiche le calendrier complet (Sprint K) et applique le pass apres paiement (Sprint H2 webhook).';
