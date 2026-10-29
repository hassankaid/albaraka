-- Studio : version gratuite plus légère (décision de Sidali du 29/10/2026, après l'analyse
-- des coûts du 20/10). Une vidéo d'élève coûte ~0,10 $ d'IA et autant de machine ; les
-- vidéos longues coûtent 3 à 6 fois plus, et le rendu Hyperframes prend ~4,5 fois plus de
-- calcul que le motion design classique.
--   • gratuit : 1 minute de vidéo au plus, motion design léger (moteur classique) ;
--   • abonné (et CEO) : 5 min en face caméra, 3 min en voix off, motion design complet.
-- La formule est donnée par studio_quota ; la machine la reçoit au lancement.

insert into public.studio_config (cle, valeur) values ('duree_max_gratuit', '60')
on conflict (cle) do nothing;

create or replace function public.studio_quota(p_user_id uuid)
 returns jsonb
 language sql
 stable security definer
 set search_path to 'public'
as $function$
  with lim as (
    select case
             when public.is_ceo(p_user_id) then null
             when public.studio_est_abonne(p_user_id) then (public.studio_config_valeur('quota_abonne') #>> '{}')::int
             else (public.studio_config_valeur('quota_gratuit') #>> '{}')::int
           end as limite,
           public.is_ceo(p_user_id) or public.studio_est_abonne(p_user_id) as complet
  ), util as (
    select count(*)::int as n from public.studio_montages
     where user_id = p_user_id and compte_le is not null
       and (compte_le at time zone 'Europe/Paris')::date = (now() at time zone 'Europe/Paris')::date
  )
  select jsonb_build_object(
    'ouvert', public.studio_ouvert(p_user_id),
    'abonne', public.studio_est_abonne(p_user_id),
    'limite', lim.limite,
    'utilisees', util.n,
    'restantes', case when lim.limite is null then null else greatest(lim.limite - util.n, 0) end,
    'formule', case when lim.complet then 'complet' else 'gratuit' end,
    -- null : les durées habituelles (5 min face caméra, 3 min voix off)
    'duree_max_s', case when lim.complet then null else (public.studio_config_valeur('duree_max_gratuit') #>> '{}')::int end)
  from lim, util;
$function$;

-- Une vidéo refusée par la machine parce qu'elle dépasse la durée gratuite ne compte pas
-- dans le quota du jour : l'élève peut en importer une plus courte aussitôt.
create or replace function public.studio_job_erreur(p_id uuid, p_jeton text, p_message text)
 returns void
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  m studio_montages;
begin
  m := _studio_job(p_id, p_jeton);
  update studio_montages
     set statut = 'erreur', erreur = left(p_message, 1000), lance = false, jeton_hash = null, updated_at = now(),
         compte_le = case when p_message like 'La version gratuite%' then null else compte_le end
   where id = p_id;
  insert into notifications (user_id, type, title, body, link, metadata)
  values (m.user_id, 'studio_erreur', 'Le montage n''a pas abouti', left(p_message, 300),
          '/studio/montage/' || p_id, jsonb_build_object('montage_id', p_id));
end $function$;
