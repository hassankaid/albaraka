-- Factures client (1 facture = 1 paiement encaissé)
--
-- Contrairement à apporteur_invoices (où l'apporteur facture la plateforme
-- pour ses commissions), client_invoices = la plateforme facture le client
-- final pour chaque mensualité encaissée.
--
-- Émetteur : ETHICARENA LLC (Dubai, UAE) — pas de TVA, pas de SIRET FR
-- Numérotation : FAC-YYYY-MM-XXXX (séquence reset par mois)
-- Stockage : HTML dans bucket "invoices" sous clients/{contact_id}/{nb}.html
--            (le client ouvre le lien signé et imprime en PDF si besoin)

CREATE TABLE IF NOT EXISTS client_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number text UNIQUE NOT NULL,
  payment_id uuid NOT NULL REFERENCES payments(id) ON DELETE RESTRICT,
  sale_id uuid REFERENCES sales(id) ON DELETE SET NULL,
  contact_id uuid REFERENCES contacts(id) ON DELETE SET NULL,
  -- Snapshot du client au moment de l'émission
  client_name text NOT NULL,
  client_email text,
  client_address text,
  client_postal_code text,
  client_city text,
  client_country text,
  -- Montant
  amount numeric NOT NULL,
  payment_number int,
  total_payments int,
  product text,
  paid_at date NOT NULL,
  -- Storage
  html_path text,
  pdf_url text,
  -- Email
  email_sent_at timestamptz,
  email_sent_to text,
  -- Audit
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES profiles(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_client_invoices_payment_unique ON client_invoices(payment_id);
CREATE INDEX IF NOT EXISTS idx_client_invoices_contact ON client_invoices(contact_id);
CREATE INDEX IF NOT EXISTS idx_client_invoices_sale ON client_invoices(sale_id);
CREATE INDEX IF NOT EXISTS idx_client_invoices_paid_at ON client_invoices(paid_at DESC);

ALTER TABLE client_invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS client_invoices_select_ceo ON client_invoices;
CREATE POLICY client_invoices_select_ceo ON client_invoices
  FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ceo'));

DROP POLICY IF EXISTS client_invoices_select_own ON client_invoices;
CREATE POLICY client_invoices_select_own ON client_invoices
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM sales s WHERE s.id = client_invoices.sale_id AND s.buyer_profile_id = auth.uid())
  );

-- ─── RPC : next_client_invoice_number ──────────────────────────────
-- Génère un numéro unique séquentiel par mois : FAC-YYYY-MM-XXXX
CREATE OR REPLACE FUNCTION next_client_invoice_number(p_year int, p_month int)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prefix text;
  v_seq int;
  v_number text;
BEGIN
  v_prefix := 'FAC-' || p_year::text || '-' || lpad(p_month::text, 2, '0');

  SELECT COUNT(*) + 1 INTO v_seq
  FROM client_invoices
  WHERE invoice_number LIKE v_prefix || '-%';

  v_number := v_prefix || '-' || lpad(v_seq::text, 4, '0');

  WHILE EXISTS (SELECT 1 FROM client_invoices WHERE invoice_number = v_number) LOOP
    v_seq := v_seq + 1;
    v_number := v_prefix || '-' || lpad(v_seq::text, 4, '0');
  END LOOP;

  RETURN v_number;
END;
$$;

GRANT EXECUTE ON FUNCTION next_client_invoice_number(int, int) TO authenticated;
