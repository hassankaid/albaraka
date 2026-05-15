-- Fonction strictement scopée pour la feature "badge fiches multiples" sur
-- la page /leads. Permet à un collab (notamment intermédiaire, limité par
-- RLS à ses propres leads) de SAVOIR qu'un contact a d'autres fiches lead,
-- sans révéler le contenu sensible de ces fiches.
--
-- Bypass RLS via SECURITY DEFINER : NÉCESSAIRE pour que les intermédiaires
-- voient l'info de doublon. Le scope est volontairement minimaliste :
--   - Renvoie UNIQUEMENT pour les contacts qui ont >1 lead (pas de doublon
--     = pas dans le résultat).
--   - Pour chaque lead "sibling" : id, created_at, status, setter_name.
--     Rien d'autre (pas de raw_email, raw_phone, notes, scoring, source…).
--   - Pas d'info contact (email/phone/name : déjà connue du caller).
--
-- Aucune autre RLS n'est touchée par cette migration.

CREATE OR REPLACE FUNCTION public.get_contact_leads_index(p_contact_ids UUID[])
RETURNS JSONB
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $func$
  WITH dups AS (
    SELECT contact_id
    FROM public.leads
    WHERE contact_id = ANY(p_contact_ids)
    GROUP BY contact_id
    HAVING count(*) > 1
  ),
  agg AS (
    SELECT
      l.contact_id,
      count(*)::int AS n,
      jsonb_agg(
        jsonb_build_object(
          'id', l.id,
          'created_at', l.created_at,
          'status', l.status,
          'setter_name', pr.full_name
        )
        ORDER BY l.created_at DESC
      ) AS leads
    FROM public.leads l
    LEFT JOIN public.profiles pr ON pr.id = l.assigned_to
    WHERE l.contact_id IN (SELECT contact_id FROM dups)
    GROUP BY l.contact_id
  )
  SELECT COALESCE(
    jsonb_object_agg(
      contact_id::text,
      jsonb_build_object('count', n, 'leads', leads)
    ),
    '{}'::jsonb
  )
  FROM agg;
$func$;

GRANT EXECUTE ON FUNCTION public.get_contact_leads_index(UUID[]) TO authenticated;
