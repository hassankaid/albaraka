-- Étend la vue leads_enriched avec :
--   - 5 colonnes scoring : quiz_filled, quiz_score, quiz_category, quiz_completed_at, quiz_flags, quiz_answers
--   - 4 colonnes "call pris" (peu importe statut/date) : has_any_call, any_call_id, any_call_scheduled_at, any_call_status
--
-- Match scoring par email (lead_scoring_responses n'a pas de FK vers leads ;
-- la jointure naturelle se fait sur contacts.email = lsr.contact_email).
-- Match "any call" par contact_id (les calls Calendly remontent toujours
-- avec un contact_id).

CREATE INDEX IF NOT EXISTS lead_scoring_responses_email_lower_idx
  ON public.lead_scoring_responses (lower(contact_email));

CREATE OR REPLACE VIEW public.leads_enriched
WITH (security_invoker = on)
AS
SELECT
  l.id,
  l.contact_id,
  l.source,
  l.source_detail,
  l.apporteur_id,
  l.assigned_to,
  l.assigned_at,
  l.status,
  l.call_type,
  l.systeme_io_id,
  l.created_at,
  l.updated_at,
  l.raw_full_name,
  l.raw_email,
  l.raw_phone,
  l.notes,
  c.email AS contact_email,
  c.phone_normalized AS contact_phone,
  c.full_name AS contact_full_name,
  ap.full_name AS apporteur_name,
  ass.full_name AS assigned_to_name,
  contact_call.id AS contact_call_id,
  contact_call.scheduled_at AS contact_call_scheduled_at,
  contact_call.status AS contact_call_status,
  contact_call.event_type AS contact_call_event_type,
  contact_call.assigned_to AS contact_call_assigned_to,
  contact_call_host.full_name AS contact_call_assigned_to_name,
  CASE WHEN contact_call.id IS NOT NULL THEN true ELSE false END AS has_active_call,
  CASE l.source_detail
    WHEN 'vsl_a'::text              THEN 'VSL A'::text
    WHEN 'vsl_b'::text              THEN 'VSL B'::text
    WHEN 'vsl_webi'::text           THEN 'VSL Webi'::text
    WHEN 'instagram_organic'::text  THEN 'Instagram Organique'::text
    WHEN 'instagram_ads'::text      THEN 'Instagram Ads'::text
    WHEN 'apporteur'::text          THEN 'Apporteur'::text
    ELSE l.source_detail
  END AS source_label,
  CASE l.status
    WHEN 'nouveau'::text          THEN 'Nouveau'::text
    WHEN 'contacte'::text         THEN 'Contacté'::text
    WHEN 'pas_de_reponse'::text   THEN 'Pas de réponse'::text
    WHEN 'a_relancer'::text       THEN 'À relancer'::text
    WHEN 'faux_numero'::text      THEN 'Faux numéro'::text
    WHEN 'qualifie'::text         THEN 'Qualifié'::text
    WHEN 'pas_qualifie'::text     THEN 'Pas qualifié'::text
    WHEN 'converti'::text         THEN 'Converti'::text
    WHEN 'perdu'::text            THEN 'Perdu'::text
    ELSE l.status
  END AS status_label,
  l.recycled_at,

  -- Quiz scoring
  scoring.score          AS quiz_score,
  scoring.category       AS quiz_category,
  scoring.flags          AS quiz_flags,
  scoring.completed_at   AS quiz_completed_at,
  scoring.answers        AS quiz_answers,
  CASE WHEN scoring.id IS NOT NULL THEN true ELSE false END AS quiz_filled,

  -- Call autonome
  any_call.id            AS any_call_id,
  any_call.scheduled_at  AS any_call_scheduled_at,
  any_call.status        AS any_call_status,
  CASE WHEN any_call.id IS NOT NULL THEN true ELSE false END AS has_any_call

FROM leads l
LEFT JOIN contacts c   ON l.contact_id = c.id
LEFT JOIN profiles ap  ON l.apporteur_id = ap.id
LEFT JOIN profiles ass ON l.assigned_to = ass.id

LEFT JOIN LATERAL (
  SELECT
    calls.id, calls.contact_id, calls.lead_id, calls.calendly_event_id,
    calls.event_type, calls.scheduled_at, calls.duration_minutes,
    calls.assigned_to, calls.status, calls.outcome, calls.notes,
    calls.created_at, calls.updated_at, calls.canceled_at, calls.canceled_by,
    calls.cancellation_reason, calls.rescheduled_from, calls.raw_full_name,
    calls.raw_email, calls.raw_phone, calls.closer_notes
  FROM calls
  WHERE calls.contact_id = l.contact_id
    AND calls.status = 'planifie'::text
    AND calls.scheduled_at > now()
  ORDER BY calls.scheduled_at
  LIMIT 1
) contact_call ON true
LEFT JOIN profiles contact_call_host ON contact_call.assigned_to = contact_call_host.id

LEFT JOIN LATERAL (
  SELECT lsr.id, lsr.score, lsr.category, lsr.flags, lsr.completed_at, lsr.answers
  FROM lead_scoring_responses lsr
  WHERE lower(lsr.contact_email) = lower(c.email)
  ORDER BY lsr.completed_at DESC NULLS LAST, lsr.created_at DESC
  LIMIT 1
) scoring ON true

LEFT JOIN LATERAL (
  SELECT ca.id, ca.scheduled_at, ca.status
  FROM calls ca
  WHERE ca.contact_id = l.contact_id
  ORDER BY ca.scheduled_at DESC NULLS LAST, ca.created_at DESC
  LIMIT 1
) any_call ON true
;
