-- ─────────────────────────────────────────────────────────────────────────
-- Refonte du lead scoring, étape 2 (décisions de Sidali validées le 28/10/2026).
--
-- 1. Réglages : jours du signal « Jeu-Ven » et choix de le faire peser ou non dans
--    l'ordre d'appel (décision 2 : tag seulement, tri désactivé au départ).
-- 2. Saisie des 7 réponses par le setter quand le questionnaire n'est pas rempli
--    (décision 5) : la réponse est rattachée au lead (lead_id) et marquée saisi_par ;
--    elle donne une priorité mais reste hors du recalage de la grille.
-- 3. Tags calculés dans la vue : « Réinscrit » (une autre fiche du même contact dans
--    les 30 jours, un autre jour ; décision 1 : on relie, on ne fusionne pas — le même
--    setter est déjà assuré par auto_assign_new_lead_to_contact_collab) et « Jeu-Ven ».
-- 4. Admin : publier une nouvelle version de la grille (recalcul de l'historique) et
--    modifier les réglages, CEO seulement.
-- 5. Rapport par conférence, par priorité et par tag (décision 4).
-- ─────────────────────────────────────────────────────────────────────────

-- 1. Réglages ------------------------------------------------------------------
create table if not exists public.scoring_reglages (
  id             boolean primary key default true check (id),
  jours_jeu_ven  integer[] not null default '{4,5}',   -- ISO : 1 = lundi … 7 = dimanche
  jeu_ven_tri    boolean not null default false,       -- remonte les Jeu-Ven à priorité égale
  updated_at     timestamptz not null default now(),
  updated_by     uuid references public.profiles(id) on delete set null
);
insert into public.scoring_reglages (id) values (true) on conflict do nothing;
alter table public.scoring_reglages enable row level security;
drop policy if exists scoring_reglages_lecture on public.scoring_reglages;
create policy scoring_reglages_lecture on public.scoring_reglages for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('ceo', 'collaborateur')));

-- 2. Saisie par le setter ------------------------------------------------------
alter table public.lead_scoring_responses
  add column if not exists lead_id   uuid references public.leads(id) on delete cascade,
  add column if not exists saisi_par uuid references public.profiles(id) on delete set null,
  alter column contact_email drop not null,
  alter column score drop not null,
  alter column category drop not null;
comment on column public.lead_scoring_responses.saisi_par is
  'Setter qui a saisi les réponses au téléphone. Ces lignes donnent une priorité mais restent hors du recalage de la grille.';
create index if not exists lead_scoring_responses_lead_id_idx on public.lead_scoring_responses (lead_id) where lead_id is not null;
create index if not exists leads_contact_created_idx on public.leads (contact_id, created_at);

insert into public.quiz_funnel_configs (slug, name, thank_you_url, active)
values ('saisie-setter', 'Saisie par le setter (fiche du lead)', 'https://plateforme.albarakaecosysteme.com', false)
on conflict (slug) do nothing;

create or replace function public.lead_scoring_saisir(p_lead_id uuid, p_answers jsonb)
returns table (score integer, priorite text)
language plpgsql security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  v_role text := coalesce(get_user_role(), '');
  v_lead record;
  v_calc record;
begin
  select l.id, l.assigned_to, l.raw_email, l.raw_phone, l.raw_full_name, c.email as contact_email
    into v_lead
  from leads l left join contacts c on c.id = l.contact_id
  where l.id = p_lead_id;
  if v_lead.id is null then raise exception 'lead_introuvable'; end if;

  if not (v_role = 'ceo' or (v_role = 'collaborateur' and (v_lead.assigned_to = auth.uid() or can_assign_leads_now()))) then
    raise exception 'acces_refuse' using errcode = '42501';
  end if;

  if exists (select 1 from leads_enriched e where e.id = p_lead_id and e.quiz_priorite is not null and e.quiz_saisi_par is null) then
    raise exception 'deja_rempli: le lead a déjà rempli le questionnaire';
  end if;

  select * into v_calc from scoring_calcul(p_answers);
  if v_calc.score is null then raise exception 'reponses_incompletes: les 7 réponses sont nécessaires'; end if;

  -- Une saisie remplace la précédente saisie du setter pour ce lead.
  delete from lead_scoring_responses where lead_id = p_lead_id and saisi_par is not null;

  insert into lead_scoring_responses (funnel_slug, lead_id, saisi_par, contact_email, contact_first_name, contact_phone, answers, flags)
  values ('saisie-setter', p_lead_id, auth.uid(), lower(coalesce(v_lead.contact_email, v_lead.raw_email)), v_lead.raw_full_name, v_lead.raw_phone,
          p_answers,
          array_remove(array[
            case when p_answers ->> 'q4' = 'moins_500' then 'investissement_faible' end,
            case when p_answers ->> 'q6' = 'pas_du_tout' then 'desalignement_humain' end,
            case when p_answers ->> 'q7' = 'pret_action' then 'appel_prioritaire' end
          ], null));

  insert into lead_activities (lead_id, user_id, action, new_value, note)
  values (p_lead_id, auth.uid(), 'questionnaire_saisi', v_calc.priorite || ' ' || v_calc.score || '/100', 'Questionnaire saisi par le setter');

  return query select v_calc.score, v_calc.priorite;
