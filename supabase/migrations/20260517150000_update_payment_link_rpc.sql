-- Sprint J4 - RPC update_payment_link : permet au CEO de modifier les champs
-- "soft" d'un lien actif sans avoir a l'annuler + recreer.
--
-- CHAMPS MODIFIABLES (les "soft" - sans impact sur le prix vu par le client) :
--   - deferred_start_date (NULL = annule le differe)
--   - prefilled_full_name, prefilled_email, prefilled_phone
--   - notes
--   - grants_offer_id (NULL = retire le pass)
--   - grants_formation_ids (tableau vide = retire les formations)
--
-- CHAMPS IMMUABLES (changerait le prix percu par le client) :
--   - token, product_label, total_amount, installments_count, deposit_amount,
--     auto_generated, status, sale_id
--
-- Pour modifier ces derniers, annuler le lien + en recreer un. Garde CEO +
-- status='active' uniquement (paid/cancelled = lock).

CREATE OR REPLACE FUNCTION public.update_payment_link(
  p_id UUID,
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
  v_status TEXT;
  v_offer_category TEXT;
  v_formation_count INT;
BEGIN
  -- Garde CEO
  SELECT role INTO v_role FROM public.profiles WHERE id = auth.uid();
  IF v_role IS DISTINCT FROM 'ceo' THEN
    RAISE EXCEPTION 'forbidden_ceo_only';
  END IF;

  -- Garde status='active'
  SELECT status INTO v_status FROM public.payment_links WHERE id = p_id;
  IF v_status IS NULL THEN
    RAISE EXCEPTION 'payment_link_not_found';
  END IF;
  IF v_status <> 'active' THEN
    RAISE EXCEPTION 'payment_link_not_editable_status' USING DETAIL = v_status;
  END IF;

  -- Validation deferred_start_date (doit etre future si non-null)
  IF p_deferred_start_date IS NOT NULL AND p_deferred_start_date <= CURRENT_DATE THEN
    RAISE EXCEPTION 'deferred_start_must_be_future';
  END IF;

  -- Validations grants (memes regles que create_payment_link)
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

  -- Update (les params NULL = "set to NULL", explicite via le RPC)
  -- Le front DOIT passer tous les champs (read-then-update pattern)
  UPDATE public.payment_links
  SET
    deferred_start_date = p_deferred_start_date,
    prefilled_full_name = NULLIF(TRIM(COALESCE(p_prefilled_full_name, '')), ''),
    prefilled_email = NULLIF(LOWER(TRIM(COALESCE(p_prefilled_email, ''))), ''),
    prefilled_phone = NULLIF(TRIM(COALESCE(p_prefilled_phone, '')), ''),
    notes = NULLIF(TRIM(COALESCE(p_notes, '')), ''),
    grants_offer_id = p_grants_offer_id,
    grants_formation_ids = CASE
      WHEN p_grants_formation_ids IS NULL OR array_length(p_grants_formation_ids, 1) IS NULL
        THEN NULL
      ELSE p_grants_formation_ids
    END
  WHERE id = p_id;

  RETURN jsonb_build_object('success', TRUE, 'id', p_id);
END;
$function$;

COMMENT ON FUNCTION public.update_payment_link IS
  'Modifie les champs "soft" d''un payment_link CEO actif (date differee, destinataire, notes, perimetre d''acces). Champs immuables = token, product_label, total_amount, installments_count : pour ceux-la, annuler + recreer.';
