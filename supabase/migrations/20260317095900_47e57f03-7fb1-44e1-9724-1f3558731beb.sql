
-- Update check constraint to include new statuses
ALTER TABLE sales DROP CONSTRAINT sales_payment_status_check;
ALTER TABLE sales ADD CONSTRAINT sales_payment_status_check 
  CHECK (payment_status = ANY (ARRAY['pending', 'in_progress', 'paid', 'late', 'lost', 'refunded', 'failed']));

-- Now cleanup all existing sales
UPDATE sales
SET payment_status = compute_sale_payment_status(id)
WHERE payment_status IS DISTINCT FROM 'lost';