end;
$$;
revoke all on function public.lead_scoring_saisir(uuid, jsonb) from public, anon;
grant execute on function public.lead_scoring_saisir(uuid, jsonb) to authenticated;

-- 4. Admin de la grille et des réglages -----------------------------------------
create or replace function public.scoring_grille_publier(p_points jsonb, p_seuil_a integer, p_seuil_b integer, p_seuil_c integer, p_note text)
returns integer
language plpgsql security definer
set search_path = public
as $$
declare
  v_active jsonb;
  v_q text;
  v_code text;
  v_max integer := 0;
  v_version integer;
begin
  if coalesce(get_user_role(), '') <> 'ceo' then raise exception 'acces_refuse' using errcode = '42501'; end if;
  select points into v_active from scoring_grilles where active;

  -- Mêmes questions et mêmes réponses que la grille active : le questionnaire ne change pas.
  for v_q in select jsonb_object_keys(v_active) loop
    if not (p_points ? v_q) then raise exception 'grille_invalide: question % manquante', v_q; end if;
    for v_code in select jsonb_object_keys(v_active -> v_q) loop
      if jsonb_typeof(p_points -> v_q -> v_code) <> 'number'
         or (p_points -> v_q ->> v_code)::numeric not between 0 and 100
         or (p_points -> v_q ->> v_code)::numeric <> floor((p_points -> v_q ->> v_code)::numeric) then
        raise exception 'grille_invalide: points de %/% entre 0 et 100, sans décimale', v_q, v_code;
      end if;
    end loop;
    select v_max + max(value::integer) into v_max from jsonb_each_text(p_points -> v_q);
  end loop;
  if v_max <> 100 then raise exception 'grille_invalide: le meilleur profil doit faire 100 points (ici %)', v_max; end if;
  if not (p_seuil_a > p_seuil_b and p_seuil_b > p_seuil_c and p_seuil_c > 0 and p_seuil_a <= 100) then
    raise exception 'grille_invalide: seuils A > B > C > 0';
  end if;

  update scoring_grilles set active = false where active;
  insert into scoring_grilles (points, seuil_a, seuil_b, seuil_c, active, note, created_by)
  values (p_points, p_seuil_a, p_seuil_b, p_seuil_c, true, nullif(btrim(p_note), ''), auth.uid())
  returning version into v_version;

  update lead_scoring_responses r
  set score_100 = c.score, priorite = c.priorite, grille_version = c.version
  from lead_scoring_responses x
  cross join lateral scoring_calcul(x.answers, v_version) c
  where x.id = r.id;

  return v_version;
end;
$$;
revoke all on function public.scoring_grille_publier(jsonb, integer, integer, integer, text) from public, anon;
grant execute on function public.scoring_grille_publier(jsonb, integer, integer, integer, text) to authenticated;

create or replace function public.scoring_reglages_modifier(p_jours_jeu_ven integer[], p_jeu_ven_tri boolean)
returns void
language plpgsql security definer
set search_path = public
as $$
begin
  if coalesce(get_user_role(), '') <> 'ceo' then raise exception 'acces_refuse' using errcode = '42501'; end if;
  if exists (select 1 from unnest(p_jours_jeu_ven) j where j not between 1 and 7) then raise exception 'jours_invalides'; end if;
  update scoring_reglages
  set jours_jeu_ven = coalesce(p_jours_jeu_ven, '{}'), jeu_ven_tri = p_jeu_ven_tri, updated_at = now(), updated_by = auth.uid()
  where id;
end;
$$;
revoke all on function public.scoring_reglages_modifier(integer[], boolean) from public, anon;
grant execute on function public.scoring_reglages_modifier(integer[], boolean) to authenticated;

