-- Auto-reclassify meta_ads leads on insert based on source_detail
CREATE OR REPLACE FUNCTION public.reclassify_meta_ads_source()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.source = 'meta_ads' THEN
    IF NEW.source_detail = 'vsl_b' THEN
      NEW.source := 'vsl_b';
    ELSIF NEW.source_detail = 'vsl_a' THEN
      NEW.source := 'vsl_a';
    ELSIF NEW.source_detail IN ('vsl_webi', 'webi') THEN
      NEW.source := 'webi';
    ELSE
      -- Fallback: keep meta_ads as-is if unknown detail
      NEW.source := COALESCE(NEW.source_detail, 'autre');
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_reclassify_meta_ads
  BEFORE INSERT ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.reclassify_meta_ads_source();
