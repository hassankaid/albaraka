-- ═══════════════════════════════════════════════════════════════════════════
-- Phase 1 — Génération automatique de contrats PDF signés (Sidali, 19/05/2026)
--
-- Ce premier patch met en place les fondations BDD/Storage AVANT toute UI :
--   1. Nouvelle table `client_contracts` (1 ligne par vente bon_commande/pass_liberty)
--   2. RPC séquentielle `next_contract_number(p_year, p_month)` → "CTR-YYYY-MM-NNNN"
--   3. Bucket Storage privé `contracts` + RLS storage policies
--   4. Flag `coupons.is_conference` + marquage AB1000 / AB500 / LIBERTY1000
--
-- Cette migration ne génère AUCUN contrat (les ventes existantes ne sont pas
-- rétrofittées, décision validée Hassan 19/05). Elle est purement structurelle.
--
-- Workflow d'écriture (phase 5 ultérieure) :
--   - `stripe-webhook` → INSERT ligne `client_contracts` avec snapshot données
--   - Front (page /contract/:id) → render PDF avec @react-pdf/renderer côté
--     navigateur, signature via canvas, upload du PDF signé via une edge
--     function `upload-signed-contract` qui met à jour la ligne.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── 1. Table client_contracts ────────────────────────────────────────────
CREATE TABLE public.client_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_number text UNIQUE NOT NULL,

  -- Liens vers les tables existantes (1 contrat = 1 vente)
  sale_id uuid NOT NULL UNIQUE REFERENCES public.sales(id) ON DELETE RESTRICT,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  buyer_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,

  -- Template à rendre (4 variantes)
  template_key text NOT NULL CHECK (template_key IN (
    'pass_standard',       -- Pass AL BARAKA 3000€ (pas de coupon conférence)
    'pass_conference',     -- Pass AL BARAKA 2000€ (avec AB1000 par ex.)
    'liberty_standard',    -- Liberty 5000€
    'liberty_conference'   -- Liberty 4000€ (avec LIBERTY1000)
  )),

  -- ─── Snapshot données client (figées au moment de la vente) ────────────
  -- On stocke en clair pour que le PDF puisse être régénéré sans dépendre
  -- des modifications ultérieures du profil (RGPD : minimisation par snapshot).
  client_first_name text NOT NULL,
  client_last_name text NOT NULL,
  client_email text NOT NULL,
  client_phone text NOT NULL,
  client_address text NOT NULL,
  client_postal_code text NOT NULL,
  client_city text NOT NULL,
  client_country text NOT NULL,

  -- ─── Snapshot vente (figées) ───────────────────────────────────────────
  amount_total numeric(10,2) NOT NULL,         -- net à payer (2000 si conf, 3000 sinon, etc.)
  amount_original numeric(10,2) NOT NULL,      -- prix barré affiché (3000 ou 5000)
  discount_amount numeric(10,2) NOT NULL DEFAULT 0,
  coupon_code text,
  payment_modality text NOT NULL,              -- ex: "Comptant" ou "5 × 600,00 €"
  installments_count int NOT NULL DEFAULT 1 CHECK (installments_count >= 1),
  first_payment_date date NOT NULL,

  -- ─── Snapshot des 5 engagements cochés AVANT paiement ─────────────────
  -- Format type : [
  --   { id: "knew_formula", text: "J'ai bien pris connaissance...", checked: true, checked_at: "2026-05-19T15:23:00Z" },
  --   ...
  -- ]
  -- 5 items attendus. On ne pose pas de CHECK sur la longueur car le format
  -- peut évoluer ; la validation se fait côté backend avant insertion.
  agreements_snapshot jsonb NOT NULL DEFAULT '[]'::jsonb,

  -- ─── Status workflow ───────────────────────────────────────────────────
  status text NOT NULL DEFAULT 'pending_signature' CHECK (status IN (
    'pending_signature',  -- contrat généré, attente de signature
    'signed',             -- signé par le client
    'voided'              -- annulé (refund, litige, etc.)
  )),

  -- ─── Stockage PDF (bucket `contracts` créé plus bas) ──────────────────
  unsigned_pdf_path text,        -- {sale_id}/{contract_number}_unsigned.pdf
  signed_pdf_path text,          -- {sale_id}/{contract_number}_signed.pdf
  signature_png_path text,       -- {sale_id}/signature_{contract_number}.png

  -- ─── Preuves de signature (valeur probatoire) ──────────────────────────
  signed_at timestamptz,
  signature_ip text,
  signature_user_agent text,

  -- ─── Tracking email ────────────────────────────────────────────────────
  email_sent_at timestamptz,
  email_sent_to text,

  -- ─── Retry / debug ─────────────────────────────────────────────────────
  last_error text,
  last_attempt_at timestamptz,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.client_contracts IS
  'Contrats clients générés post-paiement (Sidali 19/05/2026). 1 ligne par vente bon_commande / pass_liberty. Snapshot complet pour traçabilité juridique.';

