-- Système d'acompte : payment_code unique par contact + helpers de lookup
--
-- Le payment_code est généré au 1er acompte payé pour un contact, et reste
-- attaché à vie. Il sert à construire le lien personnalisé du checkout
-- AL BARAKA principal (?code=ALB-XXXXXX) qui :
--   1. Identifie le contact de manière fiable (pas de problème d'email)
--   2. Permet de retrouver et déduire les acomptes payés
--   3. Pré-remplit les infos du formulaire (email, nom, etc.)

ALTER TABLE contacts ADD COLUMN IF NOT EXISTS payment_code text UNIQUE;

CREATE INDEX IF NOT EXISTS idx_contacts_payment_code
  ON contacts(payment_code) WHERE payment_code IS NOT NULL;

CREATE OR REPLACE FUNCTION generate_payment_code(p_contact_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code text;
  v_chars text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  v_len int := 6;
  v_attempts int := 0;
  v_existing text;
BEGIN
  IF p_contact_id IS NULL THEN
    RAISE EXCEPTION 'contact_id ne peut pas être NULL';
  END IF;

  SELECT payment_code INTO v_existing FROM contacts WHERE id = p_contact_id;
  IF v_existing IS NOT NULL THEN
    RETURN v_existing;
  END IF;

  LOOP
    v_code := 'ALB-';
    FOR i IN 1..v_len LOOP
      v_code := v_code || substr(v_chars, 1 + floor(random() * length(v_chars))::int, 1);
    END LOOP;

    PERFORM 1 FROM contacts WHERE payment_code = v_code;
    IF NOT FOUND THEN EXIT; END IF;

    v_attempts := v_attempts + 1;
    IF v_attempts > 100 THEN
      RAISE EXCEPTION 'Impossible de générer un payment_code unique après 100 tentatives';
    END IF;
  END LOOP;

  UPDATE contacts SET payment_code = v_code WHERE id = p_contact_id;
  RETURN v_code;
END;
$$;

CREATE OR REPLACE FUNCTION lookup_payment_code(p_code text)
RETURNS TABLE(
  contact_id uuid,
  email text,
  full_name text,
  phone text,
  acompte_total numeric,
  acompte_count int,
  acompte_first_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_contact_id uuid;
BEGIN
  IF p_code IS NULL OR length(trim(p_code)) = 0 THEN RETURN; END IF;

  SELECT id INTO v_contact_id
  FROM contacts
  WHERE upper(trim(payment_code)) = upper(trim(p_code))
  LIMIT 1;

  IF v_contact_id IS NULL THEN RETURN; END IF;

  RETURN QUERY
  SELECT
    c.id,
    c.email,
    c.full_name,
    COALESCE(c.phone_original, c.phone_normalized),
    COALESCE((
      SELECT SUM(s.amount_ht)
      FROM sales s
      WHERE s.contact_id = c.id
        AND s.sale_type = 'acompte'
        AND s.payment_status = 'paid'
    ), 0)::numeric AS acompte_total,
    COALESCE((
      SELECT COUNT(*)::int
      FROM sales s
      WHERE s.contact_id = c.id
        AND s.sale_type = 'acompte'
        AND s.payment_status = 'paid'
    ), 0) AS acompte_count,
    (
      SELECT MIN(s.created_at)
      FROM sales s
      WHERE s.contact_id = c.id
        AND s.sale_type = 'acompte'
        AND s.payment_status = 'paid'
    ) AS acompte_first_at
  FROM contacts c
  WHERE c.id = v_contact_id;
END;
$$;

GRANT EXECUTE ON FUNCTION lookup_payment_code(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION generate_payment_code(uuid) TO authenticated, service_role;
