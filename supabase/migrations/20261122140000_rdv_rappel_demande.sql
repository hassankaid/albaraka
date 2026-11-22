-- ─────────────────────────────────────────────────────────────────────────
-- Funnel /rdv : « Être rappelé(e) » au lieu d'un refus (22/11/2026).
--
-- Décision de Sidali (via Hassan, 22/11) après le cas d'une lead arrêtée à la
-- question 2 (« pas encore décidé(e) ») qui avait compris qu'on la refusait
-- pour une question d'argent :
--   - question 2 « Non, je ne suis pas décidé(e) » et question 5 « Non, je
--     n'ai pas du tout de budget » ne mènent plus à une page de refus mais à
--     une page « Parlons-en » avec un bouton « Être rappelé(e) » ;
--   - la demande arrive dans le CRM : la fiche passe « À relancer » (circuit
--     habituel des setters), une note est ajoutée à son historique et la
--     personne assignée (ou le CEO) reçoit une notification.
--
-- Garde-fou : une fiche déjà plus avancée (call booké, close, perdu…) ou
-- suivie en Lead Setting DM ne change pas de statut ; elle reçoit seulement
-- la note et la notification.
-- ─────────────────────────────────────────────────────────────────────────

-- 1. Le funnel garde la trace de la demande
alter table public.rdv_funnel_leads drop constraint if exists rdv_funnel_leads_status_check;
alter table public.rdv_funnel_leads add constraint rdv_funnel_leads_status_check
  check (status = any (array['coords_only', 'qualified', 'disqualified', 'booked', 'rappel_demande']));

alter table public.rdv_funnel_leads
  add column if not exists rappel_demande_at timestamptz,
  add column if not exists rappel_question smallint,
  add column if not exists rappel_crm_lead_id uuid references public.leads(id) on delete set null;

alter table public.rdv_funnel_leads drop constraint if exists rdv_funnel_leads_rappel_question_check;
alter table public.rdv_funnel_leads add constraint rdv_funnel_leads_rappel_question_check
  check (rappel_question is null or rappel_question in (2, 5));

-- 2. Transmission au CRM (appelée par l'edge function rdv-funnel-submit,
--    action « rappel », avec la clé service_role uniquement)
create or replace function public.rdv_demande_rappel(p_rdv_lead_id uuid, p_question smallint)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  r public.rdv_funnel_leads;
  l record;
  v_ceo uuid := (select id from public.profiles where role = 'ceo' order by created_at limit 1);
  v_motif text := case p_question when 2 then 'pas encore décidé(e)' else 'budget' end;
  v_nom text;
  v_note text;
  v_passe boolean := false;
  v_dest uuid[];
  -- Statuts « en amont » : la demande de rappel les fait passer « À relancer »
  v_amont text[] := array['a_qualifier', 'inscrit_conference', 'envoi_rediffusion',
                          'pas_de_reponse_post_conference', 'pas_de_reponse'];
begin
  if p_question not in (2, 5) then
    raise exception 'Question non prévue pour un rappel : %', p_question;
  end if;

  select * into r from public.rdv_funnel_leads where id = p_rdv_lead_id for update;
  if not found then
    raise exception 'Demande introuvable';
  end if;

  -- Idempotent : un double clic ne crée ni deuxième note ni deuxième notification
  if r.status = 'rappel_demande' then
    return jsonb_build_object('ok', true, 'deja', true, 'crm_lead_id', r.rappel_crm_lead_id);
  end if;

  v_nom := btrim(coalesce(r.first_name, '') || ' ' || coalesce(r.last_name, ''));

  -- La fiche CRM : même e-mail ou même téléphone, fiche principale d'abord,
  -- puis la plus récente
  select ld.id, ld.status, ld.assigned_to, ld.raw_full_name
    into l
    from public.leads ld
    left join public.contacts c on c.id = ld.contact_id
   where lower(ld.raw_email) = lower(r.email)
      or lower(c.email) = lower(r.email)
      or ld.raw_phone = r.phone
      or c.phone_normalized = r.phone
   order by (ld.fiche_principale_id is null) desc, ld.created_at desc
   limit 1;

  v_note := format('Rappel demandé depuis le formulaire de rendez-vous (question %s : %s)', p_question, v_motif);

  if l.id is not null then
    if l.status = any (v_amont) then
      update public.leads set status = 'a_relancer', updated_at = now() where id = l.id;
      v_passe := true;
    end if;

    insert into public.lead_activities (lead_id, user_id, action, old_value, new_value, note)
    values (l.id, coalesce(l.assigned_to, v_ceo), 'rappel_demande', l.status,
            case when v_passe then 'a_relancer' else l.status end, v_note);

    v_dest := case when l.assigned_to is not null then array[l.assigned_to]
                   else array(select id from public.profiles where role = 'ceo') end;

    insert into public.notifications (user_id, type, title, body, link, metadata)
    select d, 'rappel_demande',
           'Rappel demandé : ' || coalesce(nullif(v_nom, ''), l.raw_full_name, 'un prospect'),
           case p_question
             when 2 then 'Pas encore décidé(e) au formulaire de rendez-vous : la personne demande à être rappelée.'
             else 'Le budget la freine au formulaire de rendez-vous : la personne demande à être rappelée.'
           end
           || case when v_passe then ' Sa fiche est passée « À relancer ».' else '' end,
           case when p.role = 'apporteur' then '/my-space/leads' else '/leads' end
             || '?q=' || replace(r.phone, '+', '%2B'),
           jsonb_build_object('lead_id', l.id, 'rdv_lead_id', r.id, 'question', p_question)
      from unnest(v_dest) d
      join public.profiles p on p.id = d;
  else
    -- Aucune fiche CRM : le CEO reçoit les coordonnées pour rappeler
    insert into public.notifications (user_id, type, title, body, link, metadata)
    select p.id, 'rappel_demande',
           'Rappel demandé : ' || coalesce(nullif(v_nom, ''), 'un prospect'),
           format('Aucune fiche lead trouvée. Téléphone : %s, e-mail : %s. Motif : %s.', r.phone, r.email, v_motif),
           null,
           jsonb_build_object('rdv_lead_id', r.id, 'question', p_question)
      from public.profiles p
     where p.role = 'ceo';
  end if;

  update public.rdv_funnel_leads
     set status = 'rappel_demande',
         rappel_demande_at = now(),
         rappel_question = p_question,
         rappel_crm_lead_id = l.id,
         updated_at = now()
   where id = r.id;

  return jsonb_build_object('ok', true, 'crm_lead_id', l.id, 'passe_a_relancer', v_passe);
end;
$$;

revoke all on function public.rdv_demande_rappel(uuid, smallint) from public, anon, authenticated;
grant execute on function public.rdv_demande_rappel(uuid, smallint) to service_role;
