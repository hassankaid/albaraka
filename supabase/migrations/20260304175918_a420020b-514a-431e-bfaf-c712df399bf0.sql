
CREATE OR REPLACE FUNCTION public.find_or_create_contact(p_email text, p_phone text, p_full_name text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
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
  
  IF v_email_lower IS NOT NULL AND v_email_lower != '' THEN
    SELECT contact_id INTO v_contact_id 
    FROM public.contact_identifiers 
    WHERE identifier_type = 'email' AND identifier_value = v_email_lower
    LIMIT 1;
  END IF;
  
  IF v_contact_id IS NULL AND v_phone_e164 IS NOT NULL THEN
    SELECT contact_id INTO v_contact_id 
    FROM public.contact_identifiers 
    WHERE identifier_type = 'phone' AND identifier_value = v_phone_e164
    LIMIT 1;
  END IF;
  
  IF v_contact_id IS NULL AND v_phone_short IS NOT NULL THEN
    SELECT contact_id INTO v_contact_id 
    FROM public.contact_identifiers 
    WHERE identifier_type = 'phone_short' AND identifier_value = v_phone_short
    LIMIT 1;
  END IF;
  
  IF v_contact_id IS NULL THEN
    INSERT INTO public.contacts (email, phone_normalized, phone_original, full_name)
    VALUES (NULLIF(v_email_lower, ''), v_phone_e164, p_phone, v_full_name_upper)
    RETURNING id INTO v_contact_id;
  ELSE
    UPDATE public.contacts
    SET full_name = COALESCE(contacts.full_name, v_full_name_upper), updated_at = now()
    WHERE id = v_contact_id AND full_name IS NULL;
  END IF;
  
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
