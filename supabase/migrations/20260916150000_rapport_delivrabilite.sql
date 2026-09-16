-- Rapport de délivrabilité hebdomadaire
--
-- Construit sur nos propres événements Resend (webhook), et non sur l'API
-- Resend : le webhook nous donne le user_agent, donc la seule façon de
-- distinguer une ouverture humaine d'un préchargement machine. Sans ce
-- filtre, 36 % des « ouvertures » de septembre étaient des robots — dont le
-- proxy d'images de Google, qui ouvre parfois 7 secondes AVANT l'envoi.

create table if not exists public.rapports_delivrabilite (
  semaine_du date primary key,
  envoye_a   timestamptz not null default now(),
  resume     jsonb
);

comment on table public.rapports_delivrabilite is
  'Un rapport par semaine, pour ne pas en envoyer deux.';

-- Une ouverture ou un clic de robot ne compte pas.
create or replace function public.evenement_machine(p_user_agent text)
returns boolean
language sql
immutable
as $$
  select coalesce(p_user_agent, '') like '%Chrome/42.%'
      or coalesce(p_user_agent, '') = 'Mozilla/5.0'
      or coalesce(p_user_agent, '') ilike '%bot%'
      or coalesce(p_user_agent, '') ilike '%facebookexternalhit%';
$$;

create or replace function public.stats_delivrabilite_semaine(p_reference timestamptz default now())
returns jsonb
language sql
stable
security definer
set search_path to 'public'
as $$
  with bornes as (
    -- La semaine complète qui précède : lundi 00h00 → dimanche 24h00, heure de Paris.
    select
      (date_trunc('week', (p_reference at time zone 'Europe/Paris')) - interval '7 days') at time zone 'Europe/Paris' as debut,
      (date_trunc('week', (p_reference at time zone 'Europe/Paris'))) at time zone 'Europe/Paris' as fin
  ),
  envois as (
    select s.resend_email_id, s.campaign_slug, s.email_seq, lower(trim(s.recipient_email)) as email,
           lower(split_part(s.recipient_email, '@', 2)) as domaine
    from email_campaign_sends s, bornes b
    where s.sent_at >= b.debut and s.sent_at < b.fin and s.status <> 'failed'
  ),
  faits as (
    select e.resend_email_id, e.event_type, public.evenement_machine(e.user_agent) as machine
    from email_campaign_events e
    join envois v on v.resend_email_id = e.resend_email_id
  ),
  parmail as (
    select v.*,
      exists (select 1 from faits f where f.resend_email_id = v.resend_email_id and f.event_type = 'email.delivered') as delivre,
      exists (select 1 from faits f where f.resend_email_id = v.resend_email_id and f.event_type = 'email.opened' and not f.machine) as ouvert,
      exists (select 1 from faits f where f.resend_email_id = v.resend_email_id and f.event_type = 'email.clicked' and not f.machine) as clique,
      exists (select 1 from faits f where f.resend_email_id = v.resend_email_id and f.event_type = 'email.bounced') as rejete,
      exists (select 1 from faits f where f.resend_email_id = v.resend_email_id and f.event_type = 'email.complained') as plainte,
      exists (select 1 from faits f where f.resend_email_id = v.resend_email_id and f.event_type = 'email.opened' and f.machine) as ouvert_machine
    from envois v
  ),
  famille as (
    select case
      when domaine in ('gmail.com','googlemail.com') then 'Gmail'
      when domaine in ('hotmail.fr','hotmail.com','outlook.fr','outlook.com','live.fr','live.com','msn.com') then 'Microsoft'
      when domaine in ('yahoo.fr','yahoo.com','ymail.com') then 'Yahoo'
      when domaine in ('icloud.com','me.com') then 'Apple'
      else 'Autres' end as fournisseur, *
    from parmail
  )
  select jsonb_build_object(
    'debut', (select to_char(debut at time zone 'Europe/Paris', 'DD/MM/YYYY') from bornes),
    'fin', (select to_char((fin - interval '1 day') at time zone 'Europe/Paris', 'DD/MM/YYYY') from bornes),
    'envois', (select count(*) from parmail),
    'personnes', (select count(distinct email) from parmail),
    'delivres', (select count(*) filter (where delivre) from parmail),
    'ouvreurs', (select count(distinct email) filter (where ouvert) from parmail),
    'cliqueurs', (select count(distinct email) filter (where clique) from parmail),
    'rejets', (select count(*) filter (where rejete) from parmail),
    'plaintes', (select count(*) filter (where plainte) from parmail),
    'ouvertures_machine', (select count(*) filter (where ouvert_machine and not ouvert) from parmail),
    'desabonnements', (select count(*) from email_unsubscribes u, bornes b where u.created_at >= b.debut and u.created_at < b.fin),
    'par_fournisseur', (
      select coalesce(jsonb_agg(x order by x->>'personnes' desc), '[]'::jsonb) from (
        select jsonb_build_object(
          'fournisseur', fournisseur,
          'personnes', count(distinct email),
          'delivres_pct', round(100.0 * count(*) filter (where delivre) / nullif(count(*), 0), 1),
          'ouvreurs_pct', round(100.0 * count(distinct email) filter (where ouvert) / nullif(count(distinct email), 0), 1)
        ) as x
        from famille group by fournisseur having count(distinct email) >= 5
      ) t
    ),
    'par_campagne', (
      select coalesce(jsonb_agg(x order by x->>'campagne'), '[]'::jsonb) from (
        select jsonb_build_object(
          'campagne', campaign_slug,
          'envois', count(*),
          'personnes', count(distinct email),
          'ouvreurs_pct', round(100.0 * count(distinct email) filter (where ouvert) / nullif(count(distinct email), 0), 1)
        ) as x
        from parmail group by campaign_slug
      ) t
    )
  );
$$;

revoke all on function public.stats_delivrabilite_semaine(timestamptz) from public, anon;

-- Lundi 8h, heure de Paris. pg_cron travaille en UTC : 06h UTC l'été, 07h UTC
-- l'hiver. On déclenche aux deux heures, et la fonction ne retient que celle
-- qui tombe à 8h à Paris — le changement d'heure du 25/10/2026 est donc géré.
select cron.unschedule('rapport_delivrabilite_lundi')
where exists (select 1 from cron.job where jobname = 'rapport_delivrabilite_lundi');

select cron.schedule(
  'rapport_delivrabilite_lundi',
  '0 6,7 * * 1',
  $$
  select net.http_post(
    url := 'https://ktvszjzryabjgxyobtyc.supabase.co/functions/v1/rapport-delivrabilite',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
  $$
);
