-- ═══════════════════════════════════════════════════════════════════════════
-- Liens de paiement sur mesure (outil admin)
--
-- Généralisation du système rebill : le rebill est lié à une vente existante
-- (solde restant). Ici, le lien EST la commande — produit / montant /
-- échéancier libres, défini par le CEO à la création.
--
-- Cycle de vie : 'active' → 'paid' (au paiement réussi, le webhook crée la
-- vente + le plan et remplit sale_id) ou 'cancelled' (annulé par le CEO).
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE public.payment_links (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token               TEXT NOT NULL UNIQUE,              -- ALB-PL-XXXXXXXX
  -- Contenu de la commande (tout libre)
  product_label       TEXT NOT NULL,
  total_amount        NUMERIC NOT NULL CHECK (total_amount > 0),
  installments_count  INT NOT NULL DEFAULT 1 CHECK (installments_count BETWEEN 1 AND 24),
  deposit_amount      NUMERIC CHECK (deposit_amount IS NULL OR deposit_amount > 0),
  deferred_start_date DATE,                              -- 1er prélèvement différé (optionnel)
  -- Destinataire : pré-rempli (optionnel) ou générique (champs NULL → le client saisit)
  prefilled_contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  prefilled_full_name  TEXT,
  prefilled_email      TEXT,
  prefilled_phone      TEXT,
  -- Cycle de vie
  status              TEXT NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active', 'paid', 'cancelled')),
  sale_id             UUID REFERENCES public.sales(id) ON DELETE SET NULL,
  created_by          UUID REFERENCES public.profiles(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  paid_at             TIMESTAMPTZ,
  cancelled_at        TIMESTAMPTZ,
  notes               TEXT
);

CREATE INDEX idx_payment_links_token  ON public.payment_links (token);
CREATE INDEX idx_payment_links_status ON public.payment_links (status);

ALTER TABLE public.payment_links ENABLE ROW LEVEL SECURITY;

-- Le CEO gère tout (création, liste, annulation). La page client publique
-- passe par la RPC lookup_payment_link (SECURITY DEFINER), pas par un SELECT direct.
CREATE POLICY payment_links_ceo_all ON public.payment_links
  FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ceo'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ceo'));

-- ─── RPC : créer un lien de paiement sur mesure (CEO uniquement) ───
CREATE OR REPLACE FUNCTION public.create_payment_link(
  p_product_label       TEXT,
  p_total_amount        NUMERIC,
  p_installments_count  INT     DEFAULT 1,
  p_deposit_amount      NUMERIC DEFAULT NULL,
  p_deferred_start_date DATE    DEFAULT NULL,
  p_prefilled_full_name TEXT    DEFAULT NULL,
  p_prefilled_email     TEXT    DEFAULT NULL,
  p_prefilled_phone     TEXT    DEFAULT NULL,
  p_notes               TEXT    DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_role     TEXT;
  v_token    TEXT;
  v_attempts INT := 0;
  v_id       UUID;
BEGIN
  SELECT role INTO v_role FROM public.profiles WHERE id = auth.uid();
  IF v_role IS DISTINCT FROM 'ceo' THEN
    RAISE EXCEPTION 'forbidden_ceo_only';
  END IF;

  IF p_product_label IS NULL OR length(trim(p_product_label)) = 0 THEN
    RAISE EXCEPTION 'product_label_required';
  END IF;
  IF p_total_amount IS NULL OR p_total_amount <= 0 THEN
    RAISE EXCEPTION 'invalid_total_amount';
  END IF;
  IF p_installments_count IS NULL OR p_installments_count < 1 OR p_installments_count > 24 THEN
    RAISE EXCEPTION 'invalid_installments_count';
  END IF;
  -- L'acompte doit être strictement entre 0 et le total
  IF p_deposit_amount IS NOT NULL
     AND (p_deposit_amount <= 0 OR p_deposit_amount >= p_total_amount) THEN
    RAISE EXCEPTION 'invalid_deposit_amount';
  END IF;

  -- Token unique ALB-PL-XXXXXXXX (8 chars, sans 0/O/I/1)
  LOOP
    v_token := 'ALB-PL-' || (
      SELECT string_agg(
        substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', (floor(random() * 32) + 1)::int, 1),
        ''
      )
      FROM generate_series(1, 8)
    );
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.payment_links WHERE token = v_token);
    v_attempts := v_attempts + 1;
    IF v_attempts > 20 THEN
      RAISE EXCEPTION 'failed_to_generate_unique_token';
    END IF;
  END LOOP;

  INSERT INTO public.payment_links (
    token, product_label, total_amount, installments_count, deposit_amount,
    deferred_start_date, prefilled_full_name, prefilled_email, prefilled_phone,
    created_by, notes
  ) VALUES (
    v_token,
    trim(p_product_label),
    p_total_amount,
    p_installments_count,
    p_deposit_amount,
    p_deferred_start_date,
    nullif(trim(coalesce(p_prefilled_full_name, '')), ''),
    nullif(lower(trim(coalesce(p_prefilled_email, ''))), ''),
    nullif(trim(coalesce(p_prefilled_phone, '')), ''),
    auth.uid(),
    nullif(trim(coalesce(p_notes, '')), '')
  )
  RETURNING id INTO v_id;

  RETURN jsonb_build_object('id', v_id, 'token', v_token);
