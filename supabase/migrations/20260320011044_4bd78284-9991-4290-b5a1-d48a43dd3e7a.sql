-- Recreate leads_enriched with security_invoker so RLS applies
DROP VIEW IF EXISTS public.leads_enriched;

CREATE VIEW public.leads_enriched
WITH (security_invoker = on)
AS
SELECT l.id,
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
        WHEN 'vsl_a' THEN 'VSL A'
        WHEN 'vsl_b' THEN 'VSL B'
        WHEN 'vsl_webi' THEN 'VSL Webi'
        WHEN 'instagram_organic' THEN 'Instagram Organique'
        WHEN 'instagram_ads' THEN 'Instagram Ads'
        WHEN 'apporteur' THEN 'Apporteur'
        ELSE l.source_detail
    END AS source_label,
    CASE l.status
        WHEN 'nouveau' THEN 'Nouveau'
        WHEN 'contacte' THEN 'Contacté'
        WHEN 'pas_de_reponse' THEN 'Pas de réponse'
        WHEN 'a_relancer' THEN 'À relancer'
        WHEN 'faux_numero' THEN 'Faux numéro'
        WHEN 'qualifie' THEN 'Qualifié'
        WHEN 'pas_qualifie' THEN 'Pas qualifié'
        WHEN 'converti' THEN 'Converti'
        WHEN 'perdu' THEN 'Perdu'
        ELSE l.status
    END AS status_label
FROM leads l
    LEFT JOIN contacts c ON l.contact_id = c.id
    LEFT JOIN profiles ap ON l.apporteur_id = ap.id
    LEFT JOIN profiles ass ON l.assigned_to = ass.id
    LEFT JOIN LATERAL (
        SELECT calls.id, calls.contact_id, calls.lead_id, calls.calendly_event_id,
            calls.event_type, calls.scheduled_at, calls.duration_minutes,
            calls.assigned_to, calls.status, calls.outcome, calls.notes,
            calls.created_at, calls.updated_at, calls.canceled_at, calls.canceled_by,
            calls.cancellation_reason, calls.rescheduled_from,
            calls.raw_full_name, calls.raw_email, calls.raw_phone, calls.closer_notes
        FROM calls
        WHERE calls.contact_id = l.contact_id
            AND calls.status = 'planifie'
            AND calls.scheduled_at > now()
        ORDER BY calls.scheduled_at
        LIMIT 1
    ) contact_call ON true
    LEFT JOIN profiles contact_call_host ON contact_call.assigned_to = contact_call_host.id;