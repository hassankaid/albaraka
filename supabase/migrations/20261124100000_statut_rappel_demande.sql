-- ─────────────────────────────────────────────────────────────────────────
-- Statut lead « Rappel demandé » (24/11/2026, validé par Sabrina).
--
-- Remontée d'un setter (via Sabrina, 23/11) : « les leads qui prennent RDV post
-- conférence tombent en À relancer ». Vérification : les réservations passent
-- bien en « Call booké » ; ce sont les personnes qui n'ont PAS réservé et ont
-- cliqué « Être rappelé(e) » au formulaire /rdv (migration 20261122140000) qui
-- passaient « À relancer / Relance 1 ». Ce statut est celui des injoignables :
-- l'équipe ne distinguait pas un lead chaud qui demande lui-même un appel, et
-- deux fiches ont été remises en « Inscrit conférence » sans rappel.
--
--   1. Nouveau statut `rappel_demande`, posé uniquement par le formulaire.
--      Le setter appelle puis choisit le résultat (Inscrit conférence, Call
--      booké, À relancer s'il ne répond pas…). Hors compteur de relances.
--   2. rdv_demande_rappel() pose ce statut (aussi sur une fiche « À relancer »).
--   3. Onglet Équipe : sortir d'un « Rappel demandé » compte comme un appel.
--   4. Commercial désactivé : ses fiches « Rappel demandé » reviennent au pot ;
--      apporteur_update_lead_status accepte le statut (sinon, enregistrer une
--      simple note sur une fiche « Rappel demandé » depuis /my-space échouait).
--   5. leads_enriched_base.status_label : « Rappel demandé ».
--   6. Rattrapage : les fiches encore « À relancer » sans aucune action depuis
--      leur demande de rappel du 22/11 passent « Rappel demandé ».
-- ─────────────────────────────────────────────────────────────────────────

-- 1. Statut ─────────────────────────────────────────────────────────────────
alter table public.leads drop constraint if exists leads_status_check;
alter table public.leads add constraint leads_status_check check (status = any (array[
  'a_qualifier','faux_numero','pas_de_reponse','pas_de_reponse_post_conference','pas_qualifie','a_relancer',
  'perdu','inscrit_conference','call_booke','renvoi_pole_vente','close','envoi_rediffusion',
  'dm_a_contacter','contact_dm1','relance_dm1','relance_dm2','perdu_definitif','follow_up',
  'rappel_demande']));

-- 2. Formulaire de rendez-vous ──────────────────────────────────────────────
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
      update public.leads set status = 'rappel_demande', updated_at = now() where id = l.id;
      v_passe := true;
    end if;

    -- user_id est obligatoire : la personne en charge (ou le CEO). L'écran
    -- affiche ce type d'évènement comme automatique, sans auteur.
    insert into public.lead_activities (lead_id, user_id, action, old_value, new_value, note)
    values (l.id, coalesce(l.assigned_to, v_ceo), 'rappel_demande', l.status,
            case when v_passe then 'rappel_demande' else l.status end, v_note);

    v_dest := case when l.assigned_to is not null then array[l.assigned_to]
                   else array(select id from public.profiles where role = 'ceo') end;

    insert into public.notifications (user_id, type, title, body, link, metadata)
    select d, 'rappel_demande',
           'Rappel demandé : ' || coalesce(nullif(v_nom, ''), l.raw_full_name, 'un prospect'),
           case p_question
             when 2 then 'Pas encore décidé(e) au formulaire de rendez-vous : la personne demande à être rappelée.'
             else 'Le budget la freine au formulaire de rendez-vous : la personne demande à être rappelée.'
           end
           || case when v_passe then ' Sa fiche est passée « Rappel demandé » : à appeler en priorité.' else '' end,
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

  return jsonb_build_object('ok', true, 'crm_lead_id', l.id, 'passe_rappel_demande', v_passe);
end;
$$;

revoke all on function public.rdv_demande_rappel(uuid, smallint) from public, anon, authenticated;
grant execute on function public.rdv_demande_rappel(uuid, smallint) to service_role;

-- 3 et 4. Onglet Équipe et commercial désactivé : on ajoute le statut aux listes
-- existantes (remplacement contrôlé de la définition en prod : erreur si le
-- texte attendu n'y est plus, plutôt qu'une modification silencieuse ratée).
do $$
declare
  d text;
  avant text;
begin
  d := pg_get_functiondef('public.equipe_qualification_plage(date, date)'::regprocedure);
  if d !~ 'rappel_demande' then
    avant := d;
    d := replace(d, $r$a.old_value IN ('a_qualifier', 'a_relancer', 'pas_de_reponse',$r$,
                    $r$a.old_value IN ('a_qualifier', 'a_relancer', 'rappel_demande', 'pas_de_reponse',$r$);
    if d = avant then raise exception 'equipe_qualification_plage : liste des statuts d''appel introuvable'; end if;
    execute d;
  end if;

  d := pg_get_functiondef('public.liberer_fiches_a_traiter(uuid, text)'::regprocedure);
  if d !~ 'rappel_demande' then
    avant := d;
    d := replace(d, $r$status in ('a_qualifier', 'nouveau', 'a_relancer', 'envoi_rediffusion')$r$,
                    $r$status in ('a_qualifier', 'nouveau', 'a_relancer', 'rappel_demande', 'envoi_rediffusion')$r$);
    if d = avant then raise exception 'liberer_fiches_a_traiter : liste des statuts introuvable'; end if;
    execute d;
  end if;

  d := pg_get_functiondef('public.apporteur_update_lead_status(uuid, text, text)'::regprocedure);
  if d !~ 'rappel_demande' then
    avant := d;
    d := replace(d, $r$    'pas_de_reponse_post_conference',
    -- Setter DM$r$, $r$    'pas_de_reponse_post_conference',
    'rappel_demande',
    -- Setter DM$r$);
    if d = avant then raise exception 'apporteur_update_lead_status : liste des statuts introuvable'; end if;
    execute d;
  end if;
end $$;

-- 5. Libellé dans la vue ────────────────────────────────────────────────────
do $$
declare
  d text := pg_get_viewdef('public.leads_enriched_base'::regclass);
  avant text := d;
begin
  if d !~ 'rappel_demande' then
    d := replace(d, $r$WHEN 'a_relancer'::text THEN 'À relancer'::text$r$,
                    $r$WHEN 'a_relancer'::text THEN 'À relancer'::text
            WHEN 'rappel_demande'::text THEN 'Rappel demandé'::text$r$);
    if d = avant then raise exception 'leads_enriched_base : libellé « À relancer » introuvable'; end if;
    execute 'create or replace view public.leads_enriched_base as ' || d;
  end if;
end $$;

-- 6. Rattrapage des demandes du 22/11 restées sans suite ────────────────────
with derniere as (
  select distinct on (la.lead_id) la.lead_id, la.created_at
    from public.lead_activities la
   where la.action = 'rappel_demande'
   order by la.lead_id, la.created_at desc
), a_rattraper as (
  select l.id, l.assigned_to
    from public.leads l
    join derniere d on d.lead_id = l.id
   where l.status = 'a_relancer'
     and not exists (select 1 from public.lead_activities b
                      where b.lead_id = l.id and b.created_at > d.created_at
                        and b.action in ('status_change', 'relance_faite'))
), maj as (
  update public.leads l set status = 'rappel_demande', updated_at = now()
    from a_rattraper a where l.id = a.id
  returning l.id, a.assigned_to
)
insert into public.lead_activities (lead_id, user_id, action, old_value, new_value, note)
select m.id, coalesce(m.assigned_to, (select id from public.profiles where role = 'ceo' order by created_at limit 1)),
       'rappel_demande', 'a_relancer', 'rappel_demande',
       'Nouveau statut « Rappel demandé » (24/11) : la demande de rappel du formulaire n''a pas encore été traitée'
  from maj m;
