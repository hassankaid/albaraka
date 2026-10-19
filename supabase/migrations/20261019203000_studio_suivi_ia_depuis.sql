-- Studio, carte « Crédit IA » : les moyennes ne portent que sur les montages dont le coût
-- est suivi complètement (déclaré à chaque passage depuis la migration 20261019200000).
-- Les montages d'avant n'ont que le coût de leur dernier passage : les compter faisait
-- croire à 0,07 $ par montage (≈ 1 450 montages restants) au lieu d'environ 0,20 $.

insert into public.studio_config (cle, valeur) values ('cout_suivi_depuis', to_jsonb(now()))
on conflict (cle) do nothing;

create or replace function public.studio_suivi_ia()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with depuis as (select coalesce((studio_config_valeur('cout_suivi_depuis') #>> '{}')::timestamptz, now()) as t),
  suivis as (select m.* from studio_montages m, depuis where m.created_at >= depuis.t)
  select case when not is_ceo(auth.uid()) then null else jsonb_build_object(
    'credit', studio_config_valeur('credit_ia'),
    'seuil', studio_config_valeur('credit_alerte_seuil'),
    'depuis', (select t from depuis),
    'montages', (select count(*) from suivis where cout_ia_usd > 0),
    'depense', (select round(coalesce(sum(cout_ia_usd), 0), 2) from suivis),
    -- moyenne fiable à partir de 3 montages terminés ; sinon le front affiche une estimation
    'cout_moyen', (select case when count(*) >= 3 then round(avg(cout_ia_usd), 3) end
                     from suivis where statut = 'termine' and cout_ia_usd > 0)
  ) end;
$$;