-- 3. Vue de la page Leads ------------------------------------------------------
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
    l.premiere_action_le,
    attr.canal,
    attr.tunnel,
    attr.canal_precision,
    scoring.score_100 AS quiz_score_100,
    scoring.priorite AS quiz_priorite,
    scoring.grille_version AS quiz_grille_version,
    scoring.saisi_par AS quiz_saisi_par,
    reinscription.id AS reinscrit_de,
    (EXTRACT(isodow FROM l.created_at AT TIME ZONE 'Europe/Paris'::text)::integer = ANY (COALESCE(( SELECT r.jours_jeu_ven
           FROM scoring_reglages r), '{}'::integer[]))) AS signal_jeu_ven
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
            lsr.answers,
            lsr.score_100,
            lsr.priorite,
            lsr.grille_version,
            lsr.saisi_par
           FROM lead_scoring_responses lsr
          WHERE lsr.lead_id = l.id OR lower(lsr.contact_email) = lower(c.email)
          ORDER BY lsr.completed_at DESC NULLS LAST, lsr.created_at DESC
         LIMIT 1) scoring ON true
     LEFT JOIN LATERAL ( SELECT ca.id,
            ca.scheduled_at,
            ca.status
           FROM calls ca
          WHERE ca.contact_id = l.contact_id
          ORDER BY ca.scheduled_at DESC NULLS LAST, ca.created_at DESC
         LIMIT 1) any_call ON true
     LEFT JOIN LATERAL lead_attribution(l.source, l.source_detail, l.utm_source) attr(canal, tunnel, canal_precision) ON true
     LEFT JOIN LATERAL ( SELECT p.id
           FROM leads p
          WHERE p.contact_id = l.contact_id AND p.id <> l.id AND p.created_at < l.created_at AND p.created_at >= (l.created_at - '30 days'::interval) AND (p.created_at AT TIME ZONE 'Europe/Paris'::text)::date < (l.created_at AT TIME ZONE 'Europe/Paris'::text)::date
          ORDER BY p.created_at DESC
         LIMIT 1) reinscription ON true;

-- 5. Rapport par conférence ----------------------------------------------------
-- Mêmes définitions que l'analyse du 12 au 25/10 : « inscrit » = inscrit à la
-- conférence ou plus loin ; injoignable = pas de réponse ou faux numéro ; RDV = appel
-- réservé rattaché au lead, hors annulés ; vente = vente attribuée au lead.
create or replace function public.scoring_rapport(p_debut date, p_fin date, p_mode text default 'conference')
returns table (axe text, cle text, leads bigint, inscrits bigint, pas_qualifies bigint, injoignables bigint, rdv bigint, ventes bigint, ca numeric)
language plpgsql stable security definer
set search_path = public
as $$
#variable_conflict use_column
begin
  if coalesce(get_user_role(), '') not in ('ceo', 'agence') then raise exception 'acces_refuse' using errcode = '42501'; end if;
  if p_mode not in ('conference', 'entree') then raise exception 'mode_inconnu'; end if;

  return query
  with base as (
    select e.id, e.status, e.quiz_priorite, e.quiz_saisi_par, e.reinscrit_de, e.signal_jeu_ven,
           exists (select 1 from calls k
                   where (k.lead_id = e.id or (k.contact_id = e.contact_id and k.created_at >= e.created_at))
                     and k.status is distinct from 'annule') as a_rdv,
           v.n_ventes, v.ca
    from leads_enriched e
    join leads l on l.id = e.id
    left join lateral (select count(*) as n_ventes, sum(va.amount_ht) as ca
                       from marketing_ventes_attribuees va where va.lead_id = e.id) v on true
    where case p_mode when 'conference' then l.conference_date between p_debut and p_fin
                      else (e.created_at at time zone 'Europe/Paris')::date between p_debut and p_fin end
  ),
  axes as (
    select 'priorite'::text as axe,
           case when b.quiz_priorite is null then 'non_score'
                when b.quiz_saisi_par is not null then 'saisi_setter'
                else b.quiz_priorite end as cle, b.*
    from base b
    union all select 'tag', 'reinscrit', b.* from base b where b.reinscrit_de is not null
    union all select 'tag', 'jeu_ven', b.* from base b where b.signal_jeu_ven
    union all select 'total', 'total', b.* from base b
  )
  select a.axe, a.cle,
         count(*)::bigint,
         count(*) filter (where a.status in ('inscrit_conference', 'envoi_rediffusion', 'pas_de_reponse_post_conference', 'call_booke', 'close', 'renvoi_pole_vente'))::bigint,
         count(*) filter (where a.status = 'pas_qualifie')::bigint,
         count(*) filter (where a.status in ('pas_de_reponse', 'faux_numero'))::bigint,
         count(*) filter (where a.a_rdv)::bigint,
         count(*) filter (where a.n_ventes > 0)::bigint,
         round(coalesce(sum(a.ca), 0), 2)
  from axes a
  group by a.axe, a.cle;
end;
$$;
revoke all on function public.scoring_rapport(date, date, text) from public, anon;
grant execute on function public.scoring_rapport(date, date, text) to authenticated;
