-- ═══════════════════════════════════════════════════════════════════════
-- Relances : 2ᵉ passage en Relance 4, 5, 6, puis « Perdu »
-- (demande de Sabrina, décisions A1 · B1 · C1 validées par Sabrina et Sidali
-- le 15/10/2026).
--
-- LE PROBLÈME. Un lead recyclé après 3 relances sans réponse est redistribué
-- par Sabrina (souvent à un intermédiaire), qui refait Relance 1, 2, 3 puis
-- « Valider et recycler » : le lead revient dans « À recycler », sans fin.
--
-- LA RÈGLE (A1). Elle dépend de l'historique du lead, pas de la personne qui le
-- traite : un lead qui a déjà fait un passage « sans réponse » (recyclé en
-- « pas de réponse ») démarre son suivi à la Relance 4. Relance 6 faite → statut
-- « perdu » ; le lead reste à son commercial (C1). 6 relances au total, fini.
--
-- Le marqueur relance_passage_fait est persistant : la réattribution depuis
-- « À recycler » remet recycled_at à null (Leads.tsx), on ne peut donc pas
-- s'appuyer dessus. Il ne repasse jamais à false.
-- ═══════════════════════════════════════════════════════════════════════

-- ── 1. Le marqueur de 1er passage et les étapes 4 à 6 ─────────────────────
alter table public.leads
  add column if not exists relance_passage_fait boolean not null default false;
comment on column public.leads.relance_passage_fait is
  'Vrai si le lead a déjà fait un passage « sans réponse » (recyclé en pas de réponse) : son suivi de relance démarre alors à la Relance 4.';

alter table public.leads drop constraint if exists leads_relance_etape_check;
alter table public.leads
  add constraint leads_relance_etape_check check (relance_etape between 1 and 6);
comment on column public.leads.relance_etape is
  'Étape de relance d''une fiche « a_relancer » : 1 à 3 au 1er passage, 4 à 6 au 2e. N''avance que par marquer_relance_faite.';

-- ── 2. Le garde-fou ──────────────────────────────────────────────────────
create or replace function public.tg_leads_relance()
 returns trigger
 language plpgsql
 set search_path to 'public'
as $function$
begin
  -- un passage « sans réponse » est définitivement acquis
  if tg_op = 'UPDATE' then
    new.relance_passage_fait := new.relance_passage_fait or old.relance_passage_fait;
  end if;
  if new.status in ('pas_de_reponse', 'pas_de_reponse_post_conference') then
    new.relance_passage_fait := true;
  end if;

  if new.status is distinct from 'a_relancer' then
    new.relance_etape := null;
    new.relance_derniere_le := null;
  elsif tg_op = 'INSERT' or old.status is distinct from 'a_relancer' then
    -- entrée dans le process : Relance 1, ou Relance 4 au 2e passage
    new.relance_etape := case when new.relance_passage_fait then 4 else 1 end;
    new.relance_derniere_le := null;
  elsif coalesce(current_setting('albaraka.relance', true), '') <> 'marquer' then
    -- seule marquer_relance_faite fait avancer le compteur
    new.relance_etape := coalesce(old.relance_etape, case when new.relance_passage_fait then 4 else 1 end);
    new.relance_derniere_le := old.relance_derniere_le;
  end if;
  return new;
end;
$function$;

-- ── 3. « Relance faite » ─────────────────────────────────────────────────
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
  select id, status, assigned_to, apporteur_id,
         coalesce(relance_etape, case when relance_passage_fait then 4 else 1 end) as etape
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
  values (p_lead_id, v_caller, 'relance_faite', l.etape::text,
          case when l.etape not in (3, 6) then (l.etape + 1)::text end,
          'Relance ' || l.etape || ' faite' || coalesce(' — ' || v_note, ''));

  if l.etape not in (3, 6) then
    perform set_config('albaraka.relance', 'marquer', true);
    update leads set relance_etape = l.etape + 1, relance_derniere_le = v_now, updated_at = v_now
     where id = p_lead_id;
    perform set_config('albaraka.relance', '', true);
    return jsonb_build_object('ok', true, 'changed', true, 'etape', l.etape + 1, 'recycle', false, 'perdu', false);
  end if;

  if l.etape = 6 then
    -- Relance 6 faite : 6 relances sans réponse au total, le lead est perdu et
    -- reste à son commercial (décision C1)
    update leads set status = 'perdu', updated_at = v_now where id = p_lead_id;
    insert into lead_activities (lead_id, user_id, action, old_value, new_value, note)
    values (p_lead_id, v_caller, 'status_change', 'a_relancer', 'perdu', 'Perdu — 6 relances sans réponse');
    return jsonb_build_object('ok', true, 'changed', true, 'etape', null, 'recycle', false, 'perdu', true);
  end if;

  -- Relance 3 faite : le lead part au recyclage (son 1er passage est acquis)
  update leads
     set status = 'pas_de_reponse', assigned_to = null, assigned_at = null,
         recycled_at = v_now, relance_passage_fait = true, updated_at = v_now
   where id = p_lead_id;
  insert into lead_activities (lead_id, user_id, action, old_value, new_value)
  values (p_lead_id, v_caller, 'status_change', 'a_relancer', 'pas_de_reponse');
  insert into lead_activities (lead_id, user_id, action, note)
  values (p_lead_id, v_caller, 'recycled', 'Recyclage — 3 relances sans réponse');
  if l.assigned_to is not null then
    insert into lead_activities (lead_id, user_id, action, old_value, note)
    values (p_lead_id, v_caller, 'unassigned', l.assigned_to::text, 'Désaffecté automatiquement — 3 relances sans réponse');
  end if;
  return jsonb_build_object('ok', true, 'changed', true, 'etape', null, 'recycle', true, 'perdu', false);
end;
$function$;

revoke all on function public.marquer_relance_faite(uuid, smallint, text) from public, anon;
grant execute on function public.marquer_relance_faite(uuid, smallint, text) to authenticated;

-- ── 4. L'historique : qui a déjà fait un passage « sans réponse » ? ───────
-- Un lead déjà recyclé pour « pas de réponse » (y compris après conférence),
-- ou actuellement dans un de ces statuts. updated_at est remis à sa valeur :
-- rien n'a été « travaillé » sur ces fiches.
alter table public.leads disable trigger update_leads_updated_at;

update public.leads l
   set relance_passage_fait = true
 where not l.relance_passage_fait
   and (l.status in ('pas_de_reponse', 'pas_de_reponse_post_conference')
        or exists (select 1 from public.lead_activities a
                    where a.lead_id = l.id and a.action = 'recycled'
                      and (a.note ilike '%pas de r_ponse%' or a.note ilike '%pas_de_reponse%'
                           or a.note ilike '%relances sans r_ponse%')));

-- ── 5. Décision B1 : les leads en cours déjà recyclés passent au 2e passage ─
-- Relance 1 → 4 (et 2 → 5, 3 → 6 s'il y en a).
select set_config('albaraka.relance', 'marquer', true);
update public.leads
   set relance_etape = relance_etape + 3
 where status = 'a_relancer' and relance_passage_fait and relance_etape between 1 and 3;
select set_config('albaraka.relance', '', true);

alter table public.leads enable trigger update_leads_updated_at;
