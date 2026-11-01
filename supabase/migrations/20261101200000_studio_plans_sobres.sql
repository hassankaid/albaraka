-- Format hybride : pas d'images clinquantes (retour de Sidali, 01/11/2026) : liasses de billets,
-- voitures de luxe, yachts, jets, montres, villas. La voix off n'est pas concernée (p_sobre = false).
-- Appliqué en base le 01/11/2026.

create or replace function public.studio_plan_clinquant(p_dossier text, p_description text)
returns boolean language sql immutable as $$
  select coalesce(p_dossier, '') = any (array['CASH', 'VOITURES', 'YATCHS', 'AVIONS', 'MONTRES'])
      or coalesce(p_description, '') ~* '(billets? de|liasses?|lingots?|lamborghini|ferrari|porsche|bentley|rolls|mclaren|rolex|jet priv|yacht|supercar|voiture de (sport|luxe)|voiture sportive|montre de luxe|diamant|champagne|penthouse|villa|luxe|luxueu)'
$$;

drop function if exists public.studio_job_chercher_plans(uuid, text, text, text[], text[], numeric, uuid[], integer, text[]);

CREATE OR REPLACE FUNCTION public.studio_job_chercher_plans(p_id uuid, p_jeton text, p_embedding text, p_mots text[], p_themes text[], p_duree numeric, p_exclure uuid[], p_limite integer DEFAULT 10, p_dossiers text[] DEFAULT NULL::text[], p_sobre boolean DEFAULT false)
 RETURNS TABLE(id uuid, video_id uuid, chemin_travail text, debut numeric, fin numeric, description text, ambiance text, score numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare
  m studio_montages := public._studio_job(p_id, p_jeton);
  v extensions.vector := p_embedding::extensions.vector;
begin
  return query
  with candidats as (
    select pl.*, vi.chemin_travail as chemin, vi.dossier as categorie, 1 - (pl.embedding <=> v) as sens
      from studio_banque_plans pl
      join studio_banque_videos vi on vi.id = pl.video_id
     where not pl.exclu and not vi.exclue and vi.statut = 'indexee' and vi.chemin_travail is not null
       and pl.embedding is not null
       and coalesce(pl.qualite, 'nette') = 'nette'
       and (pl.fin - pl.debut) >= p_duree + 0.2
       and not (pl.id = any(coalesce(p_exclure, '{}')))
       and not (p_sobre and public.studio_plan_clinquant(vi.dossier, pl.description))
     order by pl.embedding <=> v
     limit 300
  )
  select c.id, c.video_id, c.chemin, c.debut, c.fin, c.description, c.ambiance,
         round((0.65 * c.sens
           + 0.2 * least(1, (
               (select count(*) from unnest(c.mots_cles) k where lower(k) = any(select lower(x) from unnest(coalesce(p_mots, '{}')) x))::numeric / 3
             + (select count(*) from unnest(c.themes) t where t = any(coalesce(p_themes, '{}')))::numeric / 2))
           + 0.15 * (case when c.categorie = any(coalesce(p_dossiers, '{}')) then 1 else 0 end))::numeric, 4)
    from candidats c
   order by 8 desc
   limit greatest(1, least(p_limite, 50));
end $function$;
