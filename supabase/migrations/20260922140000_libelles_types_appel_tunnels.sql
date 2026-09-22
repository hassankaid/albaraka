-- Libellés lisibles des types de rendez-vous.
--
-- `calls.event_type` porte un CODE stable, écrit par `webhook-calendly` à
-- partir de l'UUID de l'agenda Calendly. C'est ici, et nulle part ailleurs,
-- qu'il devient un libellé pour l'écran. Renommer un agenda dans Calendly ne
-- change donc rien : ni le code stocké, ni ce qui s'affiche.
--
-- Trois agendas rejoignent la liste — les deux tunnels de vente et la
-- rediffusion — et deux libellés manquants sont comblés au passage
-- (`appel_vsl_tunnel` et `appel_temoignages` retombaient sur leur code brut
-- alors que le webhook les écrit depuis le 24/08/2026).
--
-- ⚠️ Ces libellés sont repris à l'identique dans le filtre de `src/pages/Calls.tsx`.
-- Les faire diverger donnerait deux noms au même type selon l'écran.
create or replace view public.calls_enriched as
 SELECT ca.id, ca.contact_id, ca.lead_id, ca.calendly_event_id, ca.event_type,
    ca.scheduled_at, ca.duration_minutes, ca.assigned_to, ca.status, ca.outcome,
    ca.notes, ca.closer_notes, ca.created_at, ca.updated_at, ca.canceled_at,
    ca.canceled_by, ca.cancellation_reason, ca.rescheduled_from,
    ca.raw_full_name, ca.raw_email, ca.raw_phone,
    c.email AS contact_email,
    c.phone_normalized AS contact_phone,
    c.full_name AS contact_full_name,
    p.full_name AS assigned_to_name,
        CASE ca.event_type
            WHEN 'appel_offert_vsl_a'::text THEN 'Appel VSL A'::text
            WHEN 'appel_offert_vsl_b'::text THEN 'Appel VSL B'::text
            WHEN 'appel_setting_webi'::text THEN 'Appel Setting Webi'::text
            WHEN 'inscription_conference'::text THEN 'Conférence'::text
            WHEN 'appel_organique'::text THEN 'Appel Organique'::text
            WHEN 'appel_temoignages'::text THEN 'Témoignages'::text
            WHEN 'appel_vsl_tunnel'::text THEN 'VSL (tunnel)'::text
            WHEN 'rediffusion_conference'::text THEN 'Rediffusion'::text
            WHEN 'tunnel_liberty'::text THEN 'Tunnel Liberty'::text
            WHEN 'al_baraka_200'::text THEN 'Al Baraka 200€/mois'::text
            ELSE ca.event_type
        END AS event_type_label,
        CASE ca.status
            WHEN 'planifie'::text THEN 'Planifié'::text
            WHEN 'annule'::text THEN 'Annulé'::text
            WHEN 'disqualifie'::text THEN 'Disqualifié'::text
            WHEN 'pas_interesse'::text THEN 'Pas intéressé'::text
            WHEN 'non_close'::text THEN 'Non close'::text
            WHEN 'no_show'::text THEN 'No show'::text
            WHEN 'renvoye_pole_vente'::text THEN 'Renvoi Pôle Vente'::text
            WHEN 'renvoye_conference'::text THEN 'Renvoi Conférence'::text
            WHEN 'rediffusion'::text THEN 'Rediffusion'::text
            WHEN 'follow_up'::text THEN 'Follow up'::text
            WHEN 'close'::text THEN 'Close'::text
            WHEN 'effectue'::text THEN 'Effectué'::text
            ELSE ca.status
        END AS status_label,
        CASE ca.canceled_by
            WHEN 'host'::text THEN p.full_name
            WHEN 'invitee'::text THEN c.full_name
            ELSE ca.canceled_by
        END AS canceled_by_name
   FROM ((calls ca
     LEFT JOIN contacts c ON ((ca.contact_id = c.id)))
     LEFT JOIN profiles p ON ((ca.assigned_to = p.id)));

-- Les trois rendez-vous pris avant que l'agenda de rediffusion ne soit branché
-- portaient le nom brut renvoyé par Calendly. Sans cet alignement, l'historique
-- de ce tunnel serait coupé en deux.
update public.calls
set event_type = 'rediffusion_conference'
where event_type = 'REDIFFUSION CONFÉRENCE';
