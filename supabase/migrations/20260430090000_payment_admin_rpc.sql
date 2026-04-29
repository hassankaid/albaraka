-- Édition admin des paiements depuis la page /payments (CEO uniquement).
--
-- Permet au CEO de :
--   1. Modifier date d'échéance / montant / notes d'une mensualité
--   2. Supprimer une mensualité (sauf 'paid')
--   3. Ajouter une nouvelle mensualité à une vente
--   4. Recalculer le plan : redistribuer le restant en N nouvelles mensualités
--
-- Toutes les opérations :
--   - Vérifient role='ceo' (RPC SECURITY DEFINER)
--   - Cascade sur les commissions (recalc auto si montant change)
--   - Renumérotent les mensualités de la vente (payment_number, total_payments)
--   - Mettent à jour sales.mensualites
--   - Loggent dans payment_audit_log

-- ── Audit log ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payment_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id uuid REFERENCES payments(id) ON DELETE SET NULL,
  sale_id uuid REFERENCES sales(id) ON DELETE SET NULL,
  actor_id uuid REFERENCES profiles(id),
  action text NOT NULL CHECK (action IN ('update', 'create', 'delete', 'recalculate')),
  old_values jsonb,
  new_values jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_audit_log_payment ON payment_audit_log(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_audit_log_sale ON payment_audit_log(sale_id);
CREATE INDEX IF NOT EXISTS idx_payment_audit_log_actor ON payment_audit_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_payment_audit_log_created ON payment_audit_log(created_at DESC);

ALTER TABLE payment_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS payment_audit_log_select_ceo ON payment_audit_log;
CREATE POLICY payment_audit_log_select_ceo ON payment_audit_log
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ceo')
  );

