-- Plateforme au ralenti (remontée Sidali, 10/11/2026 au soir).
--
-- Cause : les règles « Sans paramètres » du 10/11 (Snapchat puis Meta) ont été
-- ajoutées en EMBALLANT lead_attribution : la version à 5 arguments appelle
-- celle à 4, qui appelle celle à 3. Une fonction SQL appelée depuis une autre
-- n'est ni intégrée ni mise en cache : chaque lead payait ~0,65 ms au lieu de
-- ~0,05 ms. leads_enriched (page Leads, tableaux de bord) est passée de
-- ~0,4 s à ~5-6 s pour 7 457 leads.
--
-- Correctif : mêmes règles, réécrites À PLAT (un seul corps, plus d’appel
-- imbriqué). Résultat vérifié identique sur tous les leads avant application.

create or replace function public.lead_attribution(p_source text, p_detail text, p_utm_source text, p_app_origine text)
 returns table(canal text, tunnel text, canal_precision text)
 language sql
 stable
 set search_path to 'public'
as $function$
  with m as (select * from lead_sources_map where source = p_source),
       lien as (
         select coalesce(
                  (select a.canal from lead_canaux_alias a where a.ancien = lower(btrim(p_detail))),
                  (select c.cle from lead_canaux c where c.cle = lower(btrim(p_detail)))) as cle),
       brut as (
         select case when coalesce((select m.canal from m), 'sans_source') = 'sans_source' and (select cle from lien) is not null
                     then (select cle from lien)
                     else coalesce((select m.canal from m), case when p_source is null then 'autre' else 'sans_source' end)
                end as canal),
       fin as (
         select coalesce((select a.canal from lead_canaux_alias a where a.ancien = brut.canal), brut.canal) as canal
         from brut),
       regle as (
         select fin.canal,
                (fin.canal = 'sans_source' and p_source like '%\_direct' and coalesce(p_app_origine = 'snapchat', false)) as snap
         from fin)
  select case when regle.snap then 'snap_ads' else regle.canal end,
         (select m.tunnel from m),
         case when regle.snap then 'Sans paramètres'
              when regle.canal = 'meta_ads'
                then case when lower(coalesce(p_utm_source, '')) in ('ig', 'instagram') then 'Instagram'
                          when lower(coalesce(p_utm_source, '')) in ('fb', 'facebook') then 'Facebook'
                          else (select m.canal_precision from m) end
              else (select m.canal_precision from m)
         end
  from regle
$function$;

-- Version à 5 arguments (celle qu'utilisent leads_enriched et les tableaux de
-- bord) : SANS « set search_path » et avec des noms qualifiés public.*, pour
-- que Postgres puisse l'INTÉGRER dans la requête appelante au lieu de
-- l'exécuter lead par lead. Mesuré : 23 ms pour 7 457 leads (contre ~1,6 s
-- aplatie avec search_path, ~5 s emballée) ; leads_enriched ~0,37 s.
-- Pas de security definer : aucune élévation de droits, le search_path
-- appelant ne peut rien détourner (tout est qualifié, opérateurs pg_catalog).
create or replace function public.lead_attribution(p_source text, p_detail text, p_utm_source text, p_app_origine text, p_clic_pub jsonb)
 returns table(canal text, tunnel text, canal_precision text)
 language sql
 stable

as $function$
  with m as (select * from public.lead_sources_map where source = p_source),
       lien as (
         select coalesce(
                  (select a.canal from public.lead_canaux_alias a where a.ancien = lower(btrim(p_detail))),
                  (select c.cle from public.lead_canaux c where c.cle = lower(btrim(p_detail)))) as cle),
       brut as (
         select case when coalesce((select m.canal from m), 'sans_source') = 'sans_source' and (select cle from lien) is not null
                     then (select cle from lien)
                     else coalesce((select m.canal from m), case when p_source is null then 'autre' else 'sans_source' end)
                end as canal),
       fin as (
         select coalesce((select a.canal from public.lead_canaux_alias a where a.ancien = brut.canal), brut.canal) as canal
         from brut),
       regle as (
         select fin.canal,
                (fin.canal = 'sans_source' and p_source like '%\_direct' and coalesce(p_app_origine = 'snapchat', false)) as snap,
                (fin.canal = 'sans_source' and p_source like '%\_direct' and coalesce(p_clic_pub ? 'meta_adid', false)) as meta
         from fin)
  select case when regle.snap then 'snap_ads' when regle.meta then 'meta_ads' else regle.canal end,
         (select m.tunnel from m),
         case when regle.snap or regle.meta then 'Sans paramètres'
              when regle.canal = 'meta_ads'
                then case when lower(coalesce(p_utm_source, '')) in ('ig', 'instagram') then 'Instagram'
                          when lower(coalesce(p_utm_source, '')) in ('fb', 'facebook') then 'Facebook'
                          else (select m.canal_precision from m) end
              else (select m.canal_precision from m)
         end
  from regle
$function$;
