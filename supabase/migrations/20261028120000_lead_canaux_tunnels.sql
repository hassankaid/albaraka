-- ─────────────────────────────────────────────────────────────────────────
-- Sources des leads : canaux et tunnels séparés (demande de Sidali du 28/10/2026,
-- modèle validé par Hassan).
--
-- Avant : un tag mélangeait le tunnel et le canal (« Tunnel WhatsApp - Snap Ads »),
-- 45 combinaisons écrites en dur dans le code. Désormais :
--   • lead_canaux   : d'où vient le trafic (Meta Ads, Snap Ads, Organique Sidali,
--                     Apporteur…). Gérés par le CEO depuis la page Leads : renommer,
--                     activer/désactiver, créer, fusionner, supprimer (sans lead).
--   • lead_tunnels  : sur quelle page le lead s'est inscrit. Créés avec le tunnel.
--   • lead_sources_map : traduit chaque ancienne clé `leads.source` en canal + tunnel
--                     (+ précision : plateforme de l'apporteur). Aucun lead n'est
--                     réécrit : le canal est CALCULÉ (lead_attribution), y compris pour
--                     l'historique.
--   • Un canal créé ici est utilisable tout de suite dans un lien de tunnel :
--     ?src=<clé>. Le tunnel enregistre la source « direct » avec source_detail = clé,
--     et lead_attribution le range dans ce canal.
-- Un lead arrivé sur un canal désactivé ou supprimé est toujours enregistré : il
-- tombe dans « Sans source » (supprimé) ou garde son canal (désactivé), jamais perdu.
-- ─────────────────────────────────────────────────────────────────────────

create table if not exists public.lead_canaux (
  cle text primary key,
  libelle text not null,
  groupe text not null check (groupe in ('ads', 'organique', 'apporteur', 'autre')),
  couleur text not null default 'gray',
  actif boolean not null default true,
  ordre integer not null default 100,
  -- « Sans source » et « Autre » sont le filet : ni supprimables ni fusionnables
  systeme boolean not null default false,
  desactive_le timestamptz,
  cree_le timestamptz not null default now()
);

create table if not exists public.lead_tunnels (
  cle text primary key,
  libelle text not null,
  actif boolean not null default true,
  ordre integer not null default 100
);

create table if not exists public.lead_sources_map (
  source text primary key,
  canal text references public.lead_canaux(cle) on delete set null,
  tunnel text references public.lead_tunnels(cle),
  canal_precision text
);

-- Après une fusion, l'ancienne clé (et les liens ?src= qui la portent) pointe vers le canal gardé.
create table if not exists public.lead_canaux_alias (
  ancien text primary key,
  canal text not null references public.lead_canaux(cle) on delete cascade
);

alter table public.lead_canaux enable row level security;
alter table public.lead_tunnels enable row level security;
alter table public.lead_sources_map enable row level security;
alter table public.lead_canaux_alias enable row level security;
do $$
declare t text;
begin
  foreach t in array array['lead_canaux', 'lead_tunnels', 'lead_sources_map', 'lead_canaux_alias'] loop
    execute format('drop policy if exists %1$s_lecture on public.%1$s', t);
    execute format('create policy %1$s_lecture on public.%1$s for select to authenticated using (true)', t);
    execute format('revoke all on public.%1$s from anon', t);
    execute format('revoke insert, update, delete on public.%1$s from authenticated', t);
    execute format('grant select on public.%1$s to authenticated', t);
  end loop;
end $$;

-- ---------------------------------------------------------------- données initiales
insert into public.lead_canaux (cle, libelle, groupe, couleur, actif, ordre, systeme) values
  ('meta_ads', 'Meta Ads', 'ads', 'blue', true, 10, false),
  ('snap_ads', 'Snap Ads', 'ads', 'yellow', true, 20, false),
  ('google_ads', 'Google Ads', 'ads', 'indigo', true, 30, false),
  ('tiktok_ads', 'TikTok Ads', 'ads', 'slate', false, 40, false),
  ('instagram_ads_ancien', 'Instagram Ads (ancien)', 'ads', 'pink', false, 90, false),
  ('whatsapp_ads_ancien', 'WhatsApp Ads (ancien)', 'ads', 'green', false, 91, false),
  ('sidali', 'Organique Sidali', 'organique', 'amber', true, 110, false),
  ('instagram', 'Instagram organique', 'organique', 'fuchsia', true, 120, false),
  ('tiktok', 'TikTok organique', 'organique', 'slate', false, 130, false),
  ('youtube', 'YouTube organique', 'organique', 'red', true, 140, false),
  ('site_vitrine', 'Site vitrine', 'organique', 'emerald', true, 150, false),
  ('sans_source', 'Sans source', 'organique', 'gray', true, 190, true),
  ('apporteur', 'Apporteur', 'apporteur', 'violet', true, 210, false),
  ('autre', 'Autre', 'autre', 'zinc', true, 310, true)
on conflict (cle) do nothing;
update public.lead_canaux set desactive_le = now() where not actif and desactive_le is null;

insert into public.lead_tunnels (cle, libelle, actif, ordre) values
  ('whatsapp', 'Tunnel WhatsApp (conférence)', true, 10),
  ('vsl', 'Tunnel VSL', true, 20),
  ('liberty', 'Tunnel Liberty', true, 30),
  ('quiz_apporteur', 'Quiz apporteur', true, 40),
  ('site_vitrine', 'Site vitrine', true, 50),
  ('saisie_manuelle', 'Saisie manuelle', true, 60),
  ('ancien_webinaire', 'Ancien webinaire (Systeme.io)', false, 90),
  ('anciennes_vsl', 'Anciennes VSL A et B (Systeme.io)', false, 91)
on conflict (cle) do nothing;

insert into public.lead_sources_map (source, canal, tunnel, canal_precision) values
  ('webi_wa_ads', 'meta_ads', 'whatsapp', null),
  ('webi_wa_snap_ads', 'snap_ads', 'whatsapp', null),
  ('webi_wa_google_ads', 'google_ads', 'whatsapp', null),
  ('webi_wa_tiktok_ads', 'tiktok_ads', 'whatsapp', null),
  ('webi_wa_instagram_organic', 'instagram', 'whatsapp', null),
  ('webi_wa_tiktok_organic', 'tiktok', 'whatsapp', null),
  ('webi_wa_youtube_organic', 'youtube', 'whatsapp', null),
  ('webi_wa_direct', 'sans_source', 'whatsapp', null),
  ('webi_vsl_ads', 'meta_ads', 'vsl', null),
  ('webi_vsl_snap_ads', 'snap_ads', 'vsl', null),
  ('webi_vsl_google_ads', 'google_ads', 'vsl', null),
  ('webi_vsl_tiktok_ads', 'tiktok_ads', 'vsl', null),
  ('webi_vsl_instagram_organic', 'instagram', 'vsl', null),
  ('webi_vsl_tiktok_organic', 'tiktok', 'vsl', null),
  ('webi_vsl_youtube_organic', 'youtube', 'vsl', null),
  ('webi_vsl_direct', 'sans_source', 'vsl', null),
  ('liberty_ads', 'meta_ads', 'liberty', null),
  ('liberty_snap_ads', 'snap_ads', 'liberty', null),
  ('liberty_google_ads', 'google_ads', 'liberty', null),
  ('liberty_tiktok_ads', 'tiktok_ads', 'liberty', null),
  ('liberty_instagram_organic', 'instagram', 'liberty', null),
  ('liberty_tiktok_organic', 'tiktok', 'liberty', null),
  ('liberty_youtube_organic', 'youtube', 'liberty', null),
  ('liberty_direct', 'sans_source', 'liberty', null),
  ('site_vitrine', 'site_vitrine', 'site_vitrine', null),
  ('apporteur_quiz', 'apporteur', 'quiz_apporteur', 'Quiz'),
  ('apporteur_facebook', 'apporteur', 'saisie_manuelle', 'Facebook'),
  ('apporteur_whatsapp', 'apporteur', 'saisie_manuelle', 'WhatsApp'),
  ('apporteur_instagram', 'apporteur', 'saisie_manuelle', 'Instagram'),
  ('apporteur_linkedin', 'apporteur', 'saisie_manuelle', 'LinkedIn'),
  ('apporteur_recommandation', 'apporteur', 'saisie_manuelle', 'Recommandation'),
  ('apporteur_telegram', 'apporteur', 'saisie_manuelle', 'Telegram'),
  ('apporteur_tiktok', 'apporteur', 'saisie_manuelle', 'TikTok'),
  ('apporteur_autre', 'apporteur', 'saisie_manuelle', 'Autre'),
  ('webi', 'sans_source', 'ancien_webinaire', null),
  ('vsl_a', 'sans_source', 'anciennes_vsl', 'VSL A'),
  ('vsl_b', 'sans_source', 'anciennes_vsl', 'VSL B'),
  ('instagram_ads', 'instagram_ads_ancien', 'saisie_manuelle', null),
  ('whatsapp_ads', 'whatsapp_ads_ancien', 'saisie_manuelle', null),
  ('instagram_organic', 'instagram', 'saisie_manuelle', null),
  -- clé « meta_ads » : reclassée par trg_reclassify_meta_ads à l'insertion, jamais proposée à la saisie
  ('meta_ads', 'meta_ads', null, null),
  ('quiz_scoring', 'autre', 'saisie_manuelle', null),
  ('autre', 'autre', 'saisie_manuelle', null)
on conflict (source) do nothing;

-- ---------------------------------------------------------------- calcul du canal
-- Canal, tunnel et précision d'un lead, à partir de ce qu'il a enregistré.
--   • canal « Sans source » + source_detail = clé d'un canal (lien ?src=<clé>) → ce canal ;
--   • Meta Ads : précision Instagram / Facebook d'après utm_source (ig / fb) ;
--   • clé inconnue ou canal supprimé → « Sans source » (jamais perdu).
create or replace function public.lead_attribution(p_source text, p_detail text, p_utm_source text)
returns table (canal text, tunnel text, canal_precision text)
language sql stable set search_path = public
as $$
  with m as (select * from lead_sources_map where source = p_source),
       lien as (
         select coalesce(
                  (select a.canal from lead_canaux_alias a where a.ancien = lower(btrim(p_detail))),
                  (select c.cle from lead_canaux c where c.cle = lower(btrim(p_detail)))) as cle),
       brut as (
         select case when coalesce((select m.canal from m), 'sans_source') = 'sans_source' and (select cle from lien) is not null
                     then (select cle from lien)
                     else coalesce((select m.canal from m), case when p_source is null then 'autre' else 'sans_source' end)
                end as canal)
  select coalesce((select a.canal from lead_canaux_alias a where a.ancien = brut.canal), brut.canal) as canal,
         (select m.tunnel from m) as tunnel,
         case
           when coalesce((select a.canal from lead_canaux_alias a where a.ancien = brut.canal), brut.canal) = 'meta_ads'
             then case when lower(coalesce(p_utm_source, '')) in ('ig', 'instagram') then 'Instagram'
                       when lower(coalesce(p_utm_source, '')) in ('fb', 'facebook') then 'Facebook' end
           else (select m.canal_precision from m)
         end as canal_precision
  from brut
$$;

grant execute on function public.lead_attribution(text, text, text) to authenticated;

-- ---------------------------------------------------------------- statistiques (écran de gestion)
create or replace function public.lead_sources_stats()
returns jsonb
language sql stable security definer set search_path = public
as $$
  with g as (
    select source, lower(btrim(source_detail)) detail, lower(btrim(utm_source)) utm, count(*) n, max(created_at) dernier
      from leads group by 1, 2, 3),
  a as (select g.n, g.dernier, x.canal, x.tunnel from g cross join lateral lead_attribution(g.source, g.detail, g.utm) x)
  select jsonb_build_object(
    'canaux', coalesce((select jsonb_object_agg(canal, jsonb_build_object('n', n, 'dernier', dernier))
                          from (select canal, sum(n) n, max(dernier) dernier from a group by canal) c), '{}'::jsonb),
    'tunnels', coalesce((select jsonb_object_agg(coalesce(tunnel, '-'), jsonb_build_object('n', n, 'dernier', dernier))
                           from (select tunnel, sum(n) n, max(dernier) dernier from a group by tunnel) t), '{}'::jsonb))
  where public.is_ceo(auth.uid())
$$;

-- ---------------------------------------------------------------- actions du CEO
-- Les mots déjà lus par les tunnels (?src=ads, ig, tiktok…) ne peuvent pas devenir une clé.
create or replace function public._lead_canal_cle(p_libelle text)
returns text
language sql immutable
as $$
  select left(btrim(regexp_replace(lower(translate(p_libelle,
    'àâäáãåçéèêëíìîïñóòôöõúùûüýÿœÀÂÄÁÃÅÇÉÈÊËÍÌÎÏÑÓÒÔÖÕÚÙÛÜÝŒ',
    'aaaaaaceeeeiiiinooooouuuuyyoaaaaaaceeeeiiiinooooouuuuyo')), '[^a-z0-9]+', '_', 'g'), '_'), 40)
$$;

create or replace function public.lead_canal_creer(p_libelle text, p_groupe text)
returns text
language plpgsql security definer set search_path = public
as $$
declare
  v_cle text := _lead_canal_cle(p_libelle);
  v_couleurs text[] := array['sky', 'cyan', 'emerald', 'orange', 'pink', 'violet', 'amber', 'indigo'];
begin
  if not is_ceo(auth.uid()) then raise exception 'Réservé au CEO'; end if;
  if coalesce(btrim(p_libelle), '') = '' or v_cle = '' then raise exception 'Donne un nom à la source'; end if;
  if p_groupe not in ('ads', 'organique', 'apporteur', 'autre') then raise exception 'Groupe inconnu'; end if;
  if v_cle in ('ads', 'ig', 'insta', 'instagram_organic', 'tiktok_organic', 'youtube_organic', 'yt', 'snapchat_ads', 'gads', 'direct')
     or exists (select 1 from lead_canaux where cle = v_cle) or exists (select 1 from lead_canaux_alias where ancien = v_cle) then
    raise exception 'Une source porte déjà ce nom (ou un nom trop proche) : choisis-en un autre';
  end if;
  insert into lead_canaux (cle, libelle, groupe, couleur, ordre)
  values (v_cle, btrim(p_libelle), p_groupe, v_couleurs[1 + (select count(*) from lead_canaux)::int % 8],
          (select coalesce(max(ordre), 0) + 1 from lead_canaux where groupe = p_groupe));
  return v_cle;
end $$;

create or replace function public.lead_canal_modifier(p_cle text, p_libelle text, p_actif boolean)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not is_ceo(auth.uid()) then raise exception 'Réservé au CEO'; end if;
  if coalesce(btrim(p_libelle), '') = '' then raise exception 'Le nom ne peut pas être vide'; end if;
  update lead_canaux
     set libelle = btrim(p_libelle),
         actif = case when systeme then true else p_actif end,
         desactive_le = case when not p_actif and actif then now() when p_actif then null else desactive_le end
   where cle = p_cle;
  if not found then raise exception 'Source introuvable'; end if;
end $$;

create or replace function public.lead_canal_supprimer(p_cle text)
returns void
language plpgsql security definer set search_path = public
as $$
declare v_n bigint;
begin
  if not is_ceo(auth.uid()) then raise exception 'Réservé au CEO'; end if;
  if exists (select 1 from lead_canaux where cle = p_cle and systeme) then raise exception 'Cette source ne peut pas être supprimée'; end if;
  select count(*) into v_n from leads l cross join lateral lead_attribution(l.source, l.source_detail, l.utm_source) x where x.canal = p_cle;
  if v_n > 0 then raise exception 'Cette source a % lead(s) : désactive-la, ou fusionne-la avec une autre', v_n; end if;
  delete from lead_canaux where cle = p_cle;
end $$;

create or replace function public.lead_canal_fusionner(p_de text, p_vers text)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not is_ceo(auth.uid()) then raise exception 'Réservé au CEO'; end if;
  if p_de = p_vers then raise exception 'Choisis deux sources différentes'; end if;
  if exists (select 1 from lead_canaux where cle = p_de and systeme) then raise exception 'Cette source ne peut pas être fusionnée'; end if;
  if not exists (select 1 from lead_canaux where cle = p_vers) then raise exception 'Source de destination introuvable'; end if;
  update lead_sources_map set canal = p_vers where canal = p_de;
  update lead_canaux_alias set canal = p_vers where canal = p_de;
  insert into lead_canaux_alias (ancien, canal) values (p_de, p_vers) on conflict (ancien) do update set canal = excluded.canal;
  delete from lead_canaux where cle = p_de;
end $$;

create or replace function public.lead_tunnel_modifier(p_cle text, p_libelle text, p_actif boolean)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not is_ceo(auth.uid()) then raise exception 'Réservé au CEO'; end if;
  if coalesce(btrim(p_libelle), '') = '' then raise exception 'Le nom ne peut pas être vide'; end if;
  update lead_tunnels set libelle = btrim(p_libelle), actif = p_actif where cle = p_cle;
  if not found then raise exception 'Tunnel introuvable'; end if;
end $$;

revoke all on function public.lead_sources_stats() from public, anon;
revoke all on function public.lead_canal_creer(text, text) from public, anon;
revoke all on function public.lead_canal_modifier(text, text, boolean) from public, anon;
revoke all on function public.lead_canal_supprimer(text) from public, anon;
revoke all on function public.lead_canal_fusionner(text, text) from public, anon;
revoke all on function public.lead_tunnel_modifier(text, text, boolean) from public, anon;
grant execute on function public.lead_sources_stats() to authenticated;
grant execute on function public.lead_canal_creer(text, text) to authenticated;
grant execute on function public.lead_canal_modifier(text, text, boolean) to authenticated;
grant execute on function public.lead_canal_supprimer(text) to authenticated;
grant execute on function public.lead_canal_fusionner(text, text) to authenticated;
grant execute on function public.lead_tunnel_modifier(text, text, boolean) to authenticated;

-- ---------------------------------------------------------------- vue de la page Leads
-- Mêmes colonnes qu'avant, plus canal, tunnel et canal_precision à la fin.
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
    attr.canal_precision
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
         LIMIT 1) any_call ON true
     LEFT JOIN LATERAL lead_attribution(l.source, l.source_detail, l.utm_source) attr(canal, tunnel, canal_precision) ON true;
