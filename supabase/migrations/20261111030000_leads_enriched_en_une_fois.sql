-- Page Leads en UN appel (audit perf du 11/11/2026).
--
-- La page lisait leads_enriched par tranches de 1000 lignes (limite du
-- serveur) : 8 requêtes, et la vue était recalculée EN ENTIER pour chacune
-- (tri sur created_at après les jointures) — ~2 s au total. Cette fonction
-- renvoie toutes les lignes d'un coup sous forme d'un seul JSON : ~0,4 s.
--
-- SECURITY INVOKER : la fonction voit exactement ce que la personne connectée
-- verrait en lisant la vue elle-même (aucun droit en plus).
create or replace function public.leads_enriched_toutes()
 returns json
 language sql
 stable
 security invoker
 set search_path to 'public'
as $function$
  select coalesce(json_agg(t order by t.created_at desc), '[]'::json)
  from public.leads_enriched t
$function$;

revoke all on function public.leads_enriched_toutes() from public, anon;
grant execute on function public.leads_enriched_toutes() to authenticated;
