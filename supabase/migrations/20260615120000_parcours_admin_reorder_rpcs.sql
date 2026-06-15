-- Admin parcours CRUD : RPC de réordonnancement atomique des phases et chapitres.
-- Renumérote ordre ET numero = position (1..n) à partir d'un tableau d'ids ordonné.
-- Garde stricte : p_ordered_ids doit être EXACTEMENT l'ensemble des phases/chapitres
-- du parent (bon cardinal, sans doublon, tous rattachés) — sinon RAISE, pour éviter
-- toute corruption silencieuse. Les phases utilisent un "parking" hors plage avant
-- réassignation à cause de la contrainte UNIQUE(parcours_id, numero).

CREATE OR REPLACE FUNCTION public.reorder_parcours_phases(p_parcours_id uuid, p_ordered_ids uuid[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_count int;
  v_len int := COALESCE(array_length(p_ordered_ids, 1), 0);
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ceo') THEN
    RAISE EXCEPTION 'forbidden: CEO only';
  END IF;

  SELECT count(*) INTO v_count FROM public.parcours_phases WHERE parcours_id = p_parcours_id;

  IF v_count <> v_len
     OR (SELECT count(DISTINCT u) FROM unnest(p_ordered_ids) AS u) <> v_len
     OR EXISTS (
       SELECT 1 FROM unnest(p_ordered_ids) AS x(id)
       WHERE NOT EXISTS (
         SELECT 1 FROM public.parcours_phases ph
         WHERE ph.id = x.id AND ph.parcours_id = p_parcours_id))
  THEN
    RAISE EXCEPTION 'reorder_parcours_phases: p_ordered_ids doit contenir exactement les % phases du parcours', v_count;
  END IF;

  UPDATE public.parcours_phases SET numero = numero + 100000 WHERE parcours_id = p_parcours_id;

  UPDATE public.parcours_phases ph
     SET ordre = t.pos, numero = t.pos
    FROM (SELECT u.id, u.ord::int AS pos FROM unnest(p_ordered_ids) WITH ORDINALITY AS u(id, ord)) t
   WHERE ph.id = t.id AND ph.parcours_id = p_parcours_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.reorder_parcours_chapitres(p_phase_id uuid, p_ordered_ids uuid[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_count int;
  v_len int := COALESCE(array_length(p_ordered_ids, 1), 0);
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ceo') THEN
    RAISE EXCEPTION 'forbidden: CEO only';
  END IF;

  SELECT count(*) INTO v_count FROM public.parcours_chapitres WHERE phase_id = p_phase_id;

  IF v_count <> v_len
     OR (SELECT count(DISTINCT u) FROM unnest(p_ordered_ids) AS u) <> v_len
     OR EXISTS (
       SELECT 1 FROM unnest(p_ordered_ids) AS x(id)
       WHERE NOT EXISTS (
         SELECT 1 FROM public.parcours_chapitres ch
         WHERE ch.id = x.id AND ch.phase_id = p_phase_id))
  THEN
    RAISE EXCEPTION 'reorder_parcours_chapitres: p_ordered_ids doit contenir exactement les % chapitres de la phase', v_count;
  END IF;

  UPDATE public.parcours_chapitres ch
     SET ordre = t.pos, numero = t.pos
    FROM (SELECT u.id, u.ord::int AS pos FROM unnest(p_ordered_ids) WITH ORDINALITY AS u(id, ord)) t
   WHERE ch.id = t.id AND ch.phase_id = p_phase_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.reorder_parcours_phases(uuid, uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reorder_parcours_chapitres(uuid, uuid[]) TO authenticated;
