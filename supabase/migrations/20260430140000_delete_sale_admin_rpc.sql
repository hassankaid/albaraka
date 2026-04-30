-- Suppression complète d'une vente depuis /sales (CEO uniquement).
--
-- Cascade auto via FK :
--   - commissions (CASCADE)
--   - payments (CASCADE)
--   - payment_audit_log (SET NULL — historique préservé)
--
-- Bloqué (RAISE EXCEPTION) si :
--   - invoice_lines.sale_id : la vente apparaît dans une facture déjà émise
--   - sales.parent_sale_id : la vente a des ventes filles (acomptes / solde)
--
-- Audit log via payment_audit_log avec snapshot JSON complet de la vente
-- avant suppression (sale + payments + commissions).

CREATE OR REPLACE FUNCTION delete_sale_admin(p_sale_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sale sales;
  v_invoice_lines_count int;
  v_child_sales_count int;
  v_payments_count int;
  v_commissions_count int;
  v_snapshot jsonb;
BEGIN
  IF (SELECT role FROM profiles WHERE id = auth.uid()) != 'ceo' THEN
    RAISE EXCEPTION 'Forbidden: CEO role required';
  END IF;

  SELECT * INTO v_sale FROM sales WHERE id = p_sale_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Sale not found'; END IF;

  -- Bloquer si la vente a des invoice_lines (factures impactées)
  SELECT COUNT(*) INTO v_invoice_lines_count
  FROM invoice_lines WHERE sale_id = p_sale_id;
  IF v_invoice_lines_count > 0 THEN
    RAISE EXCEPTION 'Cannot delete sale: % invoice line(s) exist. Delete or detach them first.', v_invoice_lines_count;
  END IF;

  -- Bloquer si la vente a des ventes filles
  SELECT COUNT(*) INTO v_child_sales_count
  FROM sales WHERE parent_sale_id = p_sale_id;
  IF v_child_sales_count > 0 THEN
    RAISE EXCEPTION 'Cannot delete sale: % child sale(s) exist (acomptes). Delete them first.', v_child_sales_count;
  END IF;

  SELECT COUNT(*) INTO v_payments_count FROM payments WHERE sale_id = p_sale_id;
  SELECT COUNT(*) INTO v_commissions_count FROM commissions WHERE sale_id = p_sale_id;

  v_snapshot := jsonb_build_object(
    'sale', to_jsonb(v_sale),
    'payments_count', v_payments_count,
    'commissions_count', v_commissions_count,
    'payments', (SELECT jsonb_agg(to_jsonb(p)) FROM payments p WHERE p.sale_id = p_sale_id),
    'commissions', (SELECT jsonb_agg(to_jsonb(c)) FROM commissions c WHERE c.sale_id = p_sale_id)
  );

  INSERT INTO payment_audit_log (payment_id, sale_id, actor_id, action, old_values, new_values)
  VALUES (NULL, p_sale_id, auth.uid(), 'delete', v_snapshot, NULL);

  DELETE FROM sales WHERE id = p_sale_id;
END;
$$;

GRANT EXECUTE ON FUNCTION delete_sale_admin(uuid) TO authenticated;
