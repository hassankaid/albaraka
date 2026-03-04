
-- Fix existing paid payments with NULL paid_at (set to due_date as best estimate)
UPDATE payments SET paid_at = due_date WHERE status = 'paid' AND paid_at IS NULL;

-- Create trigger to auto-set paid_at when payment is marked as paid
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

CREATE TRIGGER trg_auto_paid_at
BEFORE UPDATE ON payments
FOR EACH ROW
EXECUTE FUNCTION auto_set_paid_at_on_payment();
