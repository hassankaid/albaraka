-- ═══════════════════════════════════════════════════════════════════════
-- Envois automatiques de chaque conférence (mails et SMS), à partir du 20/09/2026.
--
-- AVANT : chaque semaine, on programmait à la main une dizaine de tâches
-- pg_cron datées (« 30 8 13 9 * »). Trois défauts :
--   - le jour/mois se répète : la tâche repart l'année suivante si on oublie de
--     la supprimer (14 tâches du 30/08 et du 06/09 traînaient encore le 13/09) ;
--   - l'heure est en UTC fixe : au passage à l'heure d'hiver (25/10/2026), tous
--     les envois seraient partis une heure trop tôt ;
--   - deux déclenchements qui se chevauchent envoient en double (la fonction
--     d'envoi ne se protège qu'une fois le premier appel terminé).
--
-- MAINTENANT : une seule vérification, chaque minute (`tick_envois_conference`).
-- Pour chaque conférence proche dont `envois_auto` est vrai, elle calcule le
-- planning en heure de Paris (`planning_envois_conference`), et déclenche chaque
-- étape UNE fois : la ligne du journal (unique par conférence et par étape) est
-- réservée AVANT l'appel. Un double envoi est donc impossible, même si deux
-- vérifications se chevauchent.
--
-- GARDE-FOUS
--   - Étape manquée au-delà de sa fenêtre (panne, activation tardive) : elle ne
--     part pas — « Dans 30 minutes » envoyé à midi serait faux — et une alerte
--     est envoyée.
--   - Groupe WhatsApp absent de la fiche : le rappel J-1 et les SMS ne partent
--     pas (ils mèneraient au groupe d'une autre semaine), alerte.
--   - Les listes sont mises à jour juste avant chaque envoi ; les témoins
--     (`conference_envois_temoins`, adresses de l'équipe) y sont insérés en tête.
--   - Les exclusions (réservé, acheté, adresse en erreur) restent calculées par
--     send-conference-mail au moment de l'envoi.
--   - Plancher au 20/09/2026 : la conférence du 13/09, programmée à la main, ne
--     peut jamais être reprise par l'automatisation.
--
-- Les adresses des témoins ne sont PAS dans ce fichier (dépôt public) : elles
-- sont saisies directement en base.
-- ═══════════════════════════════════════════════════════════════════════

-- ── Interrupteur par conférence ──────────────────────────────────────
alter table public.conferences
  add column if not exists envois_auto boolean not null default true;

comment on column public.conferences.envois_auto is
  'Vrai : les mails et SMS de cette conférence partent automatiquement (tick_envois_conference). Faux pour les conférences programmées à la main.';

update public.conferences set envois_auto = false where conference_date <= date '2026-09-13';

-- ── Témoins : l'équipe reçoit chaque envoi, en tête de liste ──────────
create table if not exists public.conference_envois_temoins (
  id uuid primary key default gen_random_uuid(),
  canal text not null check (canal in ('mail', 'sms')),
  valeur text not null,          -- adresse e-mail, ou téléphone au format +33…
  email text,                    -- pour un témoin SMS : e-mail associé (colonne obligatoire des listes SMS)
  prenom text,
  unique (canal, valeur)
);
alter table public.conference_envois_temoins enable row level security;

-- ── Journal : une ligne par conférence et par étape ───────────────────
create table if not exists public.conference_envois_journal (
  id bigserial primary key,
  conference_date date not null,
  etape text not null,
  canal text not null,
  seq integer not null,
  prevu_a timestamptz not null,
  declenche_a timestamptz not null default now(),
  statut text not null check (statut in ('declenche', 'fait', 'echec', 'bloque', 'trop_tard')),
  request_id bigint,
  detail text,
  verifie_a timestamptz,
  unique (conference_date, etape)
);
alter table public.conference_envois_journal enable row level security;

-- ── Alertes à envoyer à l'équipe (lues par l'edge function alerte-conference) ──
-- L'appel HTTP ne transporte aucun contenu : quelqu'un qui appellerait la
-- fonction ne peut qu'envoyer les alertes déjà en attente, aux seuls témoins.
create table if not exists public.conference_envois_alertes (
  id bigserial primary key,
  cree_le timestamptz not null default now(),
  sujet text not null,
  message text not null,
  envoye_a timestamptz,
  erreur text
);
alter table public.conference_envois_alertes enable row level security;

-- ── Planning d'une conférence, en heure de Paris ──────────────────────
create or replace function public.planning_envois_conference(p_conference_date date)
returns table(etape text, canal text, seq integer, prevu_a timestamptz, fenetre interval, libelle text)
language sql
stable
set search_path to 'public'
as $function$
  with c as (
    select c.conference_date as d,
           ((c.conference_date + coalesce(c.starts_at_local, time '11:00')) at time zone 'Europe/Paris') as debut
    from conferences c
    where c.conference_date = p_conference_date
  )
  select v.etape, v.canal, v.seq, v.prevu_a, v.fenetre, v.libelle
  from c, lateral (values
    ('j1_rappel',     'mail', 10, ((c.d - 1) + time '19:00') at time zone 'Europe/Paris', interval '3 hours',    'Rappel J-1'),
    ('m30',           'mail',  8, c.debut - interval '30 minutes',                        interval '10 minutes', 'Plus que 30 minutes'),
    ('m10',           'sms',   6, c.debut - interval '10 minutes',                        interval '8 minutes',  'SMS On commence dans 10 min'),
    ('ouverture',     'mail',  9, c.debut,                                                interval '10 minutes', 'La conférence vient de commencer'),
    ('m15',           'sms',   7, c.debut + interval '15 minutes',                        interval '10 minutes', 'SMS En cours depuis 15 min'),
    ('post_dimanche', 'mail', 11, c.debut + interval '3 hours',                           interval '3 hours',    'La suite, c''est maintenant'),
    ('post_j1',       'mail', 12, ((c.d + 1) + time '09:00') at time zone 'Europe/Paris', interval '3 hours',    'Pourquoi tout seul, ça marche jamais'),
    ('post_j2',       'mail', 13, ((c.d + 2) + time '09:00') at time zone 'Europe/Paris', interval '3 hours',    'Ça va être tout le monde sauf moi'),
    ('post_j3_matin', 'mail', 14, ((c.d + 3) + time '09:00') at time zone 'Europe/Paris', interval '3 hours',    'Un truc que je dois te dire, cash'),
    ('post_j3_soir',  'mail', 15, ((c.d + 3) + time '19:00') at time zone 'Europe/Paris', interval '2 hours',    'Dernier message')
  ) as v(etape, canal, seq, prevu_a, fenetre, libelle)
  order by v.prevu_a;
$function$;

-- ── Listes d'envoi : témoins en tête, puis les inscrits ───────────────
-- Même sélection que les listes programmées à la main jusqu'au 13/09.
create or replace function public.rafraichir_liste_conference(p_conference_date date, p_canal text)
returns integer
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_slug text := 'conf_' || replace(p_conference_date::text, '-', '_');
  v_n integer := 0;
  v_k integer;
begin
  if p_canal = 'mail' then
    insert into email_campaign_recipients (campaign_slug, position, email, first_name)
    select v_slug,
           (select coalesce(max(position), 0) from email_campaign_recipients where campaign_slug = v_slug)
           + row_number() over (order by t.valeur),
           lower(trim(t.valeur)), t.prenom
    from conference_envois_temoins t
    where t.canal = 'mail'
      and not exists (select 1 from email_campaign_recipients r
                      where r.campaign_slug = v_slug and r.email = lower(trim(t.valeur)))
    on conflict do nothing;
    get diagnostics v_k = row_count; v_n := v_n + v_k;

    insert into email_campaign_recipients (campaign_slug, position, email, first_name)
    select v_slug,
           (select coalesce(max(position), 0) from email_campaign_recipients where campaign_slug = v_slug)
           + row_number() over (order by n.inscrit_le, n.email),
           n.email, n.prenom
    from (
      select distinct on (lower(trim(c.email)))
             lower(trim(c.email)) as email,
             nullif(initcap(split_part(trim(c.full_name), ' ', 1)), '') as prenom,
             min(l.created_at) over (partition by lower(trim(c.email))) as inscrit_le
      from leads l join contacts c on c.id = l.contact_id
      where l.conference_date = p_conference_date
        and c.email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[a-z]{2,}$'
        and not exists (select 1 from email_campaign_recipients r
                        where r.campaign_slug = v_slug and r.email = lower(trim(c.email)))
      order by lower(trim(c.email)), l.created_at
    ) n
    on conflict do nothing;
    get diagnostics v_k = row_count; v_n := v_n + v_k;

  elsif p_canal = 'sms' then
    v_slug := v_slug || '_sms';

    insert into sms_campaign_recipients (campaign_slug, position, email, phone, first_name, unsubscribe_token)
    select v_slug,
           (select coalesce(max(position), 0) from sms_campaign_recipients where campaign_slug = v_slug)
           + row_number() over (order by t.valeur),
           coalesce(lower(trim(t.email)), ''), t.valeur, t.prenom, encode(extensions.gen_random_bytes(4), 'hex')
    from conference_envois_temoins t
    where t.canal = 'sms'
      and not exists (select 1 from sms_campaign_recipients r
                      where r.campaign_slug = v_slug and r.phone = t.valeur)
    on conflict do nothing;
    get diagnostics v_k = row_count; v_n := v_n + v_k;

    insert into sms_campaign_recipients (campaign_slug, position, email, phone, first_name, unsubscribe_token)
    select v_slug,
           (select coalesce(max(position), 0) from sms_campaign_recipients where campaign_slug = v_slug)
           + row_number() over (order by n.inscrit_le, n.phone),
           n.email, n.phone, n.prenom, encode(extensions.gen_random_bytes(4), 'hex')
    from (
      select distinct on (c.phone_normalized)
             lower(trim(c.email)) as email,
             c.phone_normalized as phone,
             nullif(initcap(split_part(trim(c.full_name), ' ', 1)), '') as prenom,
             min(l.created_at) over (partition by c.phone_normalized) as inscrit_le
      from leads l join contacts c on c.id = l.contact_id
      where l.conference_date = p_conference_date
        and c.email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[a-z]{2,}$'
        and c.phone_normalized is not null
        and length(c.phone_normalized) between 11 and 16
        and not exists (select 1 from sms_campaign_recipients r
                        where r.campaign_slug = v_slug and r.phone = c.phone_normalized)
      order by c.phone_normalized, l.created_at
    ) n
    on conflict do nothing;
    get diagnostics v_k = row_count; v_n := v_n + v_k;

  else
    raise exception 'Canal inconnu : %', p_canal;
  end if;

  return v_n;
end;
$function$;

-- ── Appel d'une fonction d'envoi ──────────────────────────────────────
-- Délai de 145 s : l'envoi de ~100 mails prend une trentaine de secondes. Si la
-- réponse n'arrive pas, le tick vérifie les envois réellement journalisés.
create or replace function public.declencher_envoi_conference(p_conference_date date, p_canal text, p_seq integer, p_dry_run boolean default false)
returns bigint
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_corps jsonb := jsonb_build_object('seq', p_seq, 'conference_date', p_conference_date::text);
begin
  if p_canal = 'mail' then
    v_corps := v_corps || jsonb_build_object('max', 300);
  end if;
  if p_dry_run then
    v_corps := v_corps || jsonb_build_object('dry_run', true);
  end if;
  return net.http_post(
    url := 'https://ktvszjzryabjgxyobtyc.supabase.co/functions/v1/'
           || case p_canal when 'mail' then 'send-conference-mail' when 'sms' then 'send-conference-sms' end,
    body := v_corps,
    headers := '{"Content-Type":"application/json"}'::jsonb,
    timeout_milliseconds := 145000
  );
end;
$function$;

-- ── Alerte à l'équipe ─────────────────────────────────────────────────
create or replace function public.alerter_envois_conference(p_sujet text, p_message text, p_simulation boolean default false)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if p_simulation then return; end if;
  insert into conference_envois_alertes (sujet, message) values (p_sujet, p_message);
  perform net.http_post(
    url := 'https://ktvszjzryabjgxyobtyc.supabase.co/functions/v1/alerte-conference',
    body := '{}'::jsonb,
    headers := '{"Content-Type":"application/json"}'::jsonb,
    timeout_milliseconds := 30000
  );
end;
$function$;

-- ── La vérification de chaque minute ──────────────────────────────────
-- p_maintenant et p_simulation servent à la simulation : en simulation, rien
-- n'est écrit ni envoyé, la fonction dit seulement ce qu'elle ferait.
create or replace function public.tick_envois_conference(p_maintenant timestamptz default now(), p_simulation boolean default false)
returns table(conference_date date, etape text, action text, detail text)
language plpgsql
security definer
set search_path to 'public'
as $function$
#variable_conflict use_column
declare
  v_aujourdhui date := (p_maintenant at time zone 'Europe/Paris')::date;
  c record;
  s record;
  j record;
  v_id bigint;
  v_req bigint;
  v_resp record;
  v_nb integer;
  v_slug text;
begin
  -- 1. Vérifier les étapes déclenchées : l'envoi a-t-il vraiment eu lieu ?
  if not p_simulation then
    for j in
      select * from conference_envois_journal jj
      where jj.statut = 'declenche' and jj.declenche_a < p_maintenant - interval '3 minutes'
    loop
      v_slug := 'conf_' || replace(j.conference_date::text, '-', '_');
      if j.canal = 'mail' then
        select count(*) into v_nb from email_campaign_sends where campaign_slug = v_slug and email_seq = j.seq and status = 'sent';
      else
        select count(*) into v_nb from sms_campaign_sends where campaign_slug = v_slug || '_sms' and sms_seq = j.seq;
      end if;
      select r.status_code, r.timed_out, r.error_msg, left(r.content, 400) as content
        into v_resp from net._http_response r where r.id = j.request_id;

      if v_nb > 0 then
        update conference_envois_journal set statut = 'fait', verifie_a = p_maintenant,
               detail = v_nb || ' envoi(s) journalisé(s)' || coalesce(' — réponse ' || v_resp.status_code, '')
        where id = j.id;
        conference_date := j.conference_date; etape := j.etape; action := 'verifie_fait'; detail := v_nb || ' envois'; return next;
      elsif j.declenche_a < p_maintenant - interval '20 minutes' then
        update conference_envois_journal set statut = 'echec', verifie_a = p_maintenant,
               detail = 'Aucun envoi constaté. Réponse : ' || coalesce(v_resp.status_code::text, 'aucune')
                        || coalesce(' / ' || v_resp.error_msg, '') || coalesce(' / ' || v_resp.content, '')
        where id = j.id;
        perform alerter_envois_conference(
          'Conférence du ' || to_char(j.conference_date, 'DD/MM') || ' : envoi en échec (' || j.etape || ')',
          'L''étape « ' || j.etape || ' » a été déclenchée à ' || to_char(j.declenche_a at time zone 'Europe/Paris', 'DD/MM HH24:MI')
          || ' (Paris) mais aucun envoi n''a été constaté 20 minutes plus tard. Réponse de la fonction : '
          || coalesce(v_resp.status_code::text, 'aucune') || coalesce(' / ' || v_resp.error_msg, '') || coalesce(' / ' || v_resp.content, ''));
        conference_date := j.conference_date; etape := j.etape; action := 'verifie_echec'; detail := null; return next;
      end if;
    end loop;
  end if;

  -- 2. Déclencher les étapes arrivées à échéance.
  for c in
    select cf.* from conferences cf
    where cf.envois_auto
      and cf.conference_date >= date '2026-09-20'           -- plancher : jamais le 13/09 ni avant
      and cf.conference_date between v_aujourdhui - 4 and v_aujourdhui + 2
  loop
    for s in select * from planning_envois_conference(c.conference_date) where prevu_a <= p_maintenant loop
      if exists (select 1 from conference_envois_journal jj where jj.conference_date = c.conference_date and jj.etape = s.etape) then
        continue;
      end if;

      conference_date := c.conference_date; etape := s.etape;

      -- Trop tard : le texte ne serait plus vrai.
      if p_maintenant > s.prevu_a + s.fenetre then
        action := 'trop_tard';
        detail := 'Prévu à ' || to_char(s.prevu_a at time zone 'Europe/Paris', 'DD/MM HH24:MI');
        if not p_simulation then
          insert into conference_envois_journal (conference_date, etape, canal, seq, prevu_a, declenche_a, statut, detail)
          values (c.conference_date, s.etape, s.canal, s.seq, s.prevu_a, p_maintenant, 'trop_tard', detail)
          on conflict do nothing returning id into v_id;
          if v_id is not null then
            perform alerter_envois_conference(
              'Conférence du ' || to_char(c.conference_date, 'DD/MM') || ' : envoi non parti (' || s.libelle || ')',
              'L''envoi « ' || s.libelle || ' », prévu le ' || to_char(s.prevu_a at time zone 'Europe/Paris', 'DD/MM à HH24:MI')
              || ', n''est pas parti à temps. Il a été annulé pour ne pas envoyer un message devenu faux.');
          end if;
        end if;
        return next;
        continue;
      end if;

      -- Groupe WhatsApp obligatoire pour le rappel J-1 et les SMS.
      if s.etape in ('j1_rappel', 'm10', 'm15') and c.whatsapp_group_url is null then
        action := 'bloque';
        detail := 'Groupe WhatsApp non renseigné';
        if not p_simulation then
          insert into conference_envois_journal (conference_date, etape, canal, seq, prevu_a, declenche_a, statut, detail)
          values (c.conference_date, s.etape, s.canal, s.seq, s.prevu_a, p_maintenant, 'bloque', detail)
          on conflict do nothing returning id into v_id;
          if v_id is not null then
            perform alerter_envois_conference(
              'Conférence du ' || to_char(c.conference_date, 'DD/MM') || ' : « ' || s.libelle || ' » bloqué',
              'Le groupe WhatsApp de la conférence du ' || to_char(c.conference_date, 'DD/MM')
              || ' n''est pas renseigné dans /admin/conferences. L''envoi « ' || s.libelle || ' » n''est pas parti.');
          end if;
        end if;
        return next;
        continue;
      end if;

      -- Déclenchement : réserver l'étape AVANT d'appeler, pour qu'elle ne parte qu'une fois.
      action := 'declenche';
      detail := s.libelle;
      if not p_simulation then
        v_id := null;
        -- declenche_a = heure du passage (et non now()) : la vérification des
        -- envois compare à p_maintenant, simulation comprise.
        insert into conference_envois_journal (conference_date, etape, canal, seq, prevu_a, declenche_a, statut)
        values (c.conference_date, s.etape, s.canal, s.seq, s.prevu_a, p_maintenant, 'declenche')
        on conflict do nothing returning id into v_id;
        if v_id is null then
          continue;  -- une autre vérification l'a réservée entre-temps
        end if;
        v_nb := rafraichir_liste_conference(c.conference_date, s.canal);
        v_req := declencher_envoi_conference(c.conference_date, s.canal, s.seq, false);
        update conference_envois_journal set request_id = v_req, detail = v_nb || ' ajout(s) à la liste' where id = v_id;
      end if;
      return next;
    end loop;
  end loop;
end;
$function$;

revoke all on function public.planning_envois_conference(date) from public, anon, authenticated;
revoke all on function public.rafraichir_liste_conference(date, text) from public, anon, authenticated;
revoke all on function public.declencher_envoi_conference(date, text, integer, boolean) from public, anon, authenticated;
revoke all on function public.alerter_envois_conference(text, text, boolean) from public, anon, authenticated;
revoke all on function public.tick_envois_conference(timestamptz, boolean) from public, anon, authenticated;

-- ACTIVATION (après validation, pas dans cette migration) :
--   select cron.schedule('envois_conference_auto', '* * * * *', 'select public.tick_envois_conference()');
-- ARRÊT D'URGENCE :
--   select cron.unschedule('envois_conference_auto');
-- SUSPENDRE UNE CONFÉRENCE :
--   update conferences set envois_auto = false where conference_date = 'AAAA-MM-JJ';
