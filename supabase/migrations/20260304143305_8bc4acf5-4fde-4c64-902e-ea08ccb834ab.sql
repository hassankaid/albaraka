CREATE OR REPLACE FUNCTION public.rebalance_commission_group(
  p_sale_id uuid,
  p_beneficiary_user_id uuid,
  p_beneficiary_external text,
  p_role text
)
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $function$
DECLARE
  v_target_total numeric;
  v_total_payments numeric;
  v_sum_so_far numeric := 0;
  v_row_count integer := 0;
  v_idx integer := 0;
  v_row RECORD;
  v_percentage numeric;
  v_sale_amount numeric;
  v_line_amount numeric;
BEGIN
  SELECT c.percentage
  INTO v_percentage
  FROM commissions c
  WHERE c.sale_id = p_sale_id
    AND c.role = p_role
    AND c.payment_id IS NOT NULL
    AND c.beneficiary_user_id IS NOT DISTINCT FROM p_beneficiary_user_id
    AND c.beneficiary_external IS NOT DISTINCT FROM p_beneficiary_external
  ORDER BY c.created_at, c.id
  LIMIT 1;

  IF v_percentage IS NULL THEN
    RETURN;
  END IF;

  SELECT s.amount_ht INTO v_sale_amount FROM sales s WHERE s.id = p_sale_id;
  IF v_sale_amount IS NULL THEN
    RETURN;
  END IF;

  v_target_total := ROUND(v_sale_amount * (v_percentage / 100), 2);

  SELECT COALESCE(SUM(p.amount), 0), COUNT(*)
  INTO v_total_payments, v_row_count
  FROM commissions c
  JOIN payments p ON p.id = c.payment_id
  WHERE c.sale_id = p_sale_id
    AND c.role = p_role
    AND c.beneficiary_user_id IS NOT DISTINCT FROM p_beneficiary_user_id
    AND c.beneficiary_external IS NOT DISTINCT FROM p_beneficiary_external;

  IF v_row_count = 0 THEN
    RETURN;
  END IF;

  FOR v_row IN
    SELECT c.id, p.amount AS payment_amount
    FROM commissions c
    JOIN payments p ON p.id = c.payment_id
    WHERE c.sale_id = p_sale_id
      AND c.role = p_role
      AND c.beneficiary_user_id IS NOT DISTINCT FROM p_beneficiary_user_id
      AND c.beneficiary_external IS NOT DISTINCT FROM p_beneficiary_external
    ORDER BY p.payment_number, c.id
  LOOP
    v_idx := v_idx + 1;

    IF v_idx = v_row_count THEN
      v_line_amount := v_target_total - v_sum_so_far;
    ELSE
      IF v_total_payments > 0 THEN
        v_line_amount := ROUND((v_row.payment_amount / v_total_payments) * v_target_total, 2);
      ELSE
        v_line_amount := ROUND(v_target_total / v_row_count, 2);
      END IF;
      v_sum_so_far := v_sum_so_far + v_line_amount;
    END IF;

    UPDATE commissions
    SET amount = v_line_amount
    WHERE id = v_row.id;
  END LOOP;
END;
$function$;


CREATE OR REPLACE FUNCTION public.split_commission_on_insert()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
DECLARE
  v_payment RECORD;
BEGIN
  -- Seulement si payment_id est NULL (commission globale)
  IF NEW.payment_id IS NULL THEN

    FOR v_payment IN
      SELECT * FROM payments WHERE sale_id = NEW.sale_id ORDER BY payment_number ASC
    LOOP
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
        0,
        NEW.role,
        CASE WHEN v_payment.status = 'paid' THEN 'due' ELSE 'pending' END
      );
    END LOOP;

    PERFORM rebalance_commission_group(
      NEW.sale_id,
      NEW.beneficiary_user_id,
      NEW.beneficiary_external,
      NEW.role
    );

    RETURN NULL;
  END IF;

  RETURN NEW;
END;
$function$;


CREATE OR REPLACE FUNCTION public.update_commissions_on_percentage_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  IF NEW.percentage != OLD.percentage THEN
    UPDATE commissions c
    SET percentage = NEW.percentage
    WHERE c.sale_id = NEW.sale_id
      AND c.role = NEW.role
      AND c.id != NEW.id
      AND c.beneficiary_user_id IS NOT DISTINCT FROM NEW.beneficiary_user_id
      AND c.beneficiary_external IS NOT DISTINCT FROM NEW.beneficiary_external;

    PERFORM rebalance_commission_group(
      NEW.sale_id,
      NEW.beneficiary_user_id,
      NEW.beneficiary_external,
      NEW.role
    );
  END IF;

  RETURN NEW;