-- ── RPC 1 : update_payment_admin ──────────────────────────────────────
CREATE OR REPLACE FUNCTION update_payment_admin(
  p_payment_id uuid,
  p_due_date date DEFAULT NULL,
  p_amount numeric DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS payments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old payments;
  v_new payments;
BEGIN
  IF (SELECT role FROM profiles WHERE id = auth.uid()) != 'ceo' THEN
    RAISE EXCEPTION 'Forbidden: CEO role required';
  END IF;

  SELECT * INTO v_old FROM payments WHERE id = p_payment_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Payment not found'; END IF;

  UPDATE payments
  SET
    due_date = COALESCE(p_due_date, due_date),
    amount = COALESCE(p_amount, amount),
    notes = COALESCE(p_notes, notes),
    updated_at = now()
  WHERE id = p_payment_id
  RETURNING * INTO v_new;

  IF p_amount IS NOT NULL AND p_amount != v_old.amount THEN
    UPDATE commissions
    SET amount = ROUND((p_amount * percentage / 100)::numeric, 2),
        updated_at = now()
    WHERE payment_id = p_payment_id;
  END IF;

  INSERT INTO payment_audit_log (payment_id, sale_id, actor_id, action, old_values, new_values)
  VALUES (
    p_payment_id, v_old.sale_id, auth.uid(), 'update',
    jsonb_build_object('due_date', v_old.due_date, 'amount', v_old.amount, 'notes', v_old.notes),
    jsonb_build_object('due_date', v_new.due_date, 'amount', v_new.amount, 'notes', v_new.notes)
  );

  RETURN v_new;
END;
$$;

-- ── RPC 2 : delete_payment_admin ──────────────────────────────────────
CREATE OR REPLACE FUNCTION delete_payment_admin(p_payment_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment payments;
  v_sale_id uuid;
  v_count int;
BEGIN
  IF (SELECT role FROM profiles WHERE id = auth.uid()) != 'ceo' THEN
    RAISE EXCEPTION 'Forbidden: CEO role required';
  END IF;

  SELECT * INTO v_payment FROM payments WHERE id = p_payment_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Payment not found'; END IF;
  IF v_payment.status = 'paid' THEN
    RAISE EXCEPTION 'Cannot delete a paid payment';
  END IF;

  v_sale_id := v_payment.sale_id;

  INSERT INTO payment_audit_log (payment_id, sale_id, actor_id, action, old_values, new_values)
  VALUES (p_payment_id, v_sale_id, auth.uid(), 'delete', to_jsonb(v_payment), NULL);

  DELETE FROM commissions WHERE payment_id = p_payment_id;
  DELETE FROM payments WHERE id = p_payment_id;

  IF v_sale_id IS NOT NULL THEN
    WITH ranked AS (
      SELECT id, ROW_NUMBER() OVER (ORDER BY due_date, payment_number) AS new_num,
             COUNT(*) OVER () AS new_total
      FROM payments WHERE sale_id = v_sale_id
    )
    UPDATE payments p
    SET payment_number = r.new_num, total_payments = r.new_total, updated_at = now()
    FROM ranked r WHERE p.id = r.id;

    SELECT count(*) INTO v_count FROM payments WHERE sale_id = v_sale_id;
    UPDATE sales SET mensualites = v_count WHERE id = v_sale_id;
  END IF;
END;
$$;

-- ── RPC 3 : add_payment_admin ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION add_payment_admin(
  p_sale_id uuid,
  p_due_date date,
  p_amount numeric
)
RETURNS payments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_id uuid;
  v_new payments;
  v_contact_id uuid;
  v_count int;
  c RECORD;
BEGIN
  IF (SELECT role FROM profiles WHERE id = auth.uid()) != 'ceo' THEN
    RAISE EXCEPTION 'Forbidden: CEO role required';
  END IF;
  IF p_amount <= 0 THEN RAISE EXCEPTION 'Amount must be > 0'; END IF;

  SELECT contact_id INTO v_contact_id FROM sales WHERE id = p_sale_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Sale not found'; END IF;

  INSERT INTO payments (sale_id, contact_id, payment_number, total_payments, amount, due_date, status, payment_method)
  VALUES (p_sale_id, v_contact_id, 9999, 9999, p_amount, p_due_date, 'pending', 'manual')
  RETURNING id INTO v_new_id;

  FOR c IN
    SELECT DISTINCT ON (beneficiary_user_id, beneficiary_external, role)
      beneficiary_user_id, beneficiary_external, role, percentage
    FROM commissions
    WHERE sale_id = p_sale_id AND status != 'cancelled'
  LOOP
    INSERT INTO commissions (sale_id, payment_id, beneficiary_user_id, beneficiary_external, role, percentage, amount, status)
    VALUES (
      p_sale_id, v_new_id, c.beneficiary_user_id, c.beneficiary_external, c.role, c.percentage,
      ROUND((p_amount * c.percentage / 100)::numeric, 2), 'pending'
    );
  END LOOP;

  WITH ranked AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY due_date, created_at) AS new_num,
           COUNT(*) OVER () AS new_total
    FROM payments WHERE sale_id = p_sale_id
  )
  UPDATE payments p
  SET payment_number = r.new_num, total_payments = r.new_total, updated_at = now()
  FROM ranked r WHERE p.id = r.id;

  SELECT count(*) INTO v_count FROM payments WHERE sale_id = p_sale_id;
  UPDATE sales SET mensualites = v_count WHERE id = p_sale_id;

  SELECT * INTO v_new FROM payments WHERE id = v_new_id;

  INSERT INTO payment_audit_log (payment_id, sale_id, actor_id, action, old_values, new_values)
  VALUES (v_new_id, p_sale_id, auth.uid(), 'create', NULL, to_jsonb(v_new));

  RETURN v_new;
END;
$$;

