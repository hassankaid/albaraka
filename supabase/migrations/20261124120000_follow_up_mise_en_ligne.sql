-- ─────────────────────────────────────────────────────────────────────────
-- Follow-up : mise en ligne (24/11/2026). Sabrina a validé les 4 choix
-- recommandés (1A, 2A, 3A, 4A) de la proposition du 22/11 ; la structure est en
-- base depuis la migration 20261122160000.
--
--   3A. Le Setting DM peut mettre un lead en Follow-up :
--       - tg_leads_dm accepte « follow_up » sur un lead DM ;
--       - un contact obtenu en DM puis mis en Follow-up garde le droit aux 5 %
--         s'il finit inscrit / booké / closé ;
--       - apporteur_update_lead_status accepte le statut (une simple note sur
--         une fiche en Follow-up depuis /my-space échouait sinon).
--   Notification du matin : lien vers /my-space/leads pour un apporteur.
--   Tâche planifiée notifier_follow_ups : chaque jour à 07:00 UTC (8 h à Paris
--   en hiver, 9 h en été).
-- ─────────────────────────────────────────────────────────────────────────

do $$
declare
  d text;
  avant text;
begin
  d := pg_get_functiondef('public.tg_leads_dm()'::regprocedure);
  if d !~ 'follow_up' then
    avant := d;
    d := replace(d, $r$new.status <> all (v_dm || array['inscrit_conference','pas_qualifie','faux_numero'])$r$,
                    $r$new.status <> all (v_dm || array['inscrit_conference','pas_qualifie','faux_numero','follow_up'])$r$);
    d := replace(d, $r$and old.status in ('contact_dm1', 'relance_dm1', 'relance_dm2')$r$,
                    $r$and old.status in ('contact_dm1', 'relance_dm1', 'relance_dm2', 'follow_up')$r$);
    if d = avant or d !~ $r$'faux_numero','follow_up'$r$ or d !~ $r$'relance_dm2', 'follow_up'$r$ then
      raise exception 'tg_leads_dm : texte attendu introuvable';
    end if;
    execute d;
  end if;

  d := pg_get_functiondef('public.apporteur_update_lead_status(uuid, text, text)'::regprocedure);
  if d !~ $r$'follow_up'$r$ then
    avant := d;
    d := replace(d, $r$    'rappel_demande',
$r$, $r$    'rappel_demande',
    'follow_up',
$r$);
    if d = avant then raise exception 'apporteur_update_lead_status : liste des statuts introuvable'; end if;
    execute d;
  end if;
end $$;

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
         case when pa.role = 'apporteur' then '/my-space/leads' else '/leads' end
           || '?q=' || replace(coalesce(ld.raw_phone, c.phone_normalized, ''), '+', '%2B'),
         jsonb_build_object('lead_id', ld.id, 'jour', v_jour)
    from public.leads ld left join public.contacts c on c.id = ld.contact_id
    left join public.profiles pa on pa.id = ld.assigned_to
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

select cron.unschedule(jobid) from cron.job where jobname = 'notifier-follow-ups';
select cron.schedule('notifier-follow-ups', '0 7 * * *', $$select public.notifier_follow_ups();$$);
