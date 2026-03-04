DO $$
DECLARE
  g RECORD;
BEGIN
  FOR g IN
    SELECT DISTINCT c.sale_id, c.beneficiary_user_id, c.beneficiary_external, c.role
    FROM public.commissions c
    WHERE c.payment_id IS NOT NULL
  LOOP
    PERFORM public.rebalance_commission_group(
      g.sale_id,
      g.beneficiary_user_id,
      g.beneficiary_external,
      g.role
    );
  END LOOP;
END $$;