-- ── RPC 4 : recalculate_remaining_payments ────────────────────────────
CREATE OR REPLACE FUNCTION recalculate_remaining_payments(
  p_sale_id uuid,
  p_new_remaining_count int
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_paid_count int;
  v_paid_total numeric;
  v_total_amount numeric;
  v_remaining numeric;
  v_per_installment numeric;
  v_last_paid_due date;
  v_total_after int;
  v_contact_id uuid;
  v_old_pending_count int;
  i int;
  v_new_payment_id uuid;
  c RECORD;
BEGIN
  IF (SELECT role FROM profiles WHERE id = auth.uid()) != 'ceo' THEN
    RAISE EXCEPTION 'Forbidden: CEO role required';
  END IF;
  IF p_new_remaining_count < 1 THEN
    RAISE EXCEPTION 'New count must be >= 1';
  END IF;

  SELECT contact_id, COALESCE(amount_ht, 0) INTO v_contact_id, v_total_amount
  FROM sales WHERE id = p_sale_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Sale not found'; END IF;

  SELECT COUNT(*), COALESCE(SUM(amount), 0)
  INTO v_paid_count, v_paid_total
  FROM payments WHERE sale_id = p_sale_id AND status = 'paid';

  v_remaining := v_total_amount - v_paid_total;
  IF v_remaining <= 0 THEN
    RAISE EXCEPTION 'No remaining amount to redistribute';
  END IF;

  v_per_installment := ROUND((v_remaining / p_new_remaining_count)::numeric, 2);

  SELECT MAX(due_date) INTO v_last_paid_due FROM payments WHERE sale_id = p_sale_id AND status = 'paid';
  IF v_last_paid_due IS NULL THEN v_last_paid_due := CURRENT_DATE; END IF;

  SELECT count(*) INTO v_old_pending_count FROM payments WHERE sale_id = p_sale_id AND status != 'paid';

  INSERT INTO payment_audit_log (payment_id, sale_id, actor_id, action, old_values, new_values)
  VALUES (
    NULL, p_sale_id, auth.uid(), 'recalculate',
    jsonb_build_object('removed_pending_count', v_old_pending_count, 'paid_total', v_paid_total),
    jsonb_build_object('new_count', p_new_remaining_count, 'per_installment', v_per_installment, 'remaining', v_remaining)
  );

  DELETE FROM commissions
  WHERE payment_id IN (SELECT id FROM payments WHERE sale_id = p_sale_id AND status != 'paid');

  DELETE FROM payments WHERE sale_id = p_sale_id AND status != 'paid';

  FOR i IN 1..p_new_remaining_count LOOP
    INSERT INTO payments (sale_id, contact_id, payment_number, total_payments, amount, due_date, status, payment_method)
    VALUES (
      p_sale_id, v_contact_id, 9000 + i, 9999, v_per_installment,
      (v_last_paid_due + (i || ' months')::interval)::date,
      'pending', 'manual'
    )
    RETURNING id INTO v_new_payment_id;

    FOR c IN
      SELECT DISTINCT ON (beneficiary_user_id, beneficiary_external, role)
        beneficiary_user_id, beneficiary_external, role, percentage
      FROM commissions
      WHERE sale_id = p_sale_id AND status != 'cancelled'
    LOOP
      INSERT INTO commissions (sale_id, payment_id, beneficiary_user_id, beneficiary_external, role, percentage, amount, status)
      VALUES (
        p_sale_id, v_new_payment_id, c.beneficiary_user_id, c.beneficiary_external, c.role, c.percentage,
        ROUND((v_per_installment * c.percentage / 100)::numeric, 2), 'pending'
      );
    END LOOP;
  END LOOP;

  v_total_after := v_paid_count + p_new_remaining_count;
  WITH ranked AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY due_date, created_at) AS new_num
    FROM payments WHERE sale_id = p_sale_id
  )
  UPDATE payments p
  SET payment_number = r.new_num, total_payments = v_total_after, updated_at = now()
  FROM ranked r WHERE p.id = r.id;

  UPDATE sales SET mensualites = v_total_after WHERE id = p_sale_id;
END;
$$;

GRANT EXECUTE ON FUNCTION update_payment_admin(uuid, date, numeric, text) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_payment_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION add_payment_admin(uuid, date, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION recalculate_remaining_payments(uuid, int) TO authenticated;
