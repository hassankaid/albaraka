-- Normalisation des noms de pays dans profiles.country
--
-- Contexte : la colonne contenait un mix de formats (codes ISO "FR",
-- majuscules "FRANCE", "EGYPTE" sans accent, etc.) à cause d'un historique
-- d'écritures par différentes sources (form public, webhook Stripe, onboarding).
--
-- Après cette migration : tous les country existants sont au nom canonique
-- français Title Case avec accents (ex: "France", "Belgique", "Égypte",
-- "Maroc", "Algérie", "Tunisie", "Suisse").
--
-- Les futurs INSERT passent par stripe-webhook qui appelle désormais
-- normalizeCountryToFrName(), donc plus de divergence à l'avenir.
--
-- Idempotent : les UPDATE portent sur des valeurs déjà normalisées dans des
-- runs précédents → aucun effet (pas d'erreur).

UPDATE profiles SET country = 'France'    WHERE country IN ('FRANCE', 'France ', ' France', 'FR');
UPDATE profiles SET country = 'Belgique'  WHERE country IN ('BELGIQUE', 'Belgique ', 'BE');
UPDATE profiles SET country = 'Maroc'     WHERE country IN ('MAROC', 'MA');
UPDATE profiles SET country = 'Égypte'    WHERE country IN ('EGYPTE', 'Egypte', 'EG');
UPDATE profiles SET country = 'Algérie'   WHERE country IN ('ALGERIE', 'Algerie', 'DZ');
UPDATE profiles SET country = 'Tunisie'   WHERE country IN ('TUNISIE', 'TN');
UPDATE profiles SET country = 'Suisse'    WHERE country IN ('SUISSE', 'CH');
