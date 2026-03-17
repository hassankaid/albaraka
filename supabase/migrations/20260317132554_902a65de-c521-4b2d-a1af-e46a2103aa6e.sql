
-- 1. Update sync_commission_status_on_payment: remove cancelled, use only lost
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
  ELSIF NEW.status = 'lost' THEN
    UPDATE commissions 
    SET status = 'cancelled', paid_at = NULL
    WHERE payment_id = NEW.id 
    AND status IN ('pending', 'due');
  ELSIF NEW.status = 'pending' THEN
    UPDATE commissions 
    SET status = 'pending', paid_at = NULL
    WHERE payment_id = NEW.id 
    AND status IN ('due', 'cancelled');
  END IF;
  -- 'late' doesn't change commission status
  RETURN NEW;
END;
$function$;

-- 2. Update compute_sale_payment_status: remove cancelled references
CREATE OR REPLACE FUNCTION public.compute_sale_payment_status(p_sale_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
DECLARE
  v_total integer;
  v_paid integer;
  v_lost integer;
  v_late integer;
  v_overdue integer;
  v_current_status text;
BEGIN
  SELECT payment_status INTO v_current_status FROM sales WHERE id = p_sale_id;
  IF v_current_status = 'lost' THEN
    RETURN 'lost';
  END IF;

  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'paid'),
    COUNT(*) FILTER (WHERE status = 'lost'),
    COUNT(*) FILTER (WHERE status = 'late'),
    COUNT(*) FILTER (WHERE status NOT IN ('paid', 'lost', 'late') AND due_date < CURRENT_DATE)
  INTO v_total, v_paid, v_lost, v_late, v_overdue
  FROM payments
  WHERE sale_id = p_sale_id;

  IF v_total = 0 THEN
    RETURN 'pending';
  END IF;

  IF v_lost > 0 THEN
    RETURN 'lost';
  END IF;

  IF v_paid = v_total AND v_paid > 0 THEN
    RETURN 'paid';
  END IF;

  IF v_late > 0 OR v_overdue > 0 THEN
    RETURN 'late';
  END IF;

  RETURN 'in_progress';
END;
$function$;

-- 3. Update auto_set_paid_at to also clear paid_at for late
CREATE OR REPLACE FUNCTION public.auto_set_paid_at_on_payment()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.status = 'paid' AND OLD.status != 'paid' AND NEW.paid_at IS NULL THEN
    NEW.paid_at = CURRENT_DATE;
  END IF;
  IF NEW.status != 'paid' AND OLD.status = 'paid' THEN
    NEW.paid_at = NULL;
  END IF;
  RETURN NEW;
END;
$function$;
