
CREATE OR REPLACE FUNCTION public.split_commission_on_insert()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_payment RECORD;
  v_commission_amount NUMERIC;
  v_total_exact NUMERIC;
  v_sum_so_far NUMERIC := 0;
  v_count INTEGER := 0;
  v_total_payments INTEGER;
BEGIN
  -- Seulement si payment_id est NULL (commission globale)
  IF NEW.payment_id IS NULL THEN
    
    -- Calculer le montant total exact de la commission
    SELECT COALESCE(SUM(amount), 0) INTO v_total_exact FROM payments WHERE sale_id = NEW.sale_id;
    v_total_exact := ROUND(v_total_exact * (NEW.percentage / 100), 2);
    
    -- Compter le nombre total de paiements
    SELECT COUNT(*) INTO v_total_payments FROM payments WHERE sale_id = NEW.sale_id;
    
    -- Pour chaque paiement de cette vente
    FOR v_payment IN 
      SELECT * FROM payments WHERE sale_id = NEW.sale_id ORDER BY payment_number ASC
    LOOP
      v_count := v_count + 1;
      
      IF v_count = v_total_payments THEN
        -- Dernière mensualité : on compense pour que le total soit exact
        v_commission_amount := v_total_exact - v_sum_so_far;
      ELSE
        -- Arrondi normal
        v_commission_amount := ROUND(v_payment.amount * (NEW.percentage / 100), 2);
        v_sum_so_far := v_sum_so_far + v_commission_amount;
      END IF;
      
      -- Créer la commission pour ce paiement
      INSERT INTO commissions (
        sale_id,
        payment_id,
        beneficiary_user_id,
        beneficiary_external,
        percentage,
        amount,
        role,
        status
      ) VALUES (
        NEW.sale_id,
        v_payment.id,
        NEW.beneficiary_user_id,
        NEW.beneficiary_external,
        NEW.percentage,
        v_commission_amount,
        NEW.role,
        CASE WHEN v_payment.status = 'paid' THEN 'due' ELSE 'pending' END
      );
    END LOOP;
    
    -- Retourner NULL pour annuler l'insertion de la commission globale
    RETURN NULL;
  END IF;
  
  RETURN NEW;
END;
$function$;
