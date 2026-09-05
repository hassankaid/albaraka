-- Résultats bruts d'un test A/B, une ligne par variante.
--
-- La fonction ne renvoie QUE des mesures dénombrables. Les taux, le contrôle de
-- déséquilibre (SRM) et le test de proportions vivent dans `src/lib/abtest.ts`,
-- où ils sont couverts par des tests unitaires — un taux moyen n'est pas la
-- moyenne des taux, et la significativité se teste sur des effectifs, pas sur
-- des pourcentages arrondis.

create or replace function public.ab_test_resultats(p_code text)
returns table (
  variant     text,
  poids       int,
  visiteurs   bigint,
  leads       bigint,
  ventes      bigint,
  ca          numeric
)
language sql
stable
security invoker
as $function$
  with t as (
    select id, code, variants, weights from ab_tests where code = p_code
  ),
  declarees as (
    select v.variant, w.poids
    from t
    cross join lateral unnest(t.variants) with ordinality as v(variant, i)
    cross join lateral unnest(t.weights)  with ordinality as w(poids, j)
    where v.i = w.j
  ),
  expo as (
    select e.variant, count(*) as n
    from ab_exposures e join t on t.id = e.test_id
    group by e.variant
  ),
  inscrits as (
    select l.tunnel_variant as variant, count(*) as n,
           count(s.id) as ventes, coalesce(sum(s.amount_ht), 0) as ca
    from leads l
    join t on t.code = l.ab_test_code
    left join sales s on s.lead_id = l.id
    group by l.tunnel_variant
  )
  select d.variant, d.poids,
         coalesce(e.n, 0), coalesce(i.n, 0), coalesce(i.ventes, 0), coalesce(i.ca, 0)
  from declarees d
  left join expo e     on e.variant = d.variant
  left join inscrits i on i.variant = d.variant
  order by d.variant;
$function$;

comment on function public.ab_test_resultats(text) is
  'Mesures brutes par variante pour un test A/B. Taux et significativité côté application.';
