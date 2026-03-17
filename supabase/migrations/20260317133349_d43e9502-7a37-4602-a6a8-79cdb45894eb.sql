-- Reset wrongly matched payments where paid_at is more than 45 days before due_date
-- These were incorrectly matched by the first sync run
UPDATE payments
SET status = 'pending', paid_at = NULL
WHERE status = 'paid'
  AND paid_at IS NOT NULL
  AND paid_at < (due_date - interval '45 days');
