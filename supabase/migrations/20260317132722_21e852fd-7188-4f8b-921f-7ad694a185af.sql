
-- 1. Drop old check constraint
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_status_check;

-- 2. Migrate data: cancelled → lost
UPDATE payments SET status = 'lost' WHERE status = 'cancelled';

-- 3. Add new check constraint
ALTER TABLE payments ADD CONSTRAINT payments_status_check 
  CHECK (status = ANY (ARRAY['pending'::text, 'paid'::text, 'late'::text, 'lost'::text]));
