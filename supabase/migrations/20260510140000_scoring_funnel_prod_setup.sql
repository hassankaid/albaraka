-- 1) Ajout de la colonne de mapping côté Systemio.
-- Le matching se fait sur l'URL exacte de la page de capture (data.source_url
-- du payload Systemio). Plus robuste que de stocker juste l'ID Systemio :
-- 2 funnels peuvent partager le même funnel.id mais avoir des squeeze pages
-- distinctes (cas WEBINAIRE ethicarena × WEBINAIRE ethicarena organique).
ALTER TABLE quiz_funnel_configs
  ADD COLUMN IF NOT EXISTS systemio_capture_url TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS quiz_funnel_configs_capture_url_idx
  ON quiz_funnel_configs (systemio_capture_url)
  WHERE systemio_capture_url IS NOT NULL;

-- 2) Désactivation du funnel test (deencode.systeme.io). On le garde en BDD
-- pour ne pas casser les anciennes responses/tokens, mais active=false →
-- match-scoring-token le rejettera désormais.
UPDATE quiz_funnel_configs
SET active = false
WHERE slug = 'webi-al-baraka-test';

-- 3) Insertion des 5 funnels prod.
INSERT INTO quiz_funnel_configs (slug, name, thank_you_url, systemio_capture_url, active)
VALUES
  (
    'webi-al-baraka-sabrina',
    'WEBINAIRE SABRINA — Al Baraka',
    'https://go.albarakaecosysteme.com/remerciement-inscription-webi-al-baraka-sabrina',
    'https://go.albarakaecosysteme.com/inscription-webinaire-al-baraka-sabrina',
    true
  ),
  (
    'webi-al-baraka-hedi',
    'WEBINAIRE HEDI — Al Baraka',
    'https://go.albarakaecosysteme.com/remerciement-inscription-webi-al-baraka-hedi',
    'https://go.albarakaecosysteme.com/inscription-webinaire-al-baraka-hedi',
    true
  ),
  (
    'webi-al-baraka',
    'WEBINAIRE Al Baraka',
    'https://go.albarakaecosysteme.com/remerciement-inscription-webi-al-baraka',
    'https://go.albarakaecosysteme.com/inscription-webinaire-al-baraka',
    true
  ),
  (
    'webi-ethicarena',
    'WEBINAIRE Ethicarena',
    'https://www.ethicarena.com/remerciement-inscription-webi',
    'https://www.ethicarena.com/inscription-webinaire',
    true
  ),
  (
    'webi-ethicarena-organique',
    'WEBINAIRE Ethicarena (organique)',
    'https://www.ethicarena.com/remerciement-inscription-webi',
    'https://www.ethicarena.com/inscription-webinaire-organique',
    true
  )
ON CONFLICT (slug) DO UPDATE
  SET name = EXCLUDED.name,
      thank_you_url = EXCLUDED.thank_you_url,
      systemio_capture_url = EXCLUDED.systemio_capture_url,
      active = EXCLUDED.active;

-- Cleanup : suppression des données de test (tokens + scoring responses
-- liés au funnel test). On garde la config (active=false) pour éviter de
-- casser la chaîne FK si un jour on veut consulter les anciennes responses.
DELETE FROM lead_scoring_responses WHERE funnel_slug = 'webi-al-baraka-test';
DELETE FROM pending_scoring_tokens WHERE funnel_slug = 'webi-al-baraka-test';
