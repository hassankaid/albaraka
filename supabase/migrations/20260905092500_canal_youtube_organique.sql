-- ═══════════════════════════════════════════════════════════════════════
-- YouTube organique devient une origine de trafic à part entière, au même
-- titre qu'Instagram et TikTok, sur les deux tunnels (WhatsApp et VSL).
--
-- Deux verrous à lever, et ils sont indissociables de la page de livraison :
--
--   1. `leads_source_check` n'accepte pas `webi_*_youtube_organic`. Sans cette
--      migration, `tunnel-lead-submit` — qui recopie cette liste blanche —
--      rétrograde la source en `webi_*_direct`. Le lead n'est pas perdu, mais
--      son origine l'est, et YouTube gonflerait silencieusement « Accès direct ».
--
--   2. `marketing_canal` ne sait pas classer ces sources : elles tomberaient
--      dans « autre », donc hors du classement des canaux du dashboard.
--
-- `marketing_tunnel` n'a rien à apprendre : il se base sur le préfixe
-- `webi_wa` / `webi_vsl`, que ces nouvelles sources portent déjà.
--
-- Migration strictement additive : aucune valeur retirée, aucune ligne réécrite.
-- ═══════════════════════════════════════════════════════════════════════

alter table public.leads drop constraint if exists leads_source_check;

alter table public.leads add constraint leads_source_check check (
  source = any (array[
    -- Historique Systeme.io + saisie manuelle
    'vsl_a','vsl_b','webi','instagram_ads','whatsapp_ads','instagram_organic',
    'meta_ads','autre',
    -- Apporteurs
    'apporteur_facebook','apporteur_whatsapp','apporteur_instagram',
    'apporteur_linkedin','apporteur_recommandation','apporteur_telegram',
    'apporteur_tiktok','apporteur_autre','apporteur_quiz',
    -- Tunnel WhatsApp
    'webi_wa_ads','webi_wa_instagram_organic','webi_wa_tiktok_organic',
    'webi_wa_youtube_organic','webi_wa_direct',
    -- Tunnel VSL
    'webi_vsl_ads','webi_vsl_instagram_organic','webi_vsl_tiktok_organic',
    'webi_vsl_youtube_organic','webi_vsl_direct'
  ])
);

create or replace function public.marketing_canal(p_source text, p_utm_source text)
returns text language sql immutable as $function$
  select case
    when p_source is null                              then 'autre'
    when p_source = 'apporteur_quiz'                   then 'tunnel_quiz_apporteurs'
    when p_source like 'apporteur%'                    then 'apporteur'
    when p_source like '%\_ads'                        then 'meta_ads'
    when p_source like '%instagram_organic'            then 'instagram_organic'
    when p_source like '%tiktok_organic'               then 'tiktok_organic'
    when p_source like '%youtube_organic'              then 'youtube_organic'
    when p_source like '%\_direct'                     then 'direct'
    when lower(coalesce(p_utm_source,'')) in ('fb','facebook','ig','instagram') then 'meta_ads'
    when p_source in ('vsl_a','vsl_b','webi')          then 'meta_ads'
    else 'autre'
  end;
$function$;
