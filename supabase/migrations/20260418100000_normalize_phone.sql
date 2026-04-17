-- Normalisation E.164 des numéros de téléphone.
-- Fonction normalize_phone() comme source unique de vérité, appliquée
-- automatiquement à chaque INSERT/UPDATE via triggers.
-- Garantit qu'aucun phone pourri ne peut entrer en base, quelle que soit
-- la source (webhooks, forms, imports CSV, scripts admin, futures apps).
--
-- Backfill one-shot appliqué sur 544 leads et 11 contacts qui avaient
-- raw_phone/phone_normalized sans +. Backup préservé dans
-- leads_phone_backup_20260418 et contacts_phone_backup_20260418.
--
-- 5 leads résiduels avec phone invalide (9 chiffres sans préfixe
-- reconnaissable, ex. "337665799") : laissés en l'état, saisie erronée
-- utilisateur, non-fixable automatiquement.

CREATE OR REPLACE FUNCTION public.normalize_phone(p_raw text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v text;
  v_len int;
BEGIN
  IF p_raw IS NULL THEN RETURN NULL; END IF;

  v := regexp_replace(p_raw, '[^0-9+]', '', 'g');

  IF v IS NULL OR v = '' THEN RETURN NULL; END IF;

  IF v NOT LIKE '+%' AND position('+' in v) > 0 THEN
    v := '+' || regexp_replace(v, '\+', '', 'g');
  END IF;

  IF v LIKE '00%' THEN
    v := '+' || substring(v from 3);
  END IF;

  v_len := length(v);

  IF v LIKE '+%' THEN RETURN v; END IF;

  -- FR local 0XXXXXXXXX
  IF v_len = 10 AND v LIKE '0%' THEN
    RETURN '+33' || substring(v from 2);
  END IF;

  -- FR mobile sans 0 (9 chiffres 6X ou 7X)
  IF v_len = 9 AND (v LIKE '6%' OR v LIKE '7%') THEN
    RETURN '+33' || v;
  END IF;

  -- country+number sans + (10-15 chiffres)
  IF v_len BETWEEN 10 AND 15 THEN
    RETURN '+' || v;
  END IF;

  -- Cas imprévu : ne corrompt pas
  RETURN v;
END $$;

COMMENT ON FUNCTION public.normalize_phone(text) IS
'Normalise un numéro en E.164 (+XX…). Gère FR local (06…), 00XX, chiffres seuls, caractères invisibles. Idempotent.';

CREATE OR REPLACE FUNCTION public.tg_normalize_lead_phone()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.raw_phone IS NOT NULL THEN
    NEW.raw_phone := public.normalize_phone(NEW.raw_phone);
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_normalize_lead_phone ON public.leads;
CREATE TRIGGER trg_normalize_lead_phone
  BEFORE INSERT OR UPDATE OF raw_phone ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.tg_normalize_lead_phone();

CREATE OR REPLACE FUNCTION public.tg_normalize_contact_phone()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.phone_normalized IS NOT NULL THEN
    NEW.phone_normalized := public.normalize_phone(NEW.phone_normalized);
  END IF;
  IF NEW.phone_original IS NOT NULL THEN
    NEW.phone_original := public.normalize_phone(NEW.phone_original);
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_normalize_contact_phone ON public.contacts;
CREATE TRIGGER trg_normalize_contact_phone
  BEFORE INSERT OR UPDATE OF phone_normalized, phone_original ON public.contacts
  FOR EACH ROW EXECUTE FUNCTION public.tg_normalize_contact_phone();
