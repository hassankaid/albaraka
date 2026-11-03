-- La pub d'origine d'un lead, affichée sur la fiche contact (lead et vente), 03/11/2026.
--
-- pub_origine_lead est en SECURITY INVOKER : elle ne renvoie rien d'un lead que la
-- personne ne peut pas déjà lire (RLS de leads). Seul le nom de la pub, rangé dans
-- ads_pubs (lisible par aucun rôle de l'appli), passe par la fonction privilégiée
-- pub_nom_connu.
--
-- Appliqué en base le 03/11/2026.

create or replace function public.pub_nom_connu(p_plateforme text, p_pub_id text)
returns table(pub_nom text, campagne_nom text)
language sql
stable security definer
set search_path to 'public'
as $function$
  select a.pub_nom, a.campagne_nom
  from public.ads_pubs a
  where a.plateforme = p_plateforme and a.pub_id = p_pub_id
  order by a.date desc
  limit 1
$function$;

revoke all on function public.pub_nom_connu(text, text) from public, anon;
grant execute on function public.pub_nom_connu(text, text) to authenticated;

create or replace function public.pub_origine_lead(p_lead_id uuid)
returns table(plateforme text, pub_id text, pub_nom text, campagne_nom text)
language sql
stable security invoker
set search_path to 'public'
as $function$
  select case a.canal when 'snap_ads' then 'snap' else 'meta' end,
         nullif(btrim(l.utm_content), ''),
         n.pub_nom, n.campagne_nom
  from public.leads l
  cross join lateral public.lead_attribution(l.source, l.source_detail, l.utm_source) a
  left join lateral public.pub_nom_connu(case a.canal when 'snap_ads' then 'snap' else 'meta' end, nullif(btrim(l.utm_content), '')) n on true
  where l.id = p_lead_id
    and a.canal in ('meta_ads', 'snap_ads')
$function$;

revoke all on function public.pub_origine_lead(uuid) from public, anon;
grant execute on function public.pub_origine_lead(uuid) to authenticated;
