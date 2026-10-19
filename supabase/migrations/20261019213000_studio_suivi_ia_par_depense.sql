-- Studio, carte « Crédit IA » : un montage relancé (créé avant le début du suivi) compte
-- aussi, dès qu'il a coûté quelque chose depuis le début du suivi. On se fonde donc sur la
-- date de la dernière dépense (studio_montages_couts.updated_at) et plus sur la création.
create or replace function public.studio_suivi_ia()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with depuis as (select coalesce((studio_config_valeur('cout_suivi_depuis') #>> '{}')::timestamptz, now()) as t),
  suivis as (
    select m.statut, c.cout_ia_usd as cout
      from studio_montages_couts c join studio_montages m on m.id = c.montage_id, depuis
     where c.updated_at >= depuis.t and c.cout_ia_usd > 0
  )
  select case when not is_ceo(auth.uid()) then null else jsonb_build_object(
    'credit', studio_config_valeur('credit_ia'),
    'seuil', studio_config_valeur('credit_alerte_seuil'),
    'depuis', (select t from depuis),
    'montages', (select count(*) from suivis),
    'depense', (select round(coalesce(sum(cout), 0), 2) from suivis),
    'cout_moyen', (select case when count(*) >= 3 then round(avg(cout), 3) end from suivis where statut = 'termine')
  ) end;
$$;
