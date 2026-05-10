-- Filet de sécurité : si un INSERT/UPDATE sur payments laisse contact_id NULL
-- alors que la vente liée a un contact, on le copie automatiquement.
--
-- Évite définitivement le bug observé sur les 3 ventes modifiées via le
-- wizard "Modifier le plan" (Ansara, Sidali Test, Sanna), où les nouveaux
-- pendings n'avaient pas de contact_id → /admin/payments ne pouvait pas
-- afficher le nom/email/téléphone de l'acheteur.
--
-- Idempotent : si contact_id est déjà fourni, le trigger ne touche à rien.

CREATE OR REPLACE FUNCTION public.payments_fill_contact_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.contact_id IS NULL AND NEW.sale_id IS NOT NULL THEN
    SELECT s.contact_id INTO NEW.contact_id
    FROM sales s
    WHERE s.id = NEW.sale_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_payments_fill_contact_id ON public.payments;

CREATE TRIGGER trg_payments_fill_contact_id
BEFORE INSERT OR UPDATE OF sale_id ON public.payments
FOR EACH ROW
EXECUTE FUNCTION public.payments_fill_contact_id();
