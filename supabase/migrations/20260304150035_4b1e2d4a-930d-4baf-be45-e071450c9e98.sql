-- Fix paid_at to reflect the actual payment date, not the migration date
UPDATE commissions c
SET paid_at = p.paid_at::timestamptz
FROM payments p
WHERE c.payment_id = p.id
  AND c.status = 'paid'
  AND p.paid_at IS NOT NULL;

-- Also update the sync trigger to set paid_at automatically when status changes to paid
CREATE OR REPLACE FUNCTION public.sync_commission_status_on_payment()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.status = 'paid' THEN
    UPDATE commissions 
    SET status = 'due', paid_at = NULL
    WHERE payment_id = NEW.id 
    AND status = 'pending';
  ELSIF NEW.status = 'cancelled' THEN
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
  RETURN NEW;
END;
$function$;