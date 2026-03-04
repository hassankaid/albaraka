
-- 1. Fix historical paid_at: set to 1st of month following payment date
UPDATE commissions c
SET paid_at = (date_trunc('month', p.paid_at::timestamptz) + interval '1 month')::timestamptz
FROM payments p
WHERE c.payment_id = p.id
  AND c.status = 'paid'
  AND p.paid_at IS NOT NULL;

-- 2. Update sync trigger: only handle status transitions, never touch paid_at
CREATE OR REPLACE FUNCTION public.sync_commission_status_on_payment()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.status = 'paid' THEN
    -- Client payment received -> commission becomes "due" (awaiting invoice)
    UPDATE commissions 
    SET status = 'due'
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

-- 3. Trigger on apporteur_invoices: when invoice is marked paid, mark linked commissions as paid
CREATE OR REPLACE FUNCTION public.sync_commissions_on_invoice_paid()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- When invoice status changes to 'paid'
  IF NEW.status = 'paid' AND (OLD.status IS DISTINCT FROM 'paid') THEN
    UPDATE commissions c
    SET status = 'paid',
        paid_at = COALESCE(NEW.paid_at, now())
    FROM invoice_lines il
    WHERE il.invoice_id = NEW.id
      AND il.payment_id = c.payment_id
      AND il.sale_id = c.sale_id
      AND c.beneficiary_user_id = NEW.apporteur_id
      AND c.role = 'apporteur'
      AND c.status IN ('due', 'invoiced');
  END IF;

  -- When invoice status changes to 'generated' or 'sent', mark as 'invoiced'
  IF NEW.status IN ('generated', 'sent') AND OLD.status IN ('draft', 'generated') THEN
    UPDATE commissions c
    SET status = 'invoiced'
    FROM invoice_lines il
    WHERE il.invoice_id = NEW.id
      AND il.payment_id = c.payment_id
      AND il.sale_id = c.sale_id
      AND c.beneficiary_user_id = NEW.apporteur_id
      AND c.role = 'apporteur'
      AND c.status = 'due';
  END IF;

  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_sync_commissions_on_invoice_paid
  AFTER UPDATE ON apporteur_invoices
  FOR EACH ROW
  EXECUTE FUNCTION sync_commissions_on_invoice_paid();
