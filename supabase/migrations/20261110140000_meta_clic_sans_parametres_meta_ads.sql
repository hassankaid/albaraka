-- ─────────────────────────────────────────────────────────────────────────
-- Clics de pub Meta arrivés SANS marquage → Meta Ads « Sans paramètres », avec
-- la pub retrouvée (décision de Hassan, 10/11/2026).
--
-- Constat du 10/11 : les leads nus viennent tous d'iPhone (0 sur Android), et
-- côté Meta ils ont tous un cookie _fbc posé à l'arrivée. Le fbclid qu'il contient
-- encode un champ `adid` : le même octet pour octet que celui des leads bien
-- marqués de la même pub (121 leads de la « Vidéo 14 »), absent d'un clic
-- organique (lien en bio). On en tire donc la pub.
--
-- 1. fbclid_adid(fbclid) : les 8 octets qui suivent `adid` (hex), ou null.
-- 2. Trigger : clic_pub.meta_adid posé à l'insertion / mise à jour de clic_pub
--    (rattrapage des leads existants plus bas). Aucun autre champ n'est touché.
-- 3. meta_pub_par_adid(adid) : l'utm_content le plus fréquent des leads marqués
--    qui portent ce même adid.
-- 4. lead_attribution(source, detail, utm, app_origine, clic_pub) : la règle
--    Snapchat du 10/11 + celle-ci. La version à 4 arguments reste en place.
-- 5. Appelants : passent clic_pub ; Par créa et l'origine pub d'un lead
--    prennent la pub retrouvée quand l'utm_content manque.
-- ─────────────────────────────────────────────────────────────────────────

create or replace function public.fbclid_adid(p_fbclid text)
 returns text
 language plpgsql
 immutable
 set search_path to 'public'
as $function$
declare
  s text;
  t text;
  b bytea;
  i int;
begin
  if p_fbclid is null or length(p_fbclid) < 20 then return null; end if;
  s := translate(left(p_fbclid, 400), '-_', '+/');
  for off in 0..3 loop
    begin
      t := substr(s, off + 1);
      t := substr(t, 1, length(t) - length(t) % 4);
      b := decode(t, 'base64');
      i := position('\x61646964'::bytea in b);
      if i > 0 and length(b) >= i + 11 then
        return encode(substring(b from i + 4 for 8), 'hex');
      end if;
    exception when others then
      null;
    end;
  end loop;
  return null;
end
$function$;

create or replace function public.lead_meta_adid_trg()
 returns trigger
 language plpgsql
 set search_path to 'public'
as $function$
declare
  v_adid text;
begin
  if new.clic_pub is null then return new; end if;
  v_adid := public.fbclid_adid(coalesce(new.clic_pub->>'fbclid',
                                        substring(new.clic_pub->>'fbc' from '^fb\.\d+\.\d+\.(.+)$')));
  if v_adid is not null and (new.clic_pub->>'meta_adid') is distinct from v_adid then
    new.clic_pub := new.clic_pub || jsonb_build_object('meta_adid', v_adid);
  end if;
  return new;
end
$function$;

drop trigger if exists trg_lead_meta_adid on public.leads;
create trigger trg_lead_meta_adid
  before insert or update of clic_pub on public.leads
  for each row execute function public.lead_meta_adid_trg();

create index if not exists leads_meta_adid_idx on public.leads ((clic_pub->>'meta_adid')) where clic_pub ? 'meta_adid';

create or replace function public.meta_pub_par_adid(p_adid text)
 returns text
 language sql
 stable
 set search_path to 'public'
as $function$
  select btrim(l.utm_content)
  from public.leads l
  where p_adid is not null
    and l.clic_pub->>'meta_adid' = p_adid
    and nullif(btrim(l.utm_content), '') is not null
    and l.source like '%\_ads'
  group by 1
  order by count(*) desc, max(l.created_at) desc
  limit 1
$function$;

