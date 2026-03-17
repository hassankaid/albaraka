-- Fix invoice-to-commission sync for all beneficiary roles (not only apporteur)
CREATE OR REPLACE FUNCTION public.sync_commissions_on_invoice_paid()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  -- When invoice status changes to 'paid', mark linked commissions as paid
  IF NEW.status = 'paid' AND (OLD.status IS DISTINCT FROM 'paid') THEN
    UPDATE commissions c
    SET status = 'paid',
        paid_at = COALESCE(NEW.paid_at, now())
    FROM invoice_lines il
    WHERE il.invoice_id = NEW.id
      AND il.payment_id = c.payment_id
      AND il.sale_id = c.sale_id
      AND c.beneficiary_user_id = NEW.apporteur_id
      AND c.status IN ('due', 'invoiced');
  END IF;

  -- When invoice status becomes generated/sent, mark due commissions as invoiced
  IF NEW.status IN ('generated', 'sent') AND OLD.status IN ('draft', 'generated') THEN
    UPDATE commissions c
    SET status = 'invoiced'
    FROM invoice_lines il
    WHERE il.invoice_id = NEW.id
      AND il.payment_id = c.payment_id
      AND il.sale_id = c.sale_id
      AND c.beneficiary_user_id = NEW.apporteur_id
      AND c.status = 'due';
  END IF;

  RETURN NEW;
END;
$function$;

-- Backfill historical commissions left in due/invoiced although their invoice is already paid
UPDATE commissions c
SET status = 'paid',
    paid_at = COALESCE(ai.paid_at, c.paid_at, now())
FROM invoice_lines il
JOIN apporteur_invoices ai ON ai.id = il.invoice_id
WHERE ai.status = 'paid'
  AND il.payment_id = c.payment_id
  AND il.sale_id = c.sale_id
  AND c.beneficiary_user_id = ai.apporteur_id
  AND c.status IN ('due', 'invoiced');