-- Garde-fou pour éviter qu'un paiement marqué `paid` n'ait pas de `paid_at`.
--
-- Cas observé : 5 paiements avaient status='paid' AND paid_at IS NULL,
-- causant un écart entre les KPIs (filtrés par due_date) et la modale
-- "factures du mois" (filtrée par paid_at). Ces paiements étaient
-- invisibles dans toute requête comptable basée sur la date d'encaissement.
--
-- Approche : trigger BEFORE INSERT/UPDATE qui auto-remplit paid_at avec
-- CURRENT_DATE si status devient 'paid' et paid_at est NULL. Ne bloque
-- jamais l'écriture (plus user-friendly qu'une CHECK constraint stricte
-- qui aurait fait planter les UPDATE oubliés). En pratique, paid_at sera
-- toujours rempli explicitement par les flux applicatifs (markAsPaid,
-- webhook stripe, RPC) — ce trigger est une assurance.

CREATE OR REPLACE FUNCTION ensure_payment_paid_at_when_paid()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'paid' AND NEW.paid_at IS NULL THEN
    NEW.paid_at := CURRENT_DATE;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_payment_paid_at_consistency ON payments;

CREATE TRIGGER trg_payment_paid_at_consistency
BEFORE INSERT OR UPDATE OF status, paid_at ON payments
FOR EACH ROW
EXECUTE FUNCTION ensure_payment_paid_at_when_paid();
