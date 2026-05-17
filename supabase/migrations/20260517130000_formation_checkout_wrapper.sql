-- Sprint F2 — Mecanisme wrapper pour le checkout formations a la carte.
--
-- Strategie : au lieu de construire un checkout dedie (gros refactor edge
-- function + page + webhook handler), on REUTILISE l'infra `/pay/<token>`
-- existante. Une page wrapper /checkout/formation/:slug appelle une RPC
-- publique qui CREE un payment_link a la volee (auto_generated=true) avec
-- les grants_* qui pointent vers la formation, puis redirige sur le
-- /pay/<token>. Le webhook existant (ensureCustomLinkOrder) sera etendu
-- en F3 pour creer le formation_enrollment apres la vente.
--
-- Cette migration ajoute aussi les colonnes grants_* pour Sprint H (liens
-- personnalises avec perimetre d'acces multi-select).

-- ── 1) Colonnes grants_* sur payment_links ──────────────────────────────
-- grants_offer_id : pour les liens qui ouvrent un Pass (AL BARAKA / Liberty)
--   en attribuant l'acces au parcours associe via la table offers.
-- grants_formation_ids : liste de formations a la carte a debloquer
--   directement (peut etre combinee avec grants_offer_id, ex : pass +
--   formation supplementaire).
ALTER TABLE public.payment_links
  ADD COLUMN IF NOT EXISTS grants_offer_id UUID NULL REFERENCES public.offers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS grants_formation_ids UUID[] NULL,
  ADD COLUMN IF NOT EXISTS auto_generated BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.payment_links.grants_offer_id IS
  'Si non NULL, le paiement de ce lien ouvre l''acces au Pass correspondant (AL BARAKA / Liberty / autre offre catalogue).';
COMMENT ON COLUMN public.payment_links.grants_formation_ids IS
  'Liste optionnelle de formation_id a debloquer directement (formations a la carte). Peut etre combine avec grants_offer_id.';
COMMENT ON COLUMN public.payment_links.auto_generated IS
  'TRUE pour les liens crees automatiquement (ex : checkout formation a la carte qui cree un lien jetable). Filtres de la liste admin CustomLinksTab.';

-- Index sur auto_generated pour filtrer rapidement (la liste admin n'affiche
-- que auto_generated=false).
CREATE INDEX IF NOT EXISTS payment_links_admin_view_idx
  ON public.payment_links (created_at DESC)
  WHERE auto_generated = false;

-- ── 2) RPC publique : creer un payment_link pour une formation a la carte ──
-- Appelable par un utilisateur non-authentifie depuis FormationCheckout.tsx.
-- Securite : verifie que l'offre existe, est de categorie 'a_la_carte', est
-- en status 'active', a une formation_id. Sinon retourne une erreur claire.
--
-- Params :
--   p_offer_slug    TEXT       slug de l'offre (ex : 'copywriting')
--   p_deferred_start DATE NULL  si non NULL, date de demarrage differe
--   p_prefill_email  TEXT NULL  optionnel : pre-remplir destinataire (admin)
--
-- Retourne JSONB :
--   { token: 'ALB-PL-XXXXXXXX', total_amount: 500, product_label: '...' }
--   ou { error: 'reason' }
CREATE OR REPLACE FUNCTION public.create_formation_payment_link(
  p_offer_slug TEXT,
  p_deferred_start DATE DEFAULT NULL,
  p_prefill_email TEXT DEFAULT NULL,
  p_prefill_full_name TEXT DEFAULT NULL,
  p_prefill_phone TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $func$
DECLARE
  v_offer RECORD;
  v_token TEXT;
  v_link_id UUID;
  v_attempts INT := 0;
BEGIN
  -- ── Validation de l'offre ──
  SELECT id, label, default_price_ht, formation_id, status, category
  INTO v_offer
  FROM public.offers
  WHERE slug = p_offer_slug
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'offer_not_found', 'slug', p_offer_slug);
  END IF;
  IF v_offer.category <> 'a_la_carte' THEN
    RETURN jsonb_build_object('error', 'offer_not_a_la_carte', 'category', v_offer.category);
  END IF;
  IF v_offer.status <> 'active' THEN
    RETURN jsonb_build_object('error', 'offer_not_active', 'status', v_offer.status);
  END IF;
  IF v_offer.formation_id IS NULL THEN
    RETURN jsonb_build_object('error', 'offer_no_formation_link', 'offer_id', v_offer.id);
  END IF;

  -- ── Validation deferred_start (doit etre dans le futur si fourni) ──
  IF p_deferred_start IS NOT NULL AND p_deferred_start <= CURRENT_DATE THEN
    RETURN jsonb_build_object('error', 'deferred_start_must_be_future');
  END IF;

  -- ── Generation du token : ALB-PL-XXXXXXXX (8 chars alphanum) ──
  -- Boucle de retry au cas (extremement improbable) ou collision.
  LOOP
    v_attempts := v_attempts + 1;
    v_token := 'ALB-PL-' || UPPER(SUBSTRING(REPLACE(gen_random_uuid()::TEXT, '-', ''), 1, 8));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.payment_links WHERE token = v_token);
    IF v_attempts > 5 THEN
      RAISE EXCEPTION 'token_generation_failed';
    END IF;
  END LOOP;

  -- ── Creation du lien (auto_generated=true → invisible dans CustomLinksTab) ──
  INSERT INTO public.payment_links (
    token,
    product_label,
    total_amount,
    installments_count,
    deferred_start_date,
    prefilled_full_name,
    prefilled_email,
    prefilled_phone,
    status,
    auto_generated,
    grants_formation_ids,
    notes
  )
  VALUES (
    v_token,
    v_offer.label,
    v_offer.default_price_ht,
    1,
    p_deferred_start,
    NULLIF(TRIM(COALESCE(p_prefill_full_name, '')), ''),
    NULLIF(TRIM(LOWER(COALESCE(p_prefill_email, ''))), ''),
    NULLIF(TRIM(COALESCE(p_prefill_phone, '')), ''),
    'active',
    TRUE,
    ARRAY[v_offer.formation_id]::UUID[],
    'Lien auto-genere depuis /checkout/formation/' || p_offer_slug
  )
  RETURNING id INTO v_link_id;

  RETURN jsonb_build_object(
    'success', TRUE,
    'token', v_token,
    'link_id', v_link_id,
    'product_label', v_offer.label,
    'total_amount', v_offer.default_price_ht
  );
END;
$func$;

GRANT EXECUTE ON FUNCTION public.create_formation_payment_link(TEXT, DATE, TEXT, TEXT, TEXT)
  TO anon, authenticated;

COMMENT ON FUNCTION public.create_formation_payment_link IS
  'Cree a la volee un payment_link auto-genere pour le checkout d''une formation a la carte. Appele depuis FormationCheckout.tsx qui redirige ensuite vers /pay/<token>.';
