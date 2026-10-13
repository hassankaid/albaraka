-- ─────────────────────────────────────────────────────────────────────────
-- Mon Activité : nombre de no-show (Sidali, 13/10/2026).
-- Présents = RDV obtenus − no-show ; les taux de présence et de closing se
-- calculent sur les présents (côté application). Les journées déjà saisies
-- comptent 0 no-show.
-- ─────────────────────────────────────────────────────────────────────────

alter table public.activity_daily_kpis
  add column if not exists no_shows integer not null default 0;

alter table public.activity_daily_kpis
  drop constraint if exists activity_daily_kpis_no_shows_check;
alter table public.activity_daily_kpis
  add constraint activity_daily_kpis_no_shows_check
  check (no_shows >= 0 and no_shows <= appointments);

create or replace view public.activity_weekly_totals as
 select user_id,
    (date_trunc('week'::text, (entry_date)::timestamp with time zone))::date as week_start,
    (sum(videos_published))::integer as videos_published,
    (sum(messages_sent))::integer as messages_sent,
    (sum(replies_received))::integer as replies_received,
    (sum(appointments))::integer as appointments,
    (sum(sales_made))::integer as sales_made,
    (count(*))::integer as days_filled,
    (sum(no_shows))::integer as no_shows
   from public.activity_daily_kpis
  group by user_id, (date_trunc('week'::text, (entry_date)::timestamp with time zone));
