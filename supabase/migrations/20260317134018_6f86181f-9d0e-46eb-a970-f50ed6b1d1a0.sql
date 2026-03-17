-- Reset all payments that were modified by the Stripe sync back to pending
-- This targets payments that have paid_at set by the sync (recent dates) 
-- but were not manually set before the sync existed
UPDATE payments
SET status = 'pending', paid_at = NULL
WHERE status = 'paid'
  AND paid_at IS NOT NULL
  AND paid_at >= '2025-10-01';
