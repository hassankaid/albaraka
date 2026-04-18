-- Patch find_or_create_contact : ajoute fallback recherche directe dans contacts
-- + catche unique_violation pour récupérer le contact existant en dernier recours.
--
-- Bug d'origine : 1417/2046 contacts existants n'avaient aucune ligne dans
-- contact_identifiers (table créée après les contacts, sans backfill).
-- → La RPC ne trouvait pas le contact via contact_identifiers, tentait un
-- INSERT, échouait sur la contrainte unique idx_contacts_email.
-- → Tous les webhooks Calendly pour ces contacts historiques échouaient en 500.
--
-- Backfill one-shot exécuté en parallèle : 1417 → 4 contacts orphelins
-- (les 4 restants n'ont ni email ni téléphone).

CREATE OR REPLACE FUNCTION public.find_or_create_contact(
  p_email text,
  p_phone text,
  p_full_name text DEFAULT NULL::text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_contact_id uuid;
  v_phone_e164 text;
  v_phone_short text;
  v_email_lower text;
  v_full_name_upper text;
BEGIN
  v_email_lower := lower(trim(p_email));
  v_phone_e164 := normalize_phone_e164(p_phone);
  v_full_name_upper := upper(trim(p_full_name));

  IF v_phone_e164 IS NOT NULL THEN
    v_phone_short := RIGHT(regexp_replace(v_phone_e164, '[^\d]', '', 'g'), 9);
  END IF;

  -- Recherche via contact_identifiers (matching primaire)
  IF v_email_lower IS NOT NULL AND v_email_lower != '' THEN
    SELECT contact_id INTO v_contact_id FROM public.contact_identifiers
    WHERE identifier_type = 'email' AND identifier_value = v_email_lower LIMIT 1;
  END IF;

  IF v_contact_id IS NULL AND v_phone_e164 IS NOT NULL THEN
    SELECT contact_id INTO v_contact_id FROM public.contact_identifiers
    WHERE identifier_type = 'phone' AND identifier_value = v_phone_e164 LIMIT 1;
  END IF;

  IF v_contact_id IS NULL AND v_phone_short IS NOT NULL THEN
    SELECT contact_id INTO v_contact_id FROM public.contact_identifiers
    WHERE identifier_type = 'phone_short' AND identifier_value = v_phone_short LIMIT 1;
  END IF;

  -- FALLBACK : recherche directe dans contacts (au cas où identifiers absent)
  IF v_contact_id IS NULL AND v_email_lower IS NOT NULL AND v_email_lower != '' THEN
    SELECT id INTO v_contact_id FROM public.contacts
    WHERE lower(trim(email)) = v_email_lower LIMIT 1;
  END IF;

  IF v_contact_id IS NULL AND v_phone_e164 IS NOT NULL THEN
    SELECT id INTO v_contact_id FROM public.contacts
    WHERE phone_normalized = v_phone_e164 LIMIT 1;
  END IF;

  -- Création ou mise à jour
  IF v_contact_id IS NULL THEN
    BEGIN
      INSERT INTO public.contacts (email, phone_normalized, phone_original, full_name)
      VALUES (NULLIF(v_email_lower, ''), v_phone_e164, p_phone, v_full_name_upper)
      RETURNING id INTO v_contact_id;
    EXCEPTION WHEN unique_violation THEN
      -- Race condition ou identifier perdu : retrouver le contact existant
      SELECT id INTO v_contact_id FROM public.contacts
      WHERE (v_email_lower IS NOT NULL AND v_email_lower != '' AND lower(trim(email)) = v_email_lower)
         OR (v_phone_e164 IS NOT NULL AND phone_normalized = v_phone_e164)
      LIMIT 1;
      IF v_contact_id IS NULL THEN
        RAISE EXCEPTION 'Unique violation but no matching contact found (email=%, phone=%)', v_email_lower, v_phone_e164;
      END IF;
    END;
  ELSE
    UPDATE public.contacts SET
      email = COALESCE(contacts.email, NULLIF(v_email_lower, '')),
      phone_normalized = COALESCE(contacts.phone_normalized, v_phone_e164),
      phone_original = COALESCE(contacts.phone_original, p_phone),
      full_name = COALESCE(NULLIF(v_full_name_upper, ''), contacts.full_name),
      updated_at = now()
    WHERE id = v_contact_id;
  END IF;

  -- Ajout des identifiants (idempotent)
  IF v_email_lower IS NOT NULL AND v_email_lower != '' THEN
    INSERT INTO public.contact_identifiers (contact_id, identifier_type, identifier_value)
    VALUES (v_contact_id, 'email', v_email_lower)
    ON CONFLICT (identifier_type, identifier_value) DO NOTHING;
  END IF;
  IF v_phone_e164 IS NOT NULL THEN
    INSERT INTO public.contact_identifiers (contact_id, identifier_type, identifier_value)
    VALUES (v_contact_id, 'phone', v_phone_e164)
    ON CONFLICT (identifier_type, identifier_value) DO NOTHING;
  END IF;
  IF v_phone_short IS NOT NULL THEN
    INSERT INTO public.contact_identifiers (contact_id, identifier_type, identifier_value)
    VALUES (v_contact_id, 'phone_short', v_phone_short)
    ON CONFLICT (identifier_type, identifier_value) DO NOTHING;
  END IF;

  RETURN v_contact_id;
END;
$function$;
