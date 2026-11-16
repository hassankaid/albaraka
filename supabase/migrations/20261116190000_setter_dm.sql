-- Lead Setting DM et Setter DM (16/11/2026) — demande de Sidali du 12/11, réponses du 16/11.
--
-- Un lead de PUBLICITÉ perdu par un setter intermédiaire (ou arrivé au bout de la Relance 6
-- chez un intermédiaire ou un confirmé) part dans « Lead Setting DM » : Sidali et Sabrina
-- l'attribuent à un Setter DM (apporteur avec la case is_setter_dm), qui relance par message
-- (Contact DM1 → Relance DM1 → Relance DM2) jusqu'à « Inscrit conférence » ou « Perdu
-- définitivement » (terminal, seul le CEO le rouvre).
--
-- Droits sur les statuts (Sidali, 16/11) :
--   setter confirmé      : ni « Perdu » ni « Perdu définitivement » ;
--   setter intermédiaire : « Perdu » seulement ;
--   Setter DM            : « Perdu définitivement » seulement (+ les statuts DM) ;
--   CEO                  : tout.
-- Les leads d'apporteurs ne vont jamais chez les Setters DM (seulement la publicité).
-- Rémunération : 5 % « setter » au Setter DM qui a obtenu le contact (commission auto).

-- ── 1. Colonnes ────────────────────────────────────────────────────────────
alter table public.profiles
  add column if not exists is_setter_dm boolean not null default false,
  add column if not exists charte_dm_acceptee_le timestamptz;
comment on column public.profiles.is_setter_dm is 'Setter DM : reçoit des leads de « Lead Setting DM » et les relance par message (16/11/2026).';
comment on column public.profiles.charte_dm_acceptee_le is 'Charte de confidentialité Setter DM acceptée (obligatoire avant toute attribution).';

alter table public.leads
  add column if not exists dm_depuis timestamptz,
  add column if not exists dm_perdu_par uuid references public.profiles(id) on delete set null,
  add column if not exists dm_contact_reussi_par uuid references public.profiles(id) on delete set null,
  add column if not exists dm_contact_reussi_le timestamptz;
comment on column public.leads.dm_depuis is 'Entrée dans Lead Setting DM (relance par message).';
comment on column public.leads.dm_perdu_par is 'Setter qui avait perdu le lead avant son passage en DM.';
comment on column public.leads.dm_contact_reussi_par is 'Setter DM qui a obtenu le contact (Inscrit conférence, call…) : touche 5 % sur la vente.';
create index if not exists leads_dm_idx on public.leads (status, assigned_to) where dm_depuis is not null;

-- ── 2. Statuts ─────────────────────────────────────────────────────────────
alter table public.leads drop constraint if exists leads_status_check;
alter table public.leads add constraint leads_status_check check (status = any (array[
  'a_qualifier','faux_numero','pas_de_reponse','pas_de_reponse_post_conference','pas_qualifie',
  'a_relancer','perdu','inscrit_conference','call_booke','renvoi_pole_vente','close','envoi_rediffusion',
  'dm_a_contacter','contact_dm1','relance_dm1','relance_dm2','perdu_definitif']));

-- Statuts du parcours DM (le lead y est « chez les Setters DM »).
create or replace function public.statuts_dm() returns text[]
language sql immutable parallel safe as $$
  select array['dm_a_contacter','contact_dm1','relance_dm1','relance_dm2','perdu_definitif']::text[]
$$;

-- Un lead vient-il de la publicité ? (canal du groupe « ads » dans « Gérer les sources »)
create or replace function public.lead_est_pub(p_source text, p_detail text, p_utm text, p_app text, p_clic jsonb)
returns boolean language sql stable set search_path = public as $$
  select exists (select 1 from lead_attribution(p_source, p_detail, p_utm, p_app, p_clic) a
                   join lead_canaux c on c.cle = a.canal and c.groupe = 'ads')
$$;

-- ── 3. Profils : seuls le CEO et les fonctions du serveur changent les droits ─
-- Avant ce verrou, la règle « profiles_update_own » laissait chacun modifier TOUTE sa
-- ligne, rôle et droits compris (un apporteur pouvait se donner le rôle « ceo »).
create or replace function public.tg_profiles_droits() returns trigger
language plpgsql set search_path = public as $$
begin
  if auth.uid() is null
     or coalesce(current_setting('albaraka.systeme', true), '') = '1'
     or (select role from profiles where id = auth.uid()) = 'ceo' then
    return new;
  end if;
  if new.role is distinct from old.role
     or new.collaborateur_level is distinct from old.collaborateur_level
     or new.can_assign_leads is distinct from old.can_assign_leads
     or new.can_add_instagram_leads is distinct from old.can_add_instagram_leads
     or new.is_also_apporteur is distinct from old.is_also_apporteur
     or new.is_active is distinct from old.is_active
     or new.is_coach is distinct from old.is_coach
     or new.early_access is distinct from old.early_access
     or new.is_setter_dm is distinct from old.is_setter_dm
     or new.charte_dm_acceptee_le is distinct from old.charte_dm_acceptee_le then
    raise exception 'Seul le CEO peut modifier le rôle et les droits d''un compte.' using errcode = '42501';
  end if;
  return new;
end $$;
drop trigger if exists trg_profiles_droits on public.profiles;
create trigger trg_profiles_droits before update on public.profiles
  for each row execute function public.tg_profiles_droits();

-- ── 4. Leads : droits par niveau, bascule vers Lead Setting DM, contact réussi ─
create or replace function public.tg_leads_dm() returns trigger
language plpgsql set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_systeme boolean := coalesce(current_setting('albaraka.systeme', true), '') = '1';
  v_dm_auto boolean := coalesce(current_setting('albaraka.dm_auto', true), '') = '1';
  p record;
  v_dm text[] := public.statuts_dm();
begin
  select role, collaborateur_level, coalesce(is_setter_dm, false) as dm into p from profiles where id = v_uid;

  -- a) Droits sur les statuts (une personne qui agit, hors passage automatique)
  if new.status is distinct from old.status and v_uid is not null and not v_systeme
     and coalesce(p.role, '') <> 'ceo' then
    if old.status = 'perdu_definitif' then
      raise exception 'Ce lead est « Perdu définitivement » : seul le CEO peut le rouvrir.' using errcode = '42501';
    end if;
    if new.status = 'perdu' and (p.dm or (p.role = 'collaborateur' and p.collaborateur_level = 'confirme')) then
      raise exception 'Le statut « Perdu » est réservé aux setters intermédiaires.' using errcode = '42501';
    end if;
    if new.status = any (v_dm) and not p.dm then
      raise exception 'Les statuts DM sont réservés aux Setters DM.' using errcode = '42501';
    end if;
    if p.dm and old.dm_depuis is not null and new.status <> all (v_dm || array['inscrit_conference','pas_qualifie','faux_numero']) then
      raise exception 'Statut non prévu pour un lead DM.' using errcode = '42501';
    end if;
  end if;

  -- b) Un lead DM ne s'attribue qu'à un Setter DM (le CEO peut tout)
  if new.assigned_to is distinct from old.assigned_to and new.assigned_to is not null
     and new.status = any (v_dm) and coalesce(p.role, '') <> 'ceo' and not v_systeme
     and not exists (select 1 from profiles s where s.id = new.assigned_to and s.is_setter_dm) then
    raise exception 'Un lead de Lead Setting DM ne peut être attribué qu''à un Setter DM.' using errcode = '42501';
  end if;

  -- c) Bascule : « Perdu » d'un intermédiaire (ou fin de Relance 6) sur un lead de pub
  if new.status = 'perdu' and old.status is distinct from 'perdu' and new.dm_depuis is null
     and (v_dm_auto or (p.role = 'collaborateur' and p.collaborateur_level = 'intermediaire'))
     and public.lead_est_pub(new.source, new.source_detail, new.utm_source, new.app_origine, new.clic_pub)
     and not exists (select 1 from sales s where s.contact_id = new.contact_id) then
    new.dm_perdu_par := coalesce(old.assigned_to, v_uid);
    new.dm_depuis := now();
    new.status := 'dm_a_contacter';
    new.assigned_to := null;
    new.assigned_at := null;
    new.recycled_at := null;  -- pas dans « À recycler » : dans Lead Setting DM
    insert into lead_activities (lead_id, user_id, action, old_value, new_value, note)
    values (new.id, coalesce(v_uid, old.assigned_to, (select id from profiles where role = 'ceo' order by created_at limit 1)),
            'dm_bascule', 'perdu', 'dm_a_contacter',
            'Envoyé dans Lead Setting DM (relance par message)');
  end if;

  -- d) Contact obtenu par le Setter DM : il touchera 5 % si la personne achète
  if new.dm_depuis is not null and new.dm_contact_reussi_par is null
     and old.status in ('contact_dm1', 'relance_dm1', 'relance_dm2')
     and new.status in ('inscrit_conference', 'envoi_rediffusion', 'call_booke', 'renvoi_pole_vente', 'close')
     and exists (select 1 from profiles s where s.id = old.assigned_to and s.is_setter_dm) then
    new.dm_contact_reussi_par := old.assigned_to;
    new.dm_contact_reussi_le := now();
  end if;
  return new;
end $$;
drop trigger if exists trg_leads_dm on public.leads;
create trigger trg_leads_dm before update on public.leads
  for each row execute function public.tg_leads_dm();

-- ── 5. Attribution par lots (Sidali, Sabrina) ──────────────────────────────
create or replace function public.attribuer_leads_dm(p_lead_ids uuid[], p_setter uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  s record;
  v_n int := 0;
  r record;
begin
  if not public.can_assign_leads_now() then
    raise exception 'Seuls Sidali et Sabrina attribuent les leads DM.' using errcode = '42501';
  end if;
  select id, full_name, is_active, is_setter_dm, charte_dm_acceptee_le into s from profiles where id = p_setter;
  if not found or not s.is_setter_dm or not s.is_active then
    raise exception 'Cette personne n''est pas un Setter DM actif.';
  end if;
  if s.charte_dm_acceptee_le is null then
    raise exception '% n''a pas encore accepté la charte de confidentialité : il la verra en ouvrant « Mes leads ».', s.full_name;
  end if;
  for r in select id, assigned_to from leads
            where id = any (p_lead_ids) and status = any (array['dm_a_contacter','contact_dm1','relance_dm1','relance_dm2'])
            for update loop
    continue when r.assigned_to = p_setter;
    update leads set assigned_to = p_setter, assigned_at = now(), updated_at = now() where id = r.id;
    insert into lead_activities (lead_id, user_id, action, old_value, new_value, note)
    values (r.id, v_uid, case when r.assigned_to is null then 'assigned' else 'reassigned' end,
            r.assigned_to::text, p_setter::text, 'Attribué au Setter DM ' || s.full_name);
    v_n := v_n + 1;
  end loop;
  if v_n > 0 then
    insert into notifications (user_id, type, title, body, link, metadata)
    values (p_setter, 'leads_dm_affectes',
            case when v_n = 1 then '1 nouveau lead à contacter' else v_n || ' nouveaux leads à contacter' end,
            'Ils t''attendent dans « Mes leads », onglet « Mes leads à traiter ».',
            '/my-space/leads', jsonb_build_object('nombre', v_n, 'par', v_uid));
  end if;
  return jsonb_build_object('ok', true, 'attribues', v_n);
end $$;
revoke all on function public.attribuer_leads_dm(uuid[], uuid) from public, anon;
grant execute on function public.attribuer_leads_dm(uuid[], uuid) to authenticated;

-- ── 6. Charte de confidentialité du Setter DM ──────────────────────────────
create or replace function public.accepter_charte_dm() returns timestamptz
language plpgsql security definer set search_path = public as $$
declare v_le timestamptz := now();
begin
  if not exists (select 1 from profiles where id = auth.uid() and is_setter_dm) then
    raise exception 'Réservé aux Setters DM.';
  end if;
  perform set_config('albaraka.systeme', '1', true);
  update profiles set charte_dm_acceptee_le = coalesce(charte_dm_acceptee_le, v_le) where id = auth.uid()
  returning charte_dm_acceptee_le into v_le;
  perform set_config('albaraka.systeme', '', true);
  return v_le;
end $$;
revoke all on function public.accepter_charte_dm() from public, anon;
grant execute on function public.accepter_charte_dm() to authenticated;

-- ── 7. 5 % au Setter DM qui a obtenu le contact ────────────────────────────
create or replace function public.tg_commission_setter_dm() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_sale record;
  v_setter uuid;
begin
  select id, contact_id, coalesce(sold_at, created_at) as le into v_sale from sales where id = new.sale_id;
  if v_sale.contact_id is null then
    return new;
  end if;
  select l.dm_contact_reussi_par into v_setter
    from leads l
   where l.contact_id = v_sale.contact_id and l.dm_contact_reussi_par is not null
     and l.dm_contact_reussi_le <= v_sale.le + interval '1 day'
   order by l.dm_contact_reussi_le desc limit 1;
  if v_setter is null or exists (select 1 from commissions c where c.payment_id = new.id
                                   and c.beneficiary_user_id = v_setter and c.role = 'setter') then
    return new;
  end if;
  insert into commissions (sale_id, payment_id, beneficiary_user_id, percentage, amount, role, status)
  values (new.sale_id, new.id, v_setter, 5, 0, 'setter', case when new.status = 'paid' then 'due' else 'pending' end);
  perform rebalance_commission_group(new.sale_id, v_setter, null, 'setter');
  return new;
end $$;
drop trigger if exists trg_commission_setter_dm on public.payments;
create trigger trg_commission_setter_dm after insert on public.payments
  for each row execute function public.tg_commission_setter_dm();

-- ── 8. Fonctions et droits existants, adaptés au parcours DM ──
-- Nouvelle fiche d'un contact : jamais reprise par le Setter DM d'une fiche « Perdu définitivement »
CREATE OR REPLACE FUNCTION public.auto_assign_new_lead_to_contact_collab()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
declare
  v_dernier         uuid;
  v_dernier_actif   boolean;
  v_existing_assignee uuid;
  v_has_recycled    boolean;
  v_inherit_source  text;
begin
  if new.assigned_to is not null then
    return new;
  end if;

  -- Regle 1 : le commercial de la fiche la plus recente du contact.
  -- Un profil introuvable compte comme inactif : on n'affecte pas a un fantome.
  select l.assigned_to, coalesce(p.is_active, false)
    into v_dernier, v_dernier_actif
  from leads l
  left join profiles p on p.id = l.assigned_to
  where l.contact_id = new.contact_id
    and l.assigned_to is not null
    and l.recycled_at is null
    -- Setter DM (16/11/2026) : une fiche « Perdu définitivement » ne transmet pas son commercial
    and l.status <> 'perdu_definitif'
  order by l.assigned_at desc nulls last, l.created_at desc
  limit 1;

  if v_dernier is not null then
    -- Actif : on garde la continuite. Inactif : la personne part dans les leads
    -- a traiter, et on ne consulte PAS les appels — ils servent aux contacts
    -- qui n'ont jamais eu de commercial, pas a contourner un desactive.
    if v_dernier_actif then
      new.assigned_to := v_dernier;
      new.assigned_at := now();
      v_inherit_source := 'lead';
    end if;
  else
    -- Regle 2 : reset volontaire detecte -> ne pas heriter du call
    select exists(
      select 1 from leads
      where contact_id = new.contact_id and recycled_at is not null
    ) into v_has_recycled;

    if not v_has_recycled then
      -- Regle 3 : l'hote du dernier appel non annule, s'il est actif.
      select k.assigned_to into v_existing_assignee
      from calls k
      join profiles p on p.id = k.assigned_to and p.is_active
      where k.contact_id = new.contact_id
        and k.assigned_to is not null
        and k.status is distinct from 'cancelled'
      order by k.scheduled_at desc nulls last, k.created_at desc
      limit 1;

      if v_existing_assignee is not null then
        new.assigned_to := v_existing_assignee;
        new.assigned_at := now();
        v_inherit_source := 'call';
      end if;
    end if;
  end if;

  -- Regle 4 (depuis le 2026-05-18) : lead apporte et toujours sans titulaire
  -- -> l'apporteur, s'il est actif. Le cron hebdomadaire le liberera vers le
  -- pool s'il reste 'a_qualifier' apres sa semaine.
  if new.assigned_to is null
     and new.apporteur_id is not null
     and now() >= timestamptz '2026-05-18 00:00:00+02'
     and exists (select 1 from profiles p where p.id = new.apporteur_id and p.is_active) then
    new.assigned_to := new.apporteur_id;
    new.assigned_at := now();
    v_inherit_source := 'apporteur';
  end if;

  if new.assigned_to is not null and v_inherit_source is not null then
    perform set_config(
      'app.auto_assign_inherit_source',
      new.id::text || ':' || v_inherit_source,
      true
    );
  end if;

  return new;
end;
$function$;
-- Call réservé : « Perdu définitivement » ne bouge pas
CREATE OR REPLACE FUNCTION public.update_leads_on_call_created()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- Met à jour tous les leads du contact en 'call_booke'
  UPDATE public.leads
  SET 
    status = 'call_booke',
    assigned_to = CASE 
      WHEN assigned_to IS NULL THEN NEW.assigned_to 
      ELSE assigned_to 
    END,
    assigned_at = CASE 
      WHEN assigned_to IS NULL THEN NOW() 
      ELSE assigned_at 
    END,
    updated_at = NOW()
  WHERE contact_id = NEW.contact_id
  AND status NOT IN ('close', 'perdu', 'perdu_definitif');  -- « Perdu définitivement » ne revient jamais (16/11/2026)
  
  RETURN NEW;
END;
$function$;
-- Propagation d'attribution entre fiches : jamais vers ou depuis un lead DM
CREATE OR REPLACE FUNCTION public.propagate_lead_assignment_to_siblings()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  r RECORD;
BEGIN
  -- Setter DM (16/11/2026) : un lead DM ne propage rien, et ne se fait pas prendre par propagation
  IF NEW.status = ANY (public.statuts_dm()) THEN
    RETURN NULL;
  END IF;
  FOR r IN
    SELECT id FROM leads
    WHERE contact_id = NEW.contact_id
      AND id <> NEW.id
      AND assigned_to IS NULL
      AND recycled_at IS NULL
      AND status <> ALL (public.statuts_dm())
    FOR UPDATE
  LOOP
    UPDATE leads
    SET assigned_to = NEW.assigned_to,
        assigned_at = now(),
        updated_at  = now()
    WHERE id = r.id;

    INSERT INTO lead_activities (lead_id, user_id, action, new_value, note)
    VALUES (
      r.id,
      NEW.assigned_to,
      'assigned',
      NEW.assigned_to::text,
      'Auto-assigné par cohérence : un autre lead du contact vient d''être pris par ce collaborateur'
    );
  END LOOP;

  RETURN NULL;
END;
$function$;
-- Relance 6 : bascule DM pour la publicité
CREATE OR REPLACE FUNCTION public.marquer_relance_faite(p_lead_id uuid, p_etape smallint, p_note text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    -- reste à son commercial (décision C1). Setter DM (16/11/2026) : un lead de
    -- publicité d'un setter intermédiaire ou confirmé part dans Lead Setting DM
    -- (bascule faite par tg_leads_dm) ; « systeme » : les confirmés n'ont plus
    -- le droit de mettre « Perdu » eux-mêmes.
    perform set_config('albaraka.systeme', '1', true);
    if exists (select 1 from profiles p where p.id = l.assigned_to and p.role = 'collaborateur'
                and p.collaborateur_level in ('intermediaire', 'confirme')) then
      perform set_config('albaraka.dm_auto', '1', true);
    end if;
    update leads set status = 'perdu', updated_at = v_now where id = p_lead_id;
    perform set_config('albaraka.systeme', '', true);
    perform set_config('albaraka.dm_auto', '', true);
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
-- Statuts DM acceptés par la fonction des apporteurs (droits fins dans tg_leads_dm)
CREATE OR REPLACE FUNCTION public.apporteur_update_lead_status(p_lead_id uuid, p_new_status text, p_note text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_caller uuid := auth.uid();
  v_caller_role text;
  v_lead_apporteur uuid;
  v_lead_assignee uuid;
  v_old_status text;
  v_now timestamptz := now();
  v_allowed_statuses text[] := ARRAY[
    'a_qualifier',
    'inscrit_conference',
    'envoi_rediffusion',
    'faux_numero',
    'pas_qualifie',
    'a_relancer',
    'perdu',
    'call_booke',
    'close',
    'pas_de_reponse',
    'pas_de_reponse_post_conference',
    -- Setter DM (16/11/2026) : les droits fins (qui peut quoi) sont vérifiés par tg_leads_dm
    'dm_a_contacter',
    'contact_dm1',
    'relance_dm1',
    'relance_dm2',
    'perdu_definitif'
  ];
  v_instant_recycle_statuses text[] := ARRAY[
    'pas_de_reponse',
    'pas_de_reponse_post_conference'
  ];
  v_should_recycle boolean;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;

  SELECT role INTO v_caller_role FROM profiles WHERE id = v_caller;
  IF v_caller_role NOT IN ('apporteur', 'collaborateur') THEN
    RAISE EXCEPTION 'Cette fonction est réservée aux apporteurs et collaborateurs (rôle actuel: %)', v_caller_role;
  END IF;

  IF NOT (p_new_status = ANY(v_allowed_statuses)) THEN
    RAISE EXCEPTION 'Statut "%" non autorisé. Statuts permis: %',
      p_new_status, array_to_string(v_allowed_statuses, ', ');
  END IF;

  SELECT apporteur_id, status, assigned_to INTO v_lead_apporteur, v_old_status, v_lead_assignee
  FROM leads
  WHERE id = p_lead_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lead introuvable';
  END IF;

  -- Règle d'autorisation durcie (anti double-saisie) :
  --   - Caller assigné au lead → OK (il est en charge du traitement)
  --   - Caller apporteur ET lead non assigné → OK (personne ne traite encore)
  --   - Sinon (apporteur d'un lead assigné ailleurs) → bloqué
  IF NOT (
    v_lead_assignee = v_caller
    OR (v_lead_assignee IS NULL AND v_lead_apporteur = v_caller)
  ) THEN
    IF v_lead_apporteur = v_caller AND v_lead_assignee IS NOT NULL THEN
      RAISE EXCEPTION 'Ce lead est en cours de traitement par un autre collaborateur. Tu ne peux pas modifier son statut pour éviter d''écraser son travail.';
    ELSE
      RAISE EXCEPTION 'Vous ne pouvez modifier que les leads qui vous sont affectés (ou que vous avez apportés et qui ne sont pas encore assignés).';
    END IF;
  END IF;

  IF v_old_status = p_new_status AND (p_note IS NULL OR length(trim(p_note)) = 0) THEN
    RETURN jsonb_build_object('ok', true, 'changed', false, 'lead_id', p_lead_id, 'status', p_new_status);
  END IF;

  v_should_recycle := p_new_status = ANY(v_instant_recycle_statuses);

  IF v_should_recycle THEN
    UPDATE leads SET status = p_new_status, assigned_to = NULL, assigned_at = NULL, recycled_at = v_now, updated_at = v_now WHERE id = p_lead_id;
  ELSE
    UPDATE leads SET status = p_new_status, updated_at = v_now WHERE id = p_lead_id;
  END IF;

  IF v_old_status IS DISTINCT FROM p_new_status THEN
    INSERT INTO lead_activities (lead_id, user_id, action, old_value, new_value, note)
    VALUES (
      p_lead_id, v_caller, 'status_change', v_old_status, p_new_status,
      CASE WHEN p_note IS NOT NULL AND length(trim(p_note)) > 0
        THEN 'Modification — ' || trim(p_note)
        ELSE 'Modification'
      END
    );
  ELSIF p_note IS NOT NULL AND length(trim(p_note)) > 0 THEN
    INSERT INTO lead_activities (lead_id, user_id, action, note)
    VALUES (p_lead_id, v_caller, 'note_added', 'Note — ' || trim(p_note));
  END IF;

  IF v_should_recycle THEN
    IF v_lead_assignee IS NOT NULL THEN
      INSERT INTO lead_activities (lead_id, user_id, action, old_value, note)
      VALUES (p_lead_id, v_caller, 'unassigned', v_lead_assignee::text, 'Désaffecté automatiquement suite au statut "' || p_new_status || '"');
    END IF;
    INSERT INTO lead_activities (lead_id, user_id, action, note)
    VALUES (p_lead_id, v_caller, 'recycled', 'Recyclage instantané — statut "' || p_new_status || '"');
  END IF;

  RETURN jsonb_build_object('ok', true, 'changed', true, 'recycled', v_should_recycle, 'lead_id', p_lead_id, 'old_status', v_old_status, 'new_status', p_new_status);
END;
$function$;
-- Les setters confirmés ne voient pas les leads de Lead Setting DM dans « À affecter »
alter policy leads_select_collab_confirmed on public.leads using (((( SELECT get_user_role() AS get_user_role) = 'collaborateur'::text) AND ((assigned_to = ( SELECT auth.uid() AS uid)) OR ((assigned_to IS NULL) AND (recycled_at IS NULL) AND (status <> ALL (public.statuts_dm())) AND (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.collaborateur_level = 'confirme'::text))))))));
alter policy leads_update_team on public.leads using ((( SELECT can_assign_leads_now() AS can_assign_leads_now) OR ((( SELECT get_user_role() AS get_user_role) = 'collaborateur'::text) AND ((assigned_to = ( SELECT auth.uid() AS uid)) OR ((assigned_to IS NULL) AND (recycled_at IS NULL) AND (status <> ALL (public.statuts_dm())) AND (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.collaborateur_level = 'confirme'::text))))))) OR ((( SELECT get_user_role() AS get_user_role) = 'apporteur'::text) AND ((apporteur_id = ( SELECT auth.uid() AS uid)) OR (assigned_to = ( SELECT auth.uid() AS uid))))));
-- Vues : colonnes DM + exclusion de Lead Setting DM pour les confirmés
create or replace view public.leads_enriched_base as
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
            WHEN (contact_call.id IS NOT NULL) THEN true
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
            WHEN (scoring.id IS NOT NULL) THEN true
            ELSE false
        END AS quiz_filled,
    any_call.id AS any_call_id,
    any_call.scheduled_at AS any_call_scheduled_at,
    any_call.status AS any_call_status,
        CASE
            WHEN (any_call.id IS NOT NULL) THEN true
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
    ((EXTRACT(isodow FROM (l.created_at AT TIME ZONE 'Europe/Paris'::text)))::integer = ANY (COALESCE(( SELECT r.jours_jeu_ven
           FROM scoring_reglages r), '{}'::integer[]))) AS signal_jeu_ven,
    l.dm_depuis,
    l.dm_perdu_par,
    ( SELECT pp.full_name FROM profiles pp WHERE pp.id = l.dm_perdu_par) AS dm_perdu_par_name,
    l.dm_contact_reussi_par,
    (EXISTS ( SELECT 1 FROM leads x WHERE x.contact_id = l.contact_id AND x.id <> l.id AND x.status = 'perdu_definitif'::text)) AS contact_deja_perdu_dm
   FROM (((((((((leads l
     LEFT JOIN contacts c ON ((l.contact_id = c.id)))
     LEFT JOIN profiles ap ON ((l.apporteur_id = ap.id)))
     LEFT JOIN profiles ass ON ((l.assigned_to = ass.id)))
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
          WHERE ((calls.contact_id = l.contact_id) AND (calls.status = 'planifie'::text) AND (calls.scheduled_at > now()))
          ORDER BY calls.scheduled_at
         LIMIT 1) contact_call ON (true))
     LEFT JOIN profiles contact_call_host ON ((contact_call.assigned_to = contact_call_host.id)))
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
          WHERE ((lsr.lead_id = l.id) OR (lower(lsr.contact_email) = lower(c.email)))
          ORDER BY lsr.completed_at DESC NULLS LAST, lsr.created_at DESC
         LIMIT 1) scoring ON (true))
     LEFT JOIN LATERAL ( SELECT ca.id,
            ca.scheduled_at,
            ca.status
           FROM calls ca
          WHERE (ca.contact_id = l.contact_id)
          ORDER BY ca.scheduled_at DESC NULLS LAST, ca.created_at DESC
         LIMIT 1) any_call ON (true))
     LEFT JOIN LATERAL lead_attribution(l.source, l.source_detail, l.utm_source, l.app_origine, l.clic_pub) attr(canal, tunnel, canal_precision) ON (true))
     LEFT JOIN LATERAL ( SELECT p.id
           FROM leads p
          WHERE ((p.contact_id = l.contact_id) AND (p.id <> l.id) AND (p.created_at < l.created_at) AND (p.created_at >= (l.created_at - '30 days'::interval)) AND (((p.created_at AT TIME ZONE 'Europe/Paris'::text))::date < ((l.created_at AT TIME ZONE 'Europe/Paris'::text))::date))
          ORDER BY p.created_at DESC
         LIMIT 1) reinscription ON (true));
create or replace view public.leads_enriched as
 SELECT id,
    contact_id,
    source,
    source_detail,
    apporteur_id,
    assigned_to,
    assigned_at,
    status,
    call_type,
    systeme_io_id,
    created_at,
    updated_at,
    raw_full_name,
    raw_email,
    raw_phone,
    notes,
    contact_email,
    contact_phone,
    contact_full_name,
    apporteur_name,
    assigned_to_name,
    contact_call_id,
    contact_call_scheduled_at,
    contact_call_status,
    contact_call_event_type,
    contact_call_assigned_to,
    contact_call_assigned_to_name,
    has_active_call,
    source_label,
    status_label,
    recycled_at,
    quiz_score,
    quiz_category,
    quiz_flags,
    quiz_completed_at,
    quiz_answers,
    quiz_filled,
    any_call_id,
    any_call_scheduled_at,
    any_call_status,
    has_any_call,
    auto_released_at,
    relance_etape,
    relance_derniere_le,
    premiere_action_le,
    canal,
    tunnel,
    canal_precision,
    quiz_score_100,
    quiz_priorite,
    quiz_grille_version,
    quiz_saisi_par,
    reinscrit_de,
    signal_jeu_ven,
    dm_depuis,
    dm_perdu_par,
    dm_perdu_par_name,
    dm_contact_reussi_par,
    contact_deja_perdu_dm
   FROM leads_enriched_base b
  WHERE ((CURRENT_USER = ANY (ARRAY['postgres'::name, 'service_role'::name, 'supabase_admin'::name])) OR (( SELECT get_user_role() AS get_user_role) = ANY (ARRAY['ceo'::text, 'agence'::text])) OR ( SELECT can_assign_leads_now() AS can_assign_leads_now) OR (apporteur_id = ( SELECT auth.uid() AS uid)) OR ((( SELECT get_user_role() AS get_user_role) = 'apporteur'::text) AND ((apporteur_id = ( SELECT auth.uid() AS uid)) OR (assigned_to = ( SELECT auth.uid() AS uid)))) OR ((( SELECT get_user_role() AS get_user_role) = 'collaborateur'::text) AND ((assigned_to = ( SELECT auth.uid() AS uid)) OR ((assigned_to IS NULL) AND (recycled_at IS NULL) AND (status <> ALL (public.statuts_dm())) AND (EXISTS ( SELECT 1
           FROM profiles p
          WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.collaborateur_level = 'confirme'::text))))))));

