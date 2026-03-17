-- Remove the cron job for Stripe sync
SELECT cron.unschedule('sync-stripe-payments-hourly');
