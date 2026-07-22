-- Tunnel WhatsApp natif (remplace Systeme.io comme source de leads).
-- Élargit leads_source_check pour autoriser les libellés de source du tunnel WA.
-- Changement 100% ADDITIF : toutes les valeurs existantes restent autorisées,
-- on ajoute seulement les 4 valeurs webi_wa_*. Aucune ligne existante impactée.
ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_source_check;

ALTER TABLE public.leads ADD CONSTRAINT leads_source_check CHECK (
  source = ANY (ARRAY[
    'vsl_a','vsl_b','webi','instagram_ads','whatsapp_ads','instagram_organic','meta_ads',
    'apporteur_facebook','apporteur_whatsapp','apporteur_instagram','apporteur_linkedin',
    'apporteur_recommandation','apporteur_telegram','apporteur_tiktok','apporteur_autre',
    'apporteur_quiz','autre',
    -- Tunnel WhatsApp (webinaire) :
    'webi_wa_ads','webi_wa_instagram_organic','webi_wa_tiktok_organic','webi_wa_direct'
  ]::text[])
);
