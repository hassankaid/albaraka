
-- 1. Update sync_commission_status_on_payment to handle 'late' and 'lost'
CREATE OR REPLACE FUNCTION public.sync_commission_status_on_payment()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.status = 'paid' THEN
    UPDATE commissions 
    SET status = 'due'
    WHERE payment_id = NEW.id 
    AND status = 'pending';
  ELSIF NEW.status IN ('cancelled', 'lost') THEN
    UPDATE commissions 
    SET status = 'cancelled', paid_at = NULL
    WHERE payment_id = NEW.id 
    AND status IN ('pending', 'due');
  ELSIF NEW.status = 'pending' THEN
    UPDATE commissions 
    SET status = 'pending', paid_at = NULL
    WHERE payment_id = NEW.id 
    AND status IN ('due', 'cancelled');
  ELSIF NEW.status = 'late' THEN
    -- late doesn't change commission status, stays as-is
    NULL;
  END IF;
  RETURN NEW;
END;
$function$;

-- 2. Update compute_sale_payment_status to handle 'lost'
CREATE OR REPLACE FUNCTION public.compute_sale_payment_status(p_sale_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
DECLARE
  v_total integer;
  v_paid integer;
  v_cancelled integer;
  v_lost integer;
  v_overdue integer;
  v_late integer;
  v_current_status text;
BEGIN
  SELECT payment_status INTO v_current_status FROM sales WHERE id = p_sale_id;
  IF v_current_status = 'lost' THEN
    RETURN 'lost';
  END IF;

  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'paid'),
    COUNT(*) FILTER (WHERE status = 'cancelled'),
    COUNT(*) FILTER (WHERE status = 'lost'),
    COUNT(*) FILTER (WHERE status = 'late'),
    COUNT(*) FILTER (WHERE status NOT IN ('paid', 'cancelled', 'lost', 'late') AND due_date < CURRENT_DATE)
  INTO v_total, v_paid, v_cancelled, v_lost, v_late, v_overdue
  FROM payments
  WHERE sale_id = p_sale_id;

  IF v_total = 0 THEN
    RETURN 'pending';
  END IF;

  -- If any payment is lost, sale is lost
  IF v_lost > 0 THEN
    RETURN 'lost';
  END IF;

  -- All non-cancelled payments are paid
  IF v_paid = v_total - v_cancelled AND v_paid > 0 THEN
    RETURN 'paid';
  END IF;

  -- Some payments are late or overdue
  IF v_late > 0 OR v_overdue > 0 THEN
    RETURN 'late';
  END IF;

  RETURN 'in_progress';
END;
$function$;

-- 3. Create cascade_lost_payments function and trigger
CREATE OR REPLACE FUNCTION public.cascade_lost_payments()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status = 'lost' AND OLD.status != 'lost' THEN
    UPDATE payments
    SET status = 'lost'
    WHERE sale_id = NEW.sale_id
      AND payment_number > NEW.payment_number
      AND status NOT IN ('paid', 'lost');
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_cascade_lost_payments ON payments;
CREATE TRIGGER trg_cascade_lost_payments
  AFTER UPDATE ON payments
  FOR EACH ROW
  WHEN (NEW.status = 'lost' AND OLD.status IS DISTINCT FROM 'lost')
  EXECUTE FUNCTION cascade_lost_payments();
