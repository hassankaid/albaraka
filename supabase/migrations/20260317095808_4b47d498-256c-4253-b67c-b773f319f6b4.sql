
-- Function to compute payment_status for a sale based on its payments
CREATE OR REPLACE FUNCTION public.compute_sale_payment_status(p_sale_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  v_total integer;
  v_paid integer;
  v_cancelled integer;
  v_overdue integer;
  v_current_status text;
BEGIN
  -- Get current status to preserve 'lost' if set by CEO
  SELECT payment_status INTO v_current_status FROM sales WHERE id = p_sale_id;
  IF v_current_status = 'lost' THEN
    RETURN 'lost';
  END IF;

  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'paid'),
    COUNT(*) FILTER (WHERE status = 'cancelled'),
    COUNT(*) FILTER (WHERE status != 'paid' AND status != 'cancelled' AND due_date < CURRENT_DATE)
  INTO v_total, v_paid, v_cancelled, v_overdue
  FROM payments
  WHERE sale_id = p_sale_id;

  IF v_total = 0 THEN
    RETURN 'pending';
  END IF;

  -- All non-cancelled payments are paid
  IF v_paid = v_total - v_cancelled AND v_paid > 0 THEN
    RETURN 'paid';
  END IF;

  -- Some payments are overdue
  IF v_overdue > 0 THEN
    RETURN 'late';
  END IF;

  -- Payments exist but not all paid yet
  RETURN 'in_progress';
END;
$$;

-- Trigger function to auto-update sale payment_status when payments change
CREATE OR REPLACE FUNCTION public.sync_sale_payment_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_sale_id uuid;
BEGIN
  v_sale_id := COALESCE(NEW.sale_id, OLD.sale_id);
  IF v_sale_id IS NOT NULL THEN
    UPDATE sales
    SET payment_status = compute_sale_payment_status(v_sale_id)
    WHERE id = v_sale_id
    AND payment_status IS DISTINCT FROM 'lost';
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger on payments table
DROP TRIGGER IF EXISTS trg_sync_sale_payment_status ON payments;
CREATE TRIGGER trg_sync_sale_payment_status
AFTER INSERT OR UPDATE OR DELETE ON payments
FOR EACH ROW
EXECUTE FUNCTION sync_sale_payment_status();
