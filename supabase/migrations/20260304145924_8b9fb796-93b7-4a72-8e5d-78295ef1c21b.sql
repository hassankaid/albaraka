-- Set paid_at = now() for all commissions that are 'paid' but have no paid_at date
UPDATE commissions
SET paid_at = now()
WHERE status = 'paid' AND paid_at IS NULL;