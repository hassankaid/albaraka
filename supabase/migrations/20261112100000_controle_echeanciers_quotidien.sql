-- Contrôle quotidien des échéanciers (12/11/2026).
-- Chaque matin à 07:30 UTC, la fonction controle-echeanciers vérifie chez
-- Stripe que chaque échéancier en cours a un abonnement vivant derrière, et
-- alerte le CEO sinon (cloche, type echeancier_sans_prelevement).
-- Origine : trois replanifications dont le lien de re-paiement n'a jamais été
-- utilisé ; plus rien n'était programmé et l'échéance du 10/11 d'une cliente
-- n'est jamais partie. Fonction en lecture seule chez Stripe, sans secret.
select cron.unschedule(jobid) from cron.job where jobname = 'controle_echeanciers';
select cron.schedule(
  'controle_echeanciers',
  '30 7 * * *',
  $cron$
  select net.http_post(
    url := 'https://ktvszjzryabjgxyobtyc.supabase.co/functions/v1/controle-echeanciers',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb,
    timeout_milliseconds := 120000
  );
  $cron$
);
