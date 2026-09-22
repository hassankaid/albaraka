-- Origines du tunnel Liberty.
--
-- `leads.source` est verrouillé par une liste blanche. Sans ces cinq valeurs,
-- un inscrit du tunnel Liberty serait refusé par la contrainte — et comme le
-- filet de `tunnel-lead-submit` est SILENCIEUX, il retomberait en réalité sur
-- `webi_wa_direct` : un lead Liberty compté comme un inscrit à la conférence
-- venu en direct. Deux tunnels mélangés dans les statistiques, sans erreur
-- visible nulle part.
--
-- Purement additif : aucune ligne existante ne change, et les valeurs déjà
-- autorisées sont reprises telles quelles.
--
-- Les trois endroits vont ensemble : cette contrainte, `ALLOWED_SOURCES` dans
-- `supabase/functions/tunnel-lead-submit/index.ts`, et `marketing_canal` —
-- cette dernière classe déjà par motif (`%_ads`, `%_direct`…), donc
-- `liberty_ads` tombe dans `meta_ads` et `liberty_direct` dans `direct` sans
-- rien y changer.
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
    -- Tunnel VSL
    'webi_vsl_ads', 'webi_vsl_instagram_organic', 'webi_vsl_tiktok_organic',
    'webi_vsl_youtube_organic', 'webi_vsl_direct',
    -- Tunnel Liberty
    'liberty_ads', 'liberty_instagram_organic', 'liberty_tiktok_organic',
    'liberty_youtube_organic', 'liberty_direct'
  ])
);
