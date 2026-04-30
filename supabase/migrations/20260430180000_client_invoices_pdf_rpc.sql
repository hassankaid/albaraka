-- Refonte facture client : passage HTML → PDF (généré côté front via @react-pdf/renderer).
--
-- 2 nouvelles RPC :
--   - create_client_invoice : crée la row client_invoices avec numéro auto.
--     Idempotent : retourne l'existante si déjà créée pour ce payment.
--   - set_client_invoice_pdf_path : met à jour le path Storage après upload PDF.
--
-- Note : la colonne client_invoices.html_path est conservée mais contient
-- désormais le chemin du PDF (clients/{contact_id}/{number}.pdf).

CREATE OR REPLACE FUNCTION create_client_invoice(p_payment_id uuid)
RETURNS TABLE(
  id uuid, invoice_number text, payment_id uuid, sale_id uuid, contact_id uuid,
  client_name text, client_email text,
  client_address text, client_postal_code text, client_city text, client_country text,
  amount numeric, payment_number int, total_payments int, product text, paid_at date
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment payments;
  v_sale sales;
  v_contact contacts;
  v_buyer profiles;
  v_invoice_number text;
  v_year int;
  v_month int;
  v_existing client_invoices;
  v_inserted client_invoices;
BEGIN
  IF (SELECT role FROM profiles WHERE profiles.id = auth.uid()) != 'ceo' THEN
    RAISE EXCEPTION 'Forbidden: CEO role required';
  END IF;

  SELECT * INTO v_payment FROM payments WHERE payments.id = p_payment_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Payment not found'; END IF;
  IF v_payment.status != 'paid' THEN
    RAISE EXCEPTION 'Payment is not paid yet (status=%)', v_payment.status;
  END IF;

  SELECT * INTO v_existing FROM client_invoices WHERE client_invoices.payment_id = p_payment_id;
  IF FOUND THEN
    RETURN QUERY SELECT
      v_existing.id, v_existing.invoice_number, v_existing.payment_id, v_existing.sale_id,
      v_existing.contact_id, v_existing.client_name, v_existing.client_email,
      v_existing.client_address, v_existing.client_postal_code, v_existing.client_city,
      v_existing.client_country, v_existing.amount, v_existing.payment_number,
      v_existing.total_payments, v_existing.product, v_existing.paid_at;
    RETURN;
  END IF;

  IF v_payment.sale_id IS NOT NULL THEN
    SELECT * INTO v_sale FROM sales WHERE sales.id = v_payment.sale_id;
  END IF;
  IF v_payment.contact_id IS NOT NULL THEN
    SELECT * INTO v_contact FROM contacts WHERE contacts.id = v_payment.contact_id;
  END IF;
  IF v_sale.buyer_profile_id IS NOT NULL THEN
    SELECT * INTO v_buyer FROM profiles WHERE profiles.id = v_sale.buyer_profile_id;
  END IF;

  v_year := EXTRACT(YEAR FROM v_payment.paid_at)::int;
  v_month := EXTRACT(MONTH FROM v_payment.paid_at)::int;
  v_invoice_number := next_client_invoice_number(v_year, v_month);

  INSERT INTO client_invoices (
    invoice_number, payment_id, sale_id, contact_id,
    client_name, client_email,
    client_address, client_postal_code, client_city, client_country,
    amount, payment_number, total_payments, product, paid_at, created_by
  ) VALUES (
    v_invoice_number, p_payment_id, v_payment.sale_id, v_payment.contact_id,
    COALESCE(v_buyer.full_name, v_contact.full_name, 'Client'),
    COALESCE(v_buyer.email, v_contact.email),
    v_buyer.address, v_buyer.postal_code, v_buyer.city, v_buyer.country,
    v_payment.amount, v_payment.payment_number, v_payment.total_payments,
    COALESCE(v_sale.product, 'PASS AL BARAKA'), v_payment.paid_at, auth.uid()
  ) RETURNING * INTO v_inserted;

  RETURN QUERY SELECT
    v_inserted.id, v_inserted.invoice_number, v_inserted.payment_id, v_inserted.sale_id,
    v_inserted.contact_id, v_inserted.client_name, v_inserted.client_email,
    v_inserted.client_address, v_inserted.client_postal_code, v_inserted.client_city,
    v_inserted.client_country, v_inserted.amount, v_inserted.payment_number,
    v_inserted.total_payments, v_inserted.product, v_inserted.paid_at;
END;
$$;

CREATE OR REPLACE FUNCTION set_client_invoice_pdf_path(p_invoice_id uuid, p_pdf_path text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (SELECT role FROM profiles WHERE profiles.id = auth.uid()) != 'ceo' THEN
    RAISE EXCEPTION 'Forbidden: CEO role required';
  END IF;
  UPDATE client_invoices SET html_path = p_pdf_path WHERE id = p_invoice_id;
END;
$$;

GRANT EXECUTE ON FUNCTION create_client_invoice(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION set_client_invoice_pdf_path(uuid, text) TO authenticated;
