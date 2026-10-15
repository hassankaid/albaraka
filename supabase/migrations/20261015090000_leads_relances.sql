-- ═══════════════════════════════════════════════════════════════════════
-- Système de relances (demande de Hassan, 15/10/2026).
--
-- LE BESOIN. « À relancer » était un statut sans fin : la fiche restait chez son
-- commercial indéfiniment (250 fiches au 15/10). Désormais, « À relancer » lance
-- un process en 3 étapes : Relance 1 → 2 → 3, puis recyclage.
--
-- LE PRINCIPE. Les étapes ne sont PAS des statuts : c'est un compteur
-- (relance_etape) porté par la fiche en « a_relancer ».
--   - Passer une fiche en « a_relancer » (par n'importe quel chemin : CRM,
--     espace apporteur, RPC) la met à l'étape 1 ;
--   - quitter « a_relancer » (le prospect a répondu : call booké, perdu…) efface
--     le compteur ;
--   - le compteur n'avance QUE par marquer_relance_faite : un UPDATE direct de
--     relance_etape est ignoré (trigger), on ne peut donc jamais « sauter » à la
--     Relance 2 ou 3 ;
--   - Relance 3 faite → statut « pas_de_reponse », désaffectation et recyclage
--     (pot « À recycler » du CEO), comme recycle_lead_by_setter.
-- Pas de délai imposé entre deux relances (décision de Hassan) : on date
-- seulement la dernière (relance_derniere_le).
-- Les collaborateurs intermédiaires peuvent valider la Relance 3 (décision de
-- Hassan) : le recyclage n'arrive qu'après 3 étapes datées et tracées.
-- ═══════════════════════════════════════════════════════════════════════

-- ── 1. Le compteur ───────────────────────────────────────────────────────
alter table public.leads
  add column if not exists relance_etape smallint check (relance_etape between 1 and 3),
  add column if not exists relance_derniere_le timestamptz;

comment on column public.leads.relance_etape is
  'Étape de relance (1 à 3) d''une fiche « a_relancer ». N''avance que par marquer_relance_faite.';
comment on column public.leads.relance_derniere_le is
  'Date de la dernière relance faite (process de relance en cours).';

-- ── 2. Le garde-fou ──────────────────────────────────────────────────────
create or replace function public.tg_leads_relance()
 returns trigger
 language plpgsql
 set search_path to 'public'
as $function$
begin
  if new.status is distinct from 'a_relancer' then
    new.relance_etape := null;
    new.relance_derniere_le := null;
  elsif tg_op = 'INSERT' or old.status is distinct from 'a_relancer' then
    -- entrée dans le process : toujours à l'étape 1
    new.relance_etape := 1;
    new.relance_derniere_le := null;
  elsif coalesce(current_setting('albaraka.relance', true), '') <> 'marquer' then
    -- seule marquer_relance_faite fait avancer le compteur
    new.relance_etape := coalesce(old.relance_etape, 1);
    new.relance_derniere_le := old.relance_derniere_le;
  end if;
  return new;
end;
$function$;

drop trigger if exists trg_leads_relance on public.leads;
create trigger trg_leads_relance
  before insert or update on public.leads
  for each row execute function public.tg_leads_relance();

-- ── 3. « Relance faite » ─────────────────────────────────────────────────
-- p_etape : l'étape que l'utilisateur voit à l'écran. Si la fiche a déjà avancé
-- (double clic, deux onglets), rien ne se passe : on ne valide jamais deux
-- relances d'un coup.
create or replace function public.marquer_relance_faite(p_lead_id uuid, p_etape smallint, p_note text default null)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_caller uuid := auth.uid();
  v_role text;
  l record;
  v_note text := nullif(trim(coalesce(p_note, '')), '');
  v_now timestamptz := now();
begin
  if v_caller is null then
    raise exception 'Non authentifié';
  end if;
  select role into v_role from profiles where id = v_caller;

  select id, status, assigned_to, apporteur_id, coalesce(relance_etape, 1) as etape
    into l from leads where id = p_lead_id for update;
  if not found then
    raise exception 'Lead introuvable';
  end if;

  -- mêmes droits que pour changer le statut : le CEO, le commercial à qui la
  -- fiche est affectée, ou son apporteur tant qu'elle n'est affectée à personne
  if not (
    v_role = 'ceo'
    or (v_role in ('collaborateur', 'apporteur') and l.assigned_to = v_caller)
    or (v_role = 'apporteur' and l.assigned_to is null and l.apporteur_id = v_caller)
  ) then
    raise exception 'Seul le commercial en charge de ce lead (ou le CEO) peut valider une relance';
  end if;

  if l.status <> 'a_relancer' then
    raise exception 'Ce lead n''est plus « À relancer »';
  end if;
  if l.etape <> p_etape then
    return jsonb_build_object('ok', true, 'changed', false, 'etape', l.etape);
  end if;

  insert into lead_activities (lead_id, user_id, action, old_value, new_value, note)
  values (p_lead_id, v_caller, 'relance_faite', l.etape::text, case when l.etape < 3 then (l.etape + 1)::text end,
          'Relance ' || l.etape || ' faite' || coalesce(' — ' || v_note, ''));

  if l.etape < 3 then
    perform set_config('albaraka.relance', 'marquer', true);
    update leads set relance_etape = l.etape + 1, relance_derniere_le = v_now, updated_at = v_now
     where id = p_lead_id;
    perform set_config('albaraka.relance', '', true);
    return jsonb_build_object('ok', true, 'changed', true, 'etape', l.etape + 1, 'recycle', false);
  end if;

  -- Relance 3 faite : le lead part au recyclage
  update leads
     set status = 'pas_de_reponse', assigned_to = null, assigned_at = null,
         recycled_at = v_now, updated_at = v_now
   where id = p_lead_id;

  insert into lead_activities (lead_id, user_id, action, old_value, new_value)
  values (p_lead_id, v_caller, 'status_change', 'a_relancer', 'pas_de_reponse');
  insert into lead_activities (lead_id, user_id, action, note)
  values (p_lead_id, v_caller, 'recycled', 'Recyclage — 3 relances sans réponse');
  if l.assigned_to is not null then
    insert into lead_activities (lead_id, user_id, action, old_value, note)
    values (p_lead_id, v_caller, 'unassigned', l.assigned_to::text, 'Désaffecté automatiquement — 3 relances sans réponse');
  end if;

  return jsonb_build_object('ok', true, 'changed', true, 'etape', null, 'recycle', true);
end;
$function$;

revoke all on function public.marquer_relance_faite(uuid, smallint, text) from public, anon;
grant execute on function public.marquer_relance_faite(uuid, smallint, text) to authenticated;

-- ── 4. Les fiches déjà « À relancer » entrent à la Relance 1 ──────────────
-- (décision A de Hassan). updated_at est remis à sa valeur : rien n'a été
-- « travaillé » sur ces fiches.
alter table public.leads disable trigger update_leads_updated_at;
update public.leads set relance_etape = 1 where status = 'a_relancer' and relance_etape is null;
alter table public.leads enable trigger update_leads_updated_at;

-- ── 5. La vue du CRM expose le compteur ───────────────────────────────────
-- Définition reprise telle quelle de la production (pg_get_viewdef, 15/10),
-- deux colonnes ajoutées à la fin.
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
    l.relance_derniere_le
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