-- ─── Index pour les requêtes courantes ────────────────────────────────────
CREATE INDEX client_contracts_buyer_idx ON public.client_contracts(buyer_profile_id) WHERE buyer_profile_id IS NOT NULL;
CREATE INDEX client_contracts_status_idx ON public.client_contracts(status);
CREATE INDEX client_contracts_signed_at_idx ON public.client_contracts(signed_at) WHERE signed_at IS NOT NULL;

-- ─── Trigger updated_at ───────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.tg_client_contracts_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_client_contracts_updated_at
BEFORE UPDATE ON public.client_contracts
FOR EACH ROW EXECUTE FUNCTION public.tg_client_contracts_updated_at();

-- ─── RLS policies ─────────────────────────────────────────────────────────
ALTER TABLE public.client_contracts ENABLE ROW LEVEL SECURITY;

-- SELECT : le propriétaire (acheteur) OU le CEO
CREATE POLICY client_contracts_select_owner_or_ceo
ON public.client_contracts FOR SELECT
USING (
  buyer_profile_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'ceo'
  )
);

-- INSERT : service_role uniquement (passe par le webhook stripe-webhook)
-- Pas de policy = bloqué pour les rôles authenticated. Service_role bypass RLS.

-- UPDATE : CEO uniquement (les updates de signature passent par une edge
-- function service_role qui s'occupe de vérifier l'owner avant d'écrire).
CREATE POLICY client_contracts_update_ceo
ON public.client_contracts FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'ceo'
  )
);

-- DELETE : interdit (jamais supprimer un contrat, on bascule en status='voided')

-- ─── 2. RPC next_contract_number ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.next_contract_number(p_year integer, p_month integer)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_prefix text;
  v_seq int;
  v_number text;
BEGIN
  v_prefix := 'CTR-' || p_year::text || '-' || lpad(p_month::text, 2, '0');

  SELECT COUNT(*) + 1 INTO v_seq
  FROM client_contracts
  WHERE contract_number LIKE v_prefix || '-%';

  v_number := v_prefix || '-' || lpad(v_seq::text, 4, '0');

  -- Race condition extrême : itère jusqu'à trouver un slot libre
  WHILE EXISTS (SELECT 1 FROM client_contracts WHERE contract_number = v_number) LOOP
    v_seq := v_seq + 1;
    v_number := v_prefix || '-' || lpad(v_seq::text, 4, '0');
  END LOOP;

  RETURN v_number;
END;
$$;

COMMENT ON FUNCTION public.next_contract_number IS
  'Génère un numéro de contrat séquentiel mensuel au format CTR-YYYY-MM-NNNN. Modèle : next_client_invoice_number.';

-- ─── 3. Bucket Storage "contracts" + policies ─────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('contracts', 'contracts', false, 10485760, ARRAY['application/pdf', 'image/png'])
ON CONFLICT (id) DO NOTHING;

-- Layout cible : contracts/{sale_id}/{contract_number}_signed.pdf
--                contracts/{sale_id}/{contract_number}_unsigned.pdf
--                contracts/{sale_id}/signature_{contract_number}.png
--
-- SELECT : le propriétaire (buyer_profile_id de la sale) OU le CEO
CREATE POLICY contracts_storage_select_owner_or_ceo
ON storage.objects FOR SELECT
USING (
  bucket_id = 'contracts'
  AND (
    -- CEO : tout voir
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'ceo'
    )
    -- Propriétaire : path commence par un sale_id qui appartient à l'utilisateur
    OR EXISTS (
      SELECT 1
      FROM public.client_contracts cc
      WHERE (storage.foldername(name))[1] = cc.sale_id::text
        AND cc.buyer_profile_id = auth.uid()
    )
  )
);

-- INSERT / UPDATE / DELETE : service_role uniquement (pas de policy)

-- ─── 4. Flag is_conference sur coupons ────────────────────────────────────
ALTER TABLE public.coupons
ADD COLUMN IF NOT EXISTS is_conference boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.coupons.is_conference IS
  'true si le coupon correspond à une réduction issue d''une conférence (impacte le template de contrat : pass_conference / liberty_conference au lieu de _standard).';

-- Marque les 3 coupons existants comme "conférence"
UPDATE public.coupons
SET is_conference = true
WHERE code IN ('AB1000', 'AB500', 'LIBERTY1000');
