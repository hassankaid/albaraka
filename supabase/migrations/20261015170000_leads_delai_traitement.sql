-- ═══════════════════════════════════════════════════════════════════════
-- Délai de traitement des leads (demande de Sidali, 15/10/2026).
--
-- Sidali veut voir le délai de traitement des setters : le temps entre le
-- moment où le prospect remplit le formulaire (leads.created_at) et la
-- première action d'un membre de l'équipe sur la fiche.
--
-- « Première action » = la première activité de traitement : changement de
-- statut, note ou relance validée (lead_activities). On la date une fois pour
-- toutes dans leads.premiere_action_le (trigger), et on reprend l'historique.
-- Écrire cette date ne touche pas updated_at : ce n'est pas un travail sur la
-- fiche, juste un repère.
-- ═══════════════════════════════════════════════════════════════════════

-- ── 1. La colonne ────────────────────────────────────────────────────────
alter table public.leads add column if not exists premiere_action_le timestamptz;
comment on column public.leads.premiere_action_le is
  'Date de la première action de l''équipe sur le lead (statut, note ou relance). Délai de traitement = premiere_action_le - created_at.';

-- ── 2. updated_at : ne pas bouger quand seule premiere_action_le change ───
create or replace function public.tg_leads_updated_at()
 returns trigger
 language plpgsql
 set search_path to 'public'
as $function$
begin
  if new.premiere_action_le is distinct from old.premiere_action_le
     -- jour_creation est une colonne générée : encore vide dans un trigger BEFORE
     and (to_jsonb(new) - 'premiere_action_le' - 'updated_at' - 'jour_creation')
       = (to_jsonb(old) - 'premiere_action_le' - 'updated_at' - 'jour_creation') then
    return new;
  end if;
  new.updated_at := now();
  return new;
end;
$function$;

drop trigger if exists update_leads_updated_at on public.leads;
create trigger update_leads_updated_at
  before update on public.leads
  for each row execute function public.tg_leads_updated_at();

-- ── 3. Dater la première action ──────────────────────────────────────────
create or replace function public.tg_lead_activities_premiere_action()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
begin
  if new.action in ('status_change', 'note_added', 'relance_faite') then
    update leads set premiere_action_le = new.created_at
     where id = new.lead_id and premiere_action_le is null;
  end if;
  return new;
end;
$function$;

drop trigger if exists trg_lead_activities_premiere_action on public.lead_activities;
create trigger trg_lead_activities_premiere_action
  after insert on public.lead_activities
  for each row execute function public.tg_lead_activities_premiere_action();

-- ── 4. L'historique ──────────────────────────────────────────────────────
update public.leads l
   set premiere_action_le = p.premiere
  from (select lead_id, min(created_at) as premiere
          from public.lead_activities
         where action in ('status_change', 'note_added', 'relance_faite')
         group by lead_id) p
 where p.lead_id = l.id and l.premiere_action_le is null;

-- ── 5. La vue du CRM expose la date ──────────────────────────────────────
-- Définition reprise telle quelle de la production (pg_get_viewdef, 15/10),
-- une colonne ajoutée à la fin.
create or replace view public.leads_enriched as
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
        CASE
            WHEN contact_call.id IS NOT NULL THEN true
            ELSE false
        END AS has_active_call,
        CASE l.source_detail
            WHEN 'vsl_a'::text THEN 'VSL A'::text
            WHEN 'vsl_b'::text THEN 'VSL B'::text
            WHEN 'vsl_webi'::text THEN 'VSL Webi'::text
            WHEN 'instagram_organic'::text THEN 'Instagram Organique'::text
            WHEN 'instagram_ads'::text THEN 'Instagram Ads'::text
            WHEN 'apporteur'::text THEN 'Apporteur'::text
            ELSE l.source_detail
        END AS source_label,
        CASE l.status
            WHEN 'nouveau'::text THEN 'Nouveau'::text
            WHEN 'contacte'::text THEN 'Contacté'::text
            WHEN 'pas_de_reponse'::text THEN 'Pas de réponse'::text
            WHEN 'a_relancer'::text THEN 'À relancer'::text
            WHEN 'faux_numero'::text THEN 'Faux numéro'::text
            WHEN 'qualifie'::text THEN 'Qualifié'::text
            WHEN 'pas_qualifie'::text THEN 'Pas qualifié'::text
            WHEN 'converti'::text THEN 'Converti'::text
            WHEN 'perdu'::text THEN 'Perdu'::text
            ELSE l.status
        END AS status_label,
    l.recycled_at,
    scoring.score AS quiz_score,
    scoring.category AS quiz_category,
    scoring.flags AS quiz_flags,
    scoring.completed_at AS quiz_completed_at,
    scoring.answers AS quiz_answers,
        CASE
            WHEN scoring.id IS NOT NULL THEN true
            ELSE false
        END AS quiz_filled,
    any_call.id AS any_call_id,
    any_call.scheduled_at AS any_call_scheduled_at,
    any_call.status AS any_call_status,
        CASE
            WHEN any_call.id IS NOT NULL THEN true
            ELSE false
        END AS has_any_call,
    l.auto_released_at,
    l.relance_etape,
    l.relance_derniere_le,
    l.premiere_action_le
   FROM leads l
     LEFT JOIN contacts c ON l.contact_id = c.id
     LEFT JOIN profiles ap ON l.apporteur_id = ap.id
     LEFT JOIN profiles ass ON l.assigned_to = ass.id
     LEFT JOIN LATERAL ( SELECT calls.id,
            calls.contact_id,
            calls.lead_id,
            calls.calendly_event_id,
            calls.event_type,
            calls.scheduled_at,
            calls.duration_minutes,
            calls.assigned_to,
            calls.status,
            calls.outcome,
            calls.notes,
            calls.created_at,
            calls.updated_at,
            calls.canceled_at,
            calls.canceled_by,
            calls.cancellation_reason,
            calls.rescheduled_from,
            calls.raw_full_name,
            calls.raw_email,
            calls.raw_phone,
            calls.closer_notes
           FROM calls
          WHERE calls.contact_id = l.contact_id AND calls.status = 'planifie'::text AND calls.scheduled_at > now()
          ORDER BY calls.scheduled_at
         LIMIT 1) contact_call ON true
     LEFT JOIN profiles contact_call_host ON contact_call.assigned_to = contact_call_host.id
     LEFT JOIN LATERAL ( SELECT lsr.id,
            lsr.score,
            lsr.category,
            lsr.flags,
            lsr.completed_at,
            lsr.answers
           FROM lead_scoring_responses lsr
          WHERE lower(lsr.contact_email) = lower(c.email)
          ORDER BY lsr.completed_at DESC NULLS LAST, lsr.created_at DESC
         LIMIT 1) scoring ON true
     LEFT JOIN LATERAL ( SELECT ca.id,
            ca.scheduled_at,
            ca.status
           FROM calls ca
          WHERE ca.contact_id = l.contact_id
          ORDER BY ca.scheduled_at DESC NULLS LAST, ca.created_at DESC
         LIMIT 1) any_call ON true;
