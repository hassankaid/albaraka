-- ─────────────────────────────────────────────────────────────────────────
-- Demande de rappel sur une fiche recyclée : « Rappel demandé » dans
-- « À affecter » (24/11/2026, validé par Hassan pour Sabrina).
--
-- La migration 20261124180000 remettait la fiche « À qualifier ». Le setter à
-- qui Sabrina la confiait voyait alors un lead froid, hors du bandeau des
-- rappels et de la tête de l'ordre d'appel. Désormais la fiche sort du
-- recyclage en « Rappel demandé » : visible dans « À affecter », et le statut
-- est conservé à l'affectation (statutApresRecyclage, executeBulkAssign).
-- Notifications inchangées (setter ou CEO + can_assign_leads, toujours).
-- ─────────────────────────────────────────────────────────────────────────

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
  v_recycle boolean := false;
  v_nouveau text;
  v_setter text;
  v_dest uuid[];
  -- Statuts « en amont » : la demande de rappel les fait passer « Rappel demandé »
  -- (« À relancer » compris depuis le 24/11 : la personne redevient joignable)
  v_amont text[] := array['a_qualifier', 'inscrit_conference', 'envoi_rediffusion',
                          'pas_de_reponse_post_conference', 'pas_de_reponse', 'a_relancer'];
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
  select ld.id, ld.status, ld.assigned_to, ld.raw_full_name, ld.recycled_at
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
    v_nouveau := l.status;
    if l.status = any (v_amont) then
      v_passe := true;
      if l.recycled_at is not null and l.assigned_to is null then
        -- Fiche recyclée sans setter : retour dans « À affecter » en « Rappel demandé »
        v_recycle := true;
        v_nouveau := 'rappel_demande';
        update public.leads set status = 'rappel_demande', recycled_at = null, updated_at = now() where id = l.id;
        v_note := v_note || '. La fiche sort de « À recycler » et arrive dans « À affecter » pour être confiée à un setter';
      else
        v_nouveau := 'rappel_demande';
        update public.leads set status = 'rappel_demande', updated_at = now() where id = l.id;
      end if;
    end if;

    -- user_id est obligatoire : la personne en charge (ou le CEO). L'écran
    -- affiche ce type d'évènement comme automatique, sans auteur.
    insert into public.lead_activities (lead_id, user_id, action, old_value, new_value, note)
    values (l.id, coalesce(l.assigned_to, v_ceo), 'rappel_demande', l.status, v_nouveau, v_note);

    select full_name into v_setter from public.profiles where id = l.assigned_to;

    -- Setter en charge (ou CEO s'il n'y en a pas) + personnes qui distribuent les leads
    v_dest := array(
      select distinct d from (
        select l.assigned_to as d where l.assigned_to is not null
        union all
        select id from public.profiles where role = 'ceo' and l.assigned_to is null
        union all
        select id from public.profiles where coalesce(can_assign_leads, false)
      ) x where d is not null);

    insert into public.notifications (user_id, type, title, body, link, metadata)
    select d, 'rappel_demande',
           'Rappel demandé : ' || coalesce(nullif(v_nom, ''), l.raw_full_name, 'un prospect'),
           case p_question
             when 2 then 'Pas encore décidé(e) au formulaire de rendez-vous : la personne demande à être rappelée.'
             else 'Le budget la freine au formulaire de rendez-vous : la personne demande à être rappelée.'
           end
           || case
                when v_recycle then ' Sa fiche était dans « À recycler » : elle arrive dans « À affecter » en « Rappel demandé », à confier à un setter.'
                when v_passe and d = l.assigned_to then ' Sa fiche est passée « Rappel demandé » : à appeler en priorité.'
                when v_passe then ' Sa fiche est passée « Rappel demandé »'
                                  || coalesce(' chez ' || v_setter, '') || '.'
                when v_setter is not null and d <> l.assigned_to then ' Fiche suivie par ' || v_setter || '.'
                else ''
              end,
           case when p.role = 'apporteur' then '/my-space/leads' else '/leads' end
             || '?q=' || replace(r.phone, '+', '%2B'),
           jsonb_build_object('lead_id', l.id, 'rdv_lead_id', r.id, 'question', p_question)
      from unnest(v_dest) d
      join public.profiles p on p.id = d;
  else
    -- Aucune fiche CRM : le CEO et les personnes qui distribuent les leads
    -- reçoivent les coordonnées pour rappeler
    insert into public.notifications (user_id, type, title, body, link, metadata)
    select p.id, 'rappel_demande',
           'Rappel demandé : ' || coalesce(nullif(v_nom, ''), 'un prospect'),
           format('Aucune fiche lead trouvée. Téléphone : %s, e-mail : %s. Motif : %s.', r.phone, r.email, v_motif),
           null,
           jsonb_build_object('rdv_lead_id', r.id, 'question', p_question)
      from public.profiles p
     where p.role = 'ceo' or coalesce(p.can_assign_leads, false);
  end if;

  update public.rdv_funnel_leads
     set status = 'rappel_demande',
         rappel_demande_at = now(),
         rappel_question = p_question,
         rappel_crm_lead_id = l.id,
         updated_at = now()
   where id = r.id;

  return jsonb_build_object('ok', true, 'crm_lead_id', l.id,
                            'passe_rappel_demande', v_passe,
                            'sort_du_recyclage', v_recycle);
end;
$$;

revoke all on function public.rdv_demande_rappel(uuid, smallint) from public, anon, authenticated;
grant execute on function public.rdv_demande_rappel(uuid, smallint) to service_role;