create or replace function public.lead_attribution(p_source text, p_detail text, p_utm_source text, p_app_origine text, p_clic_pub jsonb)
 returns table(canal text, tunnel text, canal_precision text)
 language sql
 stable
 set search_path to 'public'
as $function$
  select case when b.canal = 'sans_source' and p_source like '%\_direct' and p_clic_pub ? 'meta_adid'
              then 'meta_ads' else b.canal end,
         b.tunnel,
         case when b.canal = 'sans_source' and p_source like '%\_direct' and p_clic_pub ? 'meta_adid'
              then 'Sans paramètres' else b.canal_precision end
  from public.lead_attribution(p_source, p_detail, p_utm_source, p_app_origine) b
$function$;


-- lead_canal_supprimer
CREATE OR REPLACE FUNCTION public.lead_canal_supprimer(p_cle text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_n bigint;
begin
  if not is_ceo(auth.uid()) then raise exception 'Réservé au CEO'; end if;
  if exists (select 1 from lead_canaux where cle = p_cle and systeme) then raise exception 'Cette source ne peut pas être supprimée'; end if;
  select count(*) into v_n from leads l cross join lateral lead_attribution(l.source, l.source_detail, l.utm_source, l.app_origine, l.clic_pub) x where x.canal = p_cle;
  if v_n > 0 then raise exception 'Cette source a % lead(s) : désactive-la, ou fusionne-la avec une autre', v_n; end if;
  delete from lead_canaux where cle = p_cle;
end $function$;

-- vente_lead_origine
CREATE OR REPLACE FUNCTION public.vente_lead_origine(p_lead_id uuid, p_call_id uuid, p_contact_id uuid, p_sold_at timestamp with time zone)
 RETURNS TABLE(lead_id uuid, mode text)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  select x.lead_id, x.mode
  from (
    select p_lead_id as lead_id, 'direct'::text as mode, 1 as rang
    where p_lead_id is not null
    union all
    select c.lead_id, 'via_appel', 2
    from public.calls c
    where c.id = p_call_id and c.lead_id is not null
    union all
    (select l.id, 'contact', 3
     from public.leads l
     cross join lateral public.lead_attribution(l.source, l.source_detail, l.utm_source, l.app_origine, l.clic_pub) a
     where p_contact_id is not null
       and l.contact_id = p_contact_id
       and l.created_at <= coalesce(p_sold_at, now())
     order by (a.canal = 'sans_source'), l.created_at desc
     limit 1)
  ) x
  order by x.rang
  limit 1;
$function$;

-- marketing_perf
CREATE OR REPLACE FUNCTION public.marketing_perf(p_mode text, p_from date, p_to date)
 RETURNS TABLE(canal text, tunnel text, leads bigint, ventes bigint, ca numeric, depense numeric)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_role text := coalesce(public.get_user_role(), '');
begin
  -- coalesce indispensable : sans lui, un appelant sans profil (anonyme) passe.
  if v_role not in ('ceo', 'agence') then
    raise exception 'acces_refuse' using errcode = '42501';
  end if;

  if p_mode not in ('conference', 'calendrier') then
    raise exception 'mode_inconnu: %', p_mode;
  end if;

  return query
  with l as (
    select case when a.canal = 'apporteur' and a.tunnel = 'quiz_apporteur' then 'tunnel_quiz_apporteurs' else a.canal end as canal,
           coalesce(a.tunnel, 'autre') as tunnel,
           count(*)::bigint as n
    from public.leads x
    cross join lateral public.lead_attribution(x.source, x.source_detail, x.utm_source, x.app_origine, x.clic_pub) a
    where case p_mode
            when 'conference' then x.conference_date between p_from and p_to
            else (x.created_at at time zone 'Europe/Paris')::date between p_from and p_to
          end
    group by 1, 2
  ),
  v as (
    select case when x.id is null then 'non_attribue'
                when a.canal = 'apporteur' and a.tunnel = 'quiz_apporteur' then 'tunnel_quiz_apporteurs'
                else a.canal end as canal,
           case when x.id is null then 'non_attribue' else coalesce(a.tunnel, 'autre') end as tunnel,
           count(*)::bigint as n,
           sum(va.amount_ht)::numeric as ca
    from public.marketing_ventes_attribuees va
    left join public.leads x on x.id = va.lead_id
    left join lateral public.lead_attribution(x.source, x.source_detail, x.utm_source, x.app_origine, x.clic_pub) a on x.id is not null
    where case p_mode
            when 'conference' then va.conference_date between p_from and p_to
            else (va.sold_at at time zone 'Europe/Paris')::date between p_from and p_to
          end
    group by 1, 2
  ),
  -- Le tunnel d'une campagne, d'après les leads qu'elle a amenés : utm_campaign porte son
  -- identifiant. Les noms des campagnes actuelles ne citent plus leur tunnel.
  c as (
    select x.utm_campaign as campagne_id,
           mode() within group (order by coalesce(a.tunnel, 'autre')) as tunnel
    from public.leads x
    cross join lateral public.lead_attribution(x.source, x.source_detail, x.utm_source, x.app_origine, x.clic_pub) a
    where x.utm_campaign in (select ad.campaign_id from public.ads ad)
    group by 1
  ),
  d as (
    select case a.plateforme when 'snap' then 'snap_ads' when 'google' then 'google_ads' else 'meta_ads' end as canal,
           case
             -- Le tunnel écrit dans le nom de la campagne reste prioritaire.
             when public.marketing_tunnel_depense(a.campaign_name, a.channel) in ('whatsapp', 'vsl')
               then public.marketing_tunnel_depense(a.campaign_name, a.channel)
             when c.tunnel is not null then c.tunnel
             -- Google ne transmet pas d'UTM : ses leads n'ont aucun lien avec sa campagne,
             -- et ils viennent tous du tunnel WhatsApp.
             when a.plateforme <> 'meta' then 'whatsapp'
             else public.marketing_tunnel_depense(a.campaign_name, a.channel)
           end as tunnel,
           sum(a.amount_spent)::numeric as depense
    from public.ads a
    left join c on c.campagne_id = a.campaign_id
    where case p_mode
            when 'conference'
              then public.next_sunday_noon_paris_after(a.date::timestamp at time zone 'Europe/Paris')
                   between p_from and p_to
            else a.date between p_from and p_to
          end
    group by 1, 2
  ),
  tout as (
    select l.canal, l.tunnel, l.n as leads, 0::bigint as ventes, 0::numeric as ca, 0::numeric as depense from l
    union all
    select v.canal, v.tunnel, 0::bigint, v.n, v.ca, 0::numeric from v
    union all
    select d.canal, d.tunnel, 0::bigint, 0::bigint, 0::numeric, d.depense from d
  )
  select t.canal, t.tunnel,
         sum(t.leads)::bigint,
         sum(t.ventes)::bigint,
         round(sum(t.ca), 2),
         round(sum(t.depense), 2)
  from tout t
  group by t.canal, t.tunnel
  order by sum(t.leads) desc, t.canal, t.tunnel;
end;
$function$;

-- marketing_leads_par_pub
CREATE OR REPLACE FUNCTION public.marketing_leads_par_pub(p_from date, p_to date)
 RETURNS TABLE(lead_id uuid, contact_id uuid, plateforme text, pub_id text, cree_le timestamp with time zone, statut text, nom text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select l.id, l.contact_id,
         case a.canal when 'snap_ads' then 'snap' else 'meta' end,
         coalesce(nullif(btrim(l.utm_content), ''), case when a.canal = 'meta_ads' then public.meta_pub_par_adid(l.clic_pub->>'meta_adid') end),
         l.created_at, l.status, l.raw_full_name
  from public.leads l
  cross join lateral public.lead_attribution(l.source, l.source_detail, l.utm_source, l.app_origine, l.clic_pub) a
  where a.canal in ('meta_ads', 'snap_ads')
    and (l.created_at at time zone 'Europe/Paris')::date between p_from and p_to
$function$;

-- pub_origine_lead
CREATE OR REPLACE FUNCTION public.pub_origine_lead(p_lead_id uuid)
 RETURNS TABLE(plateforme text, pub_id text, pub_nom text, campagne_nom text)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  select case a.canal when 'snap_ads' then 'snap' else 'meta' end,
         coalesce(nullif(btrim(l.utm_content), ''), case when a.canal = 'meta_ads' then public.meta_pub_par_adid(l.clic_pub->>'meta_adid') end),
         n.pub_nom, n.campagne_nom
  from public.leads l
  cross join lateral public.lead_attribution(l.source, l.source_detail, l.utm_source, l.app_origine, l.clic_pub) a
  left join lateral public.pub_nom_connu(case a.canal when 'snap_ads' then 'snap' else 'meta' end, coalesce(nullif(btrim(l.utm_content), ''), case when a.canal = 'meta_ads' then public.meta_pub_par_adid(l.clic_pub->>'meta_adid') end)) n on true
  where l.id = p_lead_id
    and a.canal in ('meta_ads', 'snap_ads')
$function$;

-- lead_sources_stats
CREATE OR REPLACE FUNCTION public.lead_sources_stats()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  with g as (
    select source, lower(btrim(source_detail)) detail, lower(btrim(utm_source)) utm, app_origine, (clic_pub ? 'meta_adid') meta, count(*) n, max(created_at) dernier
      from leads group by 1, 2, 3, 4, 5),
  a as (select g.n, g.dernier, x.canal, x.tunnel from g cross join lateral lead_attribution(g.source, g.detail, g.utm, g.app_origine, case when g.meta then '{"meta_adid": "1"}'::jsonb end) x)
  select jsonb_build_object(
    'canaux', coalesce((select jsonb_object_agg(canal, jsonb_build_object('n', n, 'dernier', dernier))
                          from (select canal, sum(n) n, max(dernier) dernier from a group by canal) c), '{}'::jsonb),
    'tunnels', coalesce((select jsonb_object_agg(coalesce(tunnel, '-'), jsonb_build_object('n', n, 'dernier', dernier))
                           from (select tunnel, sum(n) n, max(dernier) dernier from a group by tunnel) t), '{}'::jsonb))
  where public.is_ceo(auth.uid())
$function$;

-- leads_enriched (seul l'appel à lead_attribution change)
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
    EXTRACT(isodow FROM (l.created_at AT TIME ZONE 'Europe/Paris'::text))::integer = ANY (COALESCE(( SELECT r.jours_jeu_ven
           FROM scoring_reglages r), '{}'::integer[])) AS signal_jeu_ven
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
     LEFT JOIN LATERAL lead_attribution(l.source, l.source_detail, l.utm_source, l.app_origine, l.clic_pub) attr(canal, tunnel, canal_precision) ON true
     LEFT JOIN LATERAL ( SELECT p.id
           FROM leads p
          WHERE p.contact_id = l.contact_id AND p.id <> l.id AND p.created_at < l.created_at AND p.created_at >= (l.created_at - '30 days'::interval) AND (p.created_at AT TIME ZONE 'Europe/Paris'::text)::date < (l.created_at AT TIME ZONE 'Europe/Paris'::text)::date
          ORDER BY p.created_at DESC
         LIMIT 1) reinscription ON true;

-- Rattrapage : pose clic_pub.meta_adid sur les leads existants, sans déclencher
-- les autres triggers (updated_at, relances) : seul clic_pub change.
set local session_replication_role = replica;
update public.leads l
   set clic_pub = l.clic_pub || jsonb_build_object('meta_adid', x.adid)
  from (select id, public.fbclid_adid(coalesce(clic_pub->>'fbclid', substring(clic_pub->>'fbc' from '^fb\.\d+\.\d+\.(.+)$'))) adid
          from public.leads where clic_pub ? 'fbc' or clic_pub ? 'fbclid') x
 where x.id = l.id and x.adid is not null;
set local session_replication_role = origin;