END;
$function$;


CREATE OR REPLACE FUNCTION public.create_commissions_for_sale()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
DECLARE
  v_lead RECORD;
  v_payment RECORD;
  v_commission_rate NUMERIC;
BEGIN
  SELECT * INTO v_lead FROM leads WHERE id = NEW.lead_id;

  IF v_lead.apporteur_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT percentage INTO v_commission_rate
  FROM commissions
  WHERE sale_id = NEW.id
    AND beneficiary_user_id = v_lead.apporteur_id
    AND role = 'apporteur'
  LIMIT 1;

  IF v_commission_rate IS NOT NULL THEN
    FOR v_payment IN
      SELECT * FROM payments WHERE sale_id = NEW.id ORDER BY payment_number ASC
    LOOP
      IF NOT EXISTS (
        SELECT 1 FROM commissions
        WHERE payment_id = v_payment.id
          AND beneficiary_user_id = v_lead.apporteur_id
          AND role = 'apporteur'
      ) THEN
        INSERT INTO commissions (
          sale_id,
          payment_id,
          beneficiary_user_id,
          percentage,
          amount,
          role,
          status
        ) VALUES (
          NEW.id,
          v_payment.id,
          v_lead.apporteur_id,
          v_commission_rate,
          0,
          'apporteur',
          CASE WHEN v_payment.status = 'paid' THEN 'due' ELSE 'pending' END
        );
      END IF;
    END LOOP;

    DELETE FROM commissions
    WHERE sale_id = NEW.id
      AND beneficiary_user_id = v_lead.apporteur_id
      AND role = 'apporteur'
      AND payment_id IS NULL;

    PERFORM rebalance_commission_group(NEW.id, v_lead.apporteur_id, NULL, 'apporteur');
  END IF;

  RETURN NEW;
END;
$function$;


CREATE OR REPLACE FUNCTION public.create_commission_on_payment_insert()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
DECLARE
  v_sale RECORD;
  v_lead RECORD;
  v_commission RECORD;
BEGIN
  SELECT * INTO v_sale FROM sales WHERE id = NEW.sale_id;

  IF v_sale IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT * INTO v_lead FROM leads WHERE id = v_sale.lead_id;

  IF v_lead IS NULL OR v_lead.apporteur_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT * INTO v_commission
  FROM commissions
  WHERE sale_id = NEW.sale_id
    AND beneficiary_user_id = v_lead.apporteur_id
    AND role = 'apporteur'
  LIMIT 1;

  IF v_commission IS NULL OR v_commission.percentage IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO commissions (
    sale_id,
    payment_id,
    beneficiary_user_id,
    percentage,
    amount,
    role,
    status
  ) VALUES (
    NEW.sale_id,
    NEW.id,
    v_lead.apporteur_id,
    v_commission.percentage,
    0,
    'apporteur',
    CASE WHEN NEW.status = 'paid' THEN 'due' ELSE 'pending' END
  );

  PERFORM rebalance_commission_group(NEW.sale_id, v_lead.apporteur_id, NULL, 'apporteur');

  RETURN NEW;
END;
$function$;


CREATE OR REPLACE FUNCTION public.update_commission_on_payment_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
DECLARE
  v_group RECORD;
BEGIN
  IF NEW.amount != OLD.amount THEN
    FOR v_group IN
      SELECT DISTINCT c.sale_id, c.beneficiary_user_id, c.beneficiary_external, c.role
      FROM commissions c
      WHERE c.payment_id = NEW.id
    LOOP
      PERFORM rebalance_commission_group(
        v_group.sale_id,
        v_group.beneficiary_user_id,
        v_group.beneficiary_external,
        v_group.role
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$function$;


CREATE OR REPLACE FUNCTION public.delete_commission_on_payment_delete()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
DECLARE
  v_group RECORD;
BEGIN
  FOR v_group IN
    SELECT DISTINCT c.sale_id, c.beneficiary_user_id, c.beneficiary_external, c.role
    FROM commissions c
    WHERE c.payment_id = OLD.id
  LOOP
    DELETE FROM commissions
    WHERE payment_id = OLD.id
      AND sale_id = v_group.sale_id
      AND role = v_group.role
      AND beneficiary_user_id IS NOT DISTINCT FROM v_group.beneficiary_user_id
      AND beneficiary_external IS NOT DISTINCT FROM v_group.beneficiary_external;

    PERFORM rebalance_commission_group(
      v_group.sale_id,
      v_group.beneficiary_user_id,
      v_group.beneficiary_external,
      v_group.role
    );
  END LOOP;

  RETURN OLD;
END;
$function$;