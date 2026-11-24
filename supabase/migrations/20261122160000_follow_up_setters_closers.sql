-- ─────────────────────────────────────────────────────────────────────────
-- Follow-up des setters et des closers (demande de Sabrina du 21/11/2026).
--
-- Constat : les leads « intéressés mais paiement en fin de mois » finissaient dans
-- « À relancer » (circuit des injoignables : Relance 1→3 puis recyclage), et les
-- 55 calls « Follow up » des closers n'avaient pas de date (écrite à la main dans
-- les notes, sans rappel ni tri).
--
--   1. Leads : statut « follow_up » + date de relance obligatoire + motif. Hors du
--      circuit des relances (pas de compteur, pas de recyclage automatique).
--   2. Calls : date de relance sur les calls « Follow up ».
--   3. Suivis sans RDV des closers : table à part `suivis_closer`. Ce ne sont PAS
--      des calls : aucune statistique de calls (calls tenus, closing, conférence)
--      n'est touchée.
--   4. notifier_follow_ups() : la notification du jour J (planifiée à la mise en
--      ligne, après validation de Sabrina).
-- ─────────────────────────────────────────────────────────────────────────

-- 1. Leads ──────────────────────────────────────────────────────────────────
alter table public.leads drop constraint if exists leads_status_check;
alter table public.leads add constraint leads_status_check check (status = any (array[
  'a_qualifier','faux_numero','pas_de_reponse','pas_de_reponse_post_conference','pas_qualifie','a_relancer',
  'perdu','inscrit_conference','call_booke','renvoi_pole_vente','close','envoi_rediffusion',
  'dm_a_contacter','contact_dm1','relance_dm1','relance_dm2','perdu_definitif','follow_up']));

alter table public.leads
  add column if not exists follow_up_le date,
  add column if not exists follow_up_motif text;

alter table public.leads drop constraint if exists leads_follow_up_date_check;
alter table public.leads add constraint leads_follow_up_date_check
  check (status <> 'follow_up' or follow_up_le is not null);

-- En quittant le follow-up, la date et le motif s'effacent (l'historique les garde).
create or replace function public.tg_leads_follow_up()
returns trigger language plpgsql set search_path to 'public' as $$
begin
  if new.status is distinct from 'follow_up' then
    new.follow_up_le := null;
    new.follow_up_motif := null;
  end if;
  return new;
end $$;

drop trigger if exists trg_leads_follow_up on public.leads;
create trigger trg_leads_follow_up before insert or update of status, follow_up_le, follow_up_motif on public.leads
  for each row execute function public.tg_leads_follow_up();

create index if not exists leads_follow_up_le_idx on public.leads (follow_up_le) where status = 'follow_up';

-- 2. Calls ──────────────────────────────────────────────────────────────────
alter table public.calls add column if not exists follow_up_le date;
create index if not exists calls_follow_up_le_idx on public.calls (follow_up_le) where status = 'follow_up';

-- 3. Suivis sans RDV des closers ─────────────────────────────────────────────
create table if not exists public.suivis_closer (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references public.leads(id) on delete cascade,
  contact_id uuid references public.contacts(id) on delete set null,
  closer_id uuid not null references public.profiles(id),
  le date not null,
  note text,
  statut text not null default 'ouvert' check (statut in ('ouvert', 'fait', 'annule')),
  cree_le timestamptz not null default now(),
  cree_par uuid references public.profiles(id),
  fait_le timestamptz
);
create index if not exists suivis_closer_closer_idx on public.suivis_closer (closer_id, le) where statut = 'ouvert';

alter table public.suivis_closer enable row level security;
drop policy if exists suivis_closer_select on public.suivis_closer;
create policy suivis_closer_select on public.suivis_closer for select
  using (closer_id = (select auth.uid()) or (select public.get_user_role()) = 'ceo');
drop policy if exists suivis_closer_update on public.suivis_closer;
create policy suivis_closer_update on public.suivis_closer for update
  using (closer_id = (select auth.uid()) or (select public.get_user_role()) = 'ceo')
  with check (closer_id = (select auth.uid()) or (select public.get_user_role()) = 'ceo');
-- pas d'insertion directe : passer par ajouter_suivi_closer()

-- 4. Passage d'un lead en follow-up (setter, CEO, apporteur propriétaire) ─────
create or replace function public.mettre_en_follow_up(p_lead_id uuid, p_le date, p_motif text, p_note text default null)
returns void language plpgsql security definer set search_path to 'public' as $$
declare
  v_uid uuid := auth.uid();
  v_role text := coalesce(public.get_user_role(), '');
  l record;
  v_aujourdhui date := (now() at time zone 'Europe/Paris')::date;
  v_texte text;
begin
  if v_uid is null then raise exception 'Connexion requise'; end if;
  if p_le is null or p_le < v_aujourdhui then raise exception 'Choisis une date de relance à partir d''aujourd''hui.'; end if;
  select id, status, assigned_to, apporteur_id, follow_up_le into l from public.leads where id = p_lead_id for update;
  if not found then raise exception 'Lead introuvable'; end if;
  if not (v_role = 'ceo' or l.assigned_to = v_uid or (l.apporteur_id = v_uid and l.assigned_to is null)) then
    raise exception 'Seule la personne qui suit ce lead peut le mettre en follow-up.' using errcode = '42501';
  end if;

  update public.leads
     set status = 'follow_up', follow_up_le = p_le, follow_up_motif = nullif(btrim(p_motif), ''), updated_at = now()
   where id = p_lead_id;

  v_texte := 'Follow-up le ' || to_char(p_le, 'DD/MM/YYYY')
             || coalesce(' · ' || nullif(btrim(p_motif), ''), '')
             || coalesce(' — ' || nullif(btrim(p_note), ''), '');
  insert into public.lead_activities (lead_id, user_id, action, old_value, new_value, note)
  values (p_lead_id, v_uid,
          case when l.status = 'follow_up' then 'follow_up_reporte' else 'status_change' end,
          case when l.status = 'follow_up' then to_char(l.follow_up_le, 'YYYY-MM-DD') else l.status end,
          case when l.status = 'follow_up' then to_char(p_le, 'YYYY-MM-DD') else 'follow_up' end,
          v_texte);
end $$;
revoke all on function public.mettre_en_follow_up(uuid, date, text, text) from public, anon;
grant execute on function public.mettre_en_follow_up(uuid, date, text, text) to authenticated;

-- 5. Suivi sans RDV d'un closer ──────────────────────────────────────────────
create or replace function public.ajouter_suivi_closer(p_lead_id uuid, p_le date, p_note text default null)
returns uuid language plpgsql security definer set search_path to 'public' as $$
declare
  v_uid uuid := auth.uid();
  v_role text := coalesce(public.get_user_role(), '');
  l record;
  v_id uuid;
  v_nom text;
  v_closer text;
begin
  if v_uid is null then raise exception 'Connexion requise'; end if;
  if v_role not in ('ceo', 'collaborateur') then
    raise exception 'Réservé aux closers.' using errcode = '42501';
  end if;
  if p_le is null or p_le < (now() at time zone 'Europe/Paris')::date then
    raise exception 'Choisis une date de relance à partir d''aujourd''hui.';
  end if;
  select ld.id, ld.contact_id, ld.assigned_to, ld.raw_full_name into l from public.leads ld where ld.id = p_lead_id;
  if not found then raise exception 'Lead introuvable'; end if;

  insert into public.suivis_closer (lead_id, contact_id, closer_id, le, note, cree_par)
  values (l.id, l.contact_id, v_uid, p_le, nullif(btrim(p_note), ''), v_uid)
  returning id into v_id;

  select full_name into v_closer from public.profiles where id = v_uid;
  insert into public.lead_activities (lead_id, user_id, action, new_value, note)
  values (l.id, v_uid, 'suivi_closer', to_char(p_le, 'YYYY-MM-DD'),
          'Ajouté aux follow-up de ' || coalesce(v_closer, 'un closer') || ' pour le ' || to_char(p_le, 'DD/MM/YYYY')
          || coalesce(' — ' || nullif(btrim(p_note), ''), ''));

  -- le setter qui suivait le lead est prévenu
  if l.assigned_to is not null and l.assigned_to <> v_uid then
    select coalesce(nullif(btrim(c.full_name), ''), l.raw_full_name, 'un lead') into v_nom
      from (select 1) x left join public.contacts c on c.id = l.contact_id;
    insert into public.notifications (user_id, type, title, body, link, metadata)
    values (l.assigned_to, 'suivi_closer', 'Lead suivi par un closer : ' || v_nom,
            coalesce(v_closer, 'Un closer') || ' le recontacte le ' || to_char(p_le, 'DD/MM/YYYY') || '.',
            null, jsonb_build_object('lead_id', l.id, 'suivi_id', v_id));
  end if;
  return v_id;
end $$;
revoke all on function public.ajouter_suivi_closer(uuid, date, text) from public, anon;
grant execute on function public.ajouter_suivi_closer(uuid, date, text) to authenticated;

-- 6. Notifications du jour J (et du retard de 7 jours) ────────────────────────
create or replace function public.notifier_follow_ups()
returns integer language plpgsql security definer set search_path to 'public' as $$
declare
  v_jour date := (now() at time zone 'Europe/Paris')::date;
  v_n integer := 0;
  v_k integer;
begin
  -- leads des setters
  insert into public.notifications (user_id, type, title, body, link, metadata)
  select coalesce(ld.assigned_to, (select id from public.profiles where role = 'ceo' order by created_at limit 1)),
         'follow_up_jour',
         'Follow-up aujourd''hui : ' || coalesce(nullif(btrim(c.full_name), ''), ld.raw_full_name, 'un lead'),
         coalesce(ld.follow_up_motif, 'Relance prévue aujourd''hui') || '.',
         '/leads?q=' || replace(coalesce(ld.raw_phone, c.phone_normalized, ''), '+', '%2B'),
         jsonb_build_object('lead_id', ld.id, 'jour', v_jour)
    from public.leads ld left join public.contacts c on c.id = ld.contact_id
   where ld.status = 'follow_up' and ld.follow_up_le = v_jour
     and not exists (select 1 from public.notifications n where n.type = 'follow_up_jour'
                      and n.metadata->>'lead_id' = ld.id::text and n.metadata->>'jour' = v_jour::text);
  get diagnostics v_k = row_count; v_n := v_n + v_k;

  -- calls « Follow up » des closers
  insert into public.notifications (user_id, type, title, body, link, metadata)
  select cl.assigned_to, 'follow_up_jour',
         'Follow-up aujourd''hui : ' || coalesce(nullif(btrim(c.full_name), ''), cl.raw_full_name, 'un prospect'),
         'Call en follow-up à recontacter aujourd''hui.', '/calls',
         jsonb_build_object('call_id', cl.id, 'jour', v_jour)
    from public.calls cl left join public.contacts c on c.id = cl.contact_id
   where cl.status = 'follow_up' and cl.follow_up_le = v_jour and cl.assigned_to is not null
     and not exists (select 1 from public.notifications n where n.type = 'follow_up_jour'
                      and n.metadata->>'call_id' = cl.id::text and n.metadata->>'jour' = v_jour::text);
  get diagnostics v_k = row_count; v_n := v_n + v_k;

  -- suivis sans RDV des closers
  insert into public.notifications (user_id, type, title, body, link, metadata)
  select s.closer_id, 'follow_up_jour',
         'Follow-up aujourd''hui : ' || coalesce(nullif(btrim(c.full_name), ''), ld.raw_full_name, 'un prospect'),
         coalesce(s.note, 'Suivi sans RDV à recontacter aujourd''hui') || '.', '/calls',
         jsonb_build_object('suivi_id', s.id, 'jour', v_jour)
    from public.suivis_closer s
    left join public.leads ld on ld.id = s.lead_id
    left join public.contacts c on c.id = coalesce(s.contact_id, ld.contact_id)
   where s.statut = 'ouvert' and s.le = v_jour
     and not exists (select 1 from public.notifications n where n.type = 'follow_up_jour'
                      and n.metadata->>'suivi_id' = s.id::text and n.metadata->>'jour' = v_jour::text);
  get diagnostics v_k = row_count; v_n := v_n + v_k;

  -- 7 jours de retard sur un lead en follow-up : le CEO est prévenu (une fois)
  insert into public.notifications (user_id, type, title, body, link, metadata)
  select p.id, 'follow_up_retard',
         'Follow-up en retard de 7 jours : ' || coalesce(nullif(btrim(c.full_name), ''), ld.raw_full_name, 'un lead'),
         'Prévu le ' || to_char(ld.follow_up_le, 'DD/MM/YYYY') || ', toujours en follow-up.',
         '/leads?q=' || replace(coalesce(ld.raw_phone, c.phone_normalized, ''), '+', '%2B'),
         jsonb_build_object('lead_id', ld.id)
    from public.leads ld left join public.contacts c on c.id = ld.contact_id
    cross join public.profiles p
   where p.role = 'ceo' and ld.status = 'follow_up' and ld.follow_up_le <= v_jour - 7
     and not exists (select 1 from public.notifications n where n.type = 'follow_up_retard'
                      and n.metadata->>'lead_id' = ld.id::text and n.user_id = p.id);
  get diagnostics v_k = row_count; v_n := v_n + v_k;
  return v_n;
end $$;
revoke all on function public.notifier_follow_ups() from public, anon, authenticated;
