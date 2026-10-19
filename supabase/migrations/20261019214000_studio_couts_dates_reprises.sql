-- Les coûts repris des anciens montages (migration 20261019210000) avaient pour date celle
-- de la migration : ils comptaient comme des dépenses du soir dans la carte « Crédit IA ».
-- On leur rend la date de leur montage. Seuls les coûts déclarés par la machine depuis
-- le début du suivi (cout_suivi_depuis) gardent leur date réelle.
update public.studio_montages_couts c
   set updated_at = m.updated_at
  from public.studio_montages m
 where m.id = c.montage_id
   and c.updated_at between '2026-10-19 20:50:00+00' and '2026-10-19 20:56:00+00'
   and m.updated_at < (public.studio_config_valeur('cout_suivi_depuis') #>> '{}')::timestamptz;