-- ── 9. Reprise de l'historique (Sidali, 16/11 : « on reprend les leads issus de la publicité ») ─
-- Leads « Perdu » de publicité perdus par un setter (collaborateur ou apporteur), une seule
-- fiche par personne (la plus récente), sauf si la personne a acheté depuis ou est de nouveau
-- suivie sur une autre fiche. Les « Perdu » posés par le CEO restent tels quels.
select set_config('albaraka.systeme', '1', true);
with base as (
  select l.id, l.contact_id, l.assigned_to, l.created_at
    from leads l
    join profiles p on p.id = l.assigned_to and p.role in ('collaborateur', 'apporteur')
   where l.status = 'perdu'
     and public.lead_est_pub(l.source, l.source_detail, l.utm_source, l.app_origine, l.clic_pub)
), retenus as (
  select b.*, row_number() over (partition by b.contact_id order by b.created_at desc) rn
    from base b
   where not exists (select 1 from sales s where s.contact_id = b.contact_id)
     and not exists (select 1 from leads o where o.contact_id = b.contact_id and o.id <> b.id
                      and o.created_at > b.created_at
                      and o.status not in ('perdu','faux_numero','pas_qualifie','pas_de_reponse','pas_de_reponse_post_conference'))
), maj as (
  update leads l
     set status = 'dm_a_contacter', dm_depuis = now(), dm_perdu_par = r.assigned_to,
         assigned_to = null, assigned_at = null, recycled_at = null, updated_at = now()
    from retenus r
   where r.id = l.id and r.rn = 1
  returning l.id
)
insert into lead_activities (lead_id, user_id, action, old_value, new_value, note)
select id, (select id from profiles where role = 'ceo' order by created_at limit 1), 'dm_bascule', 'perdu', 'dm_a_contacter', 'Reprise dans Lead Setting DM (leads de publicité déjà perdus, décision de Sidali du 16/11/2026)'
  from maj;
select set_config('albaraka.systeme', '', true);
