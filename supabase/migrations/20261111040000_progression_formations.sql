-- Liste des formations : progression de TOUTES les formations en un appel
-- (audit perf du 11/11/2026). La page faisait 3 requêtes par formation
-- (get_formation_progress, chapitres publiés, chapitres faits), soit jusqu'à
-- 42 requêtes pour 14 formations.
--
-- Mêmes calculs que get_formation_progress : chapitres et modules publiés,
-- progression ramenée à 0 si l'accès aux formations est coupé (pass retiré).
-- Ne renvoie QUE la progression de la personne connectée (auth.uid()) :
-- security definer sans paramètre utilisateur, donc rien à détourner.
create or replace function public.progression_formations()
 returns table(formation_id uuid, total integer, faits integer, progression numeric)
 language sql
 stable
 security definer
 set search_path to 'public'
as $function$
  with publies as (
    select m.formation_id, c.id as chapitre_id
    from public.formation_chapitres c
    join public.formation_modules m on m.id = c.module_id
    where c.status = 'published' and m.status = 'published'
  ),
  agg as (
    select p.formation_id, count(*) as total, count(cp.chapitre_id) as faits
    from publies p
    left join public.chapitre_progress cp on cp.chapitre_id = p.chapitre_id and cp.user_id = auth.uid()
    group by p.formation_id
  )
  select a.formation_id, a.total::int, a.faits::int,
         case when auth.uid() is null or public.acces_formations_coupe(auth.uid()) then 0
              when a.total = 0 then 0
              else round(a.faits::numeric / a.total * 100, 2) end
  from agg a
$function$;

revoke all on function public.progression_formations() from public, anon;
grant execute on function public.progression_formations() to authenticated;
