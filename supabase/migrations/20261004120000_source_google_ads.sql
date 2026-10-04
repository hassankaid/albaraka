-- ─────────────────────────────────────────────────────────────────────────
-- Source Google Ads (demande de Hassan le 04/10/2026).
--
-- Le media buyer a ajouté Google Ads dans GTM (conversions inscription et
-- rendez-vous). Sans source dédiée, un lead venu d'une pub Google tombait en
-- « Direct » (lien sans ?src=) ou en « Meta Ads » (lien ?src=ads recopié) :
-- son coût réel devenait incalculable.
--
-- Nouveau lien d'entrée (tunnels WhatsApp, VSL et Liberty, sur les deux
-- domaines des tunnels) :
--   ?src=google_ads  → <tunnel>_google_ads
--
-- ⚠️ ORDRE DANS marketing_canal : la ligne Google passe AVANT le test
-- générique « se termine par _ads », qui la rangerait en Meta Ads.
-- Reprend à l'identique la migration du 30/09 (vérifiée égale à la prod le
-- 04/10) et n'y ajoute que Google.
-- ─────────────────────────────────────────────────────────────────────────

alter table public.leads drop constraint if exists leads_source_check;

alter table public.leads add constraint leads_source_check check (
  source = any (array[
    -- Origines historiques
    'vsl_a', 'vsl_b', 'webi',
    'instagram_ads', 'whatsapp_ads', 'instagram_organic', 'meta_ads', 'autre',
    -- Apporteurs
    'apporteur_facebook', 'apporteur_whatsapp', 'apporteur_instagram',
    'apporteur_linkedin', 'apporteur_recommandation', 'apporteur_telegram',
    'apporteur_tiktok', 'apporteur_autre', 'apporteur_quiz',
    -- Tunnel WhatsApp
    'webi_wa_ads', 'webi_wa_instagram_organic', 'webi_wa_tiktok_organic',
    'webi_wa_youtube_organic', 'webi_wa_direct',
    'webi_wa_tiktok_ads', 'webi_wa_snap_ads', 'webi_wa_google_ads',
    -- Tunnel VSL
    'webi_vsl_ads', 'webi_vsl_instagram_organic', 'webi_vsl_tiktok_organic',
    'webi_vsl_youtube_organic', 'webi_vsl_direct',
    'webi_vsl_tiktok_ads', 'webi_vsl_snap_ads', 'webi_vsl_google_ads',
    -- Tunnel Liberty
    'liberty_ads', 'liberty_instagram_organic', 'liberty_tiktok_organic',
    'liberty_youtube_organic', 'liberty_direct',
    'liberty_tiktok_ads', 'liberty_snap_ads', 'liberty_google_ads',
    -- Site vitrine (28/09/2026)
    'site_vitrine'
  ])
);

create or replace function public.marketing_canal(p_source text, p_utm_source text)
returns text
language sql
immutable
as $function$
  select case
    when p_source is null                              then 'autre'
    when p_source = 'apporteur_quiz'                   then 'tunnel_quiz_apporteurs'
    when p_source like 'apporteur%'                    then 'apporteur'
    -- Organique par nature : AVANT le test sur utm_source, qui le rangerait
    -- en Meta Ads au premier lien Instagram tagué.
    when p_source = 'site_vitrine'                     then 'site_vitrine_organic'
    -- TikTok Ads et Snap Ads (30/09/2026) : AVANT « _ads », sinon Meta Ads.
    when p_source like '%\_tiktok\_ads'                then 'tiktok_ads'
    when p_source like '%\_snap\_ads'                  then 'snap_ads'
    -- Google Ads (04/10/2026) : AVANT « _ads » lui aussi.
    when p_source like '%\_google\_ads'                then 'google_ads'
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
