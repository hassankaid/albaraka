-- RPC appelée au clic sur le bouton "Rejoindre Discord" dans le gate d'onboarding.
-- Idempotente : si déjà joined, renvoie le timestamp existant sans rien écraser.
CREATE OR REPLACE FUNCTION public.record_discord_join()
RETURNS TIMESTAMPTZ
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now TIMESTAMPTZ := now();
  v_existing TIMESTAMPTZ;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT discord_joined_at INTO v_existing
  FROM public.profiles WHERE id = auth.uid();

  IF v_existing IS NOT NULL THEN
    RETURN v_existing;
  END IF;

  UPDATE public.profiles SET discord_joined_at = v_now WHERE id = auth.uid();
  RETURN v_now;
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_discord_join() TO authenticated;
