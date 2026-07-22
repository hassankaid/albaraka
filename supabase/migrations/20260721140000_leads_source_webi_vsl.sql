-- Tunnel VSL natif : ajoute les libellés de source `webi_vsl_*` à leads_source_check.
-- Changement 100% ADDITIF (les valeurs existantes, dont webi_wa_*, restent autorisées).
ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_source_check;

ALTER TABLE public.leads ADD CONSTRAINT leads_source_check CHECK (
  source = ANY (ARRAY[
    'vsl_a','vsl_b','webi','instagram_ads','whatsapp_ads','instagram_organic','meta_ads',
    'apporteur_facebook','apporteur_whatsapp','apporteur_instagram','apporteur_linkedin',
    'apporteur_recommandation','apporteur_telegram','apporteur_tiktok','apporteur_autre',
    'apporteur_quiz','autre',
    -- Tunnel WhatsApp :
    'webi_wa_ads','webi_wa_instagram_organic','webi_wa_tiktok_organic','webi_wa_direct',
    -- Tunnel VSL :
    'webi_vsl_ads','webi_vsl_instagram_organic','webi_vsl_tiktok_organic','webi_vsl_direct'
  ]::text[])
);
