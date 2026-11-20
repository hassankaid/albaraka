-- Rappel par e-mail 3 jours avant chaque prélèvement : activation de l'envoi
-- automatique (accord de Hassan le 20/11/2026).
--
-- La fonction rappel-prelevement et tick_rappel_prelevement() existent depuis
-- la migration 20260928230000 ; seule la tâche planifiée manquait, si bien
-- qu'aucun rappel n'était jamais parti.
--
-- La tâche tourne à 8 h et 9 h UTC ; tick_rappel_prelevement() ne fait rien en
-- dehors de 10 h à Paris, ce qui donne un seul envoi par jour à 10 h, été
-- comme hiver. Un envoi déjà fait pour un abonnement et une date n'est jamais
-- refait (index unique + Idempotency-Key Resend).
do $$
begin
  if exists (select 1 from cron.job where jobname = 'rappel_prelevement_quotidien') then
    perform cron.unschedule('rappel_prelevement_quotidien');
  end if;
  perform cron.schedule(
    'rappel_prelevement_quotidien',
    '0 8,9 * * *',
    $cmd$ select public.tick_rappel_prelevement() $cmd$
  );
end $$;