END;
$$;

-- ─── RPC : consulter un lien depuis la page client publique ───
CREATE OR REPLACE FUNCTION public.lookup_payment_link(p_token TEXT)
RETURNS TABLE(
  link_id             UUID,
  product_label       TEXT,
  total_amount        NUMERIC,
  installments_count  INT,
  deposit_amount      NUMERIC,
  deferred_start_date DATE,
  prefilled_full_name TEXT,
  prefilled_email     TEXT,
  prefilled_phone     TEXT,
  is_valid            BOOLEAN,
  reason              TEXT
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_normalized TEXT;
  v_rec        public.payment_links%ROWTYPE;
BEGIN
  v_normalized := upper(trim(coalesce(p_token, '')));
  IF v_normalized = '' THEN
    RETURN QUERY SELECT NULL::UUID, NULL::TEXT, 0::NUMERIC, 0, NULL::NUMERIC, NULL::DATE,
      NULL::TEXT, NULL::TEXT, NULL::TEXT, FALSE, 'token_required'::TEXT;
    RETURN;
  END IF;

  SELECT * INTO v_rec FROM public.payment_links WHERE token = v_normalized;

  IF v_rec.id IS NULL THEN
    RETURN QUERY SELECT NULL::UUID, NULL::TEXT, 0::NUMERIC, 0, NULL::NUMERIC, NULL::DATE,
      NULL::TEXT, NULL::TEXT, NULL::TEXT, FALSE, 'not_found'::TEXT;
    RETURN;
  END IF;

  IF v_rec.status = 'cancelled' THEN
    RETURN QUERY SELECT v_rec.id, v_rec.product_label, v_rec.total_amount,
      v_rec.installments_count, v_rec.deposit_amount, v_rec.deferred_start_date,
      NULL::TEXT, NULL::TEXT, NULL::TEXT, FALSE, 'cancelled'::TEXT;
    RETURN;
  END IF;

  IF v_rec.status = 'paid' THEN
    RETURN QUERY SELECT v_rec.id, v_rec.product_label, v_rec.total_amount,
      v_rec.installments_count, v_rec.deposit_amount, v_rec.deferred_start_date,
      NULL::TEXT, NULL::TEXT, NULL::TEXT, FALSE, 'already_paid'::TEXT;
    RETURN;
  END IF;

  RETURN QUERY SELECT
    v_rec.id, v_rec.product_label, v_rec.total_amount, v_rec.installments_count,
    v_rec.deposit_amount, v_rec.deferred_start_date,
    v_rec.prefilled_full_name, v_rec.prefilled_email, v_rec.prefilled_phone,
    TRUE, NULL::TEXT;
END;
$$;
