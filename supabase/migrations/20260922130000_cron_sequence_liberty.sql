-- Tick de la séquence Liberty, toutes les minutes.
--
-- Un job distinct de `envois_conference_auto` : les deux séquences n'ont ni le
-- même calendrier ni les mêmes garde-fous, et une erreur dans l'une ne doit pas
-- empêcher l'autre de tourner.
--
-- Chaque minute, il ne fait qu'un comptage par message tant que personne n'est
-- dû — c'est-à-dire, l'immense majorité du temps, cinq comptages sur un
-- ensemble vide.
select cron.schedule(
  'sequence_liberty_auto',
  '* * * * *',
  $$ select public.tick_sequence_liberty() $$
);
