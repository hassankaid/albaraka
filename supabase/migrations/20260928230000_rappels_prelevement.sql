-- ─────────────────────────────────────────────────────────────────────────
-- Rappel avant prélèvement (demande de Hassan le 28/09/2026).
--
-- Trois jours avant chaque prélèvement automatique par carte, à 10 h (Paris),
-- le client reçoit un email : montant, date, veille à laquelle son compte doit
-- être approvisionné. Texte validé par Hassan le 28/09/2026 — voir la fonction
-- `rappel-prelevement`.
--
-- ⚠️ UN RAPPEL N'EST ENVOYÉ QUE SI LA PLATEFORME ET STRIPE SONT D'ACCORD.
-- L'échéancier de la plateforme a déjà divergé de Stripe (dossier BAMAR GUEYE,
-- 28/09/2026). Annoncer un mauvais montant ou une mauvaise date serait pire
-- que ne rien envoyer. Donc :
--   - échéance « pending » en base ET renouvellement Stripe le même jour → envoi,
--     avec le montant que Stripe va RÉELLEMENT prélever (remises comprises) ;
--   - l'un sans l'autre → pas d'email, une ANOMALIE consignée ici. Le cas
--     « Stripe va prélever, la plateforme n'attend rien » est précisément
--     l'abonnement soldé qui continuerait de prélever : on le voit AVANT le débit.
-- ─────────────────────────────────────────────────────────────────────────

-- ── Journal des rappels (et garde-fou contre les doublons) ────────────────
create table if not exists public.rappels_prelevement (
  id                     uuid primary key default gen_random_uuid(),
  stripe_subscription_id text not null,
  date_prelevement       date not null,
  payment_id             uuid references public.payments(id) on delete set null,
  contact_id             uuid references public.contacts(id) on delete set null,
  -- envoye | anomalie | ignore | erreur
  statut                 text not null check (statut in ('envoye', 'anomalie', 'ignore', 'erreur')),
  motif                  text,
  montant                numeric(10, 2),
  email                  text,
  resend_email_id        text,
  created_at             timestamptz not null default now()
);

comment on table public.rappels_prelevement is
  'Rappels envoyés 3 jours avant un prélèvement automatique, et anomalies plateforme/Stripe détectées à cette occasion. Lecture CEO.';

-- Un seul rappel envoyé par abonnement et par date de prélèvement, quoi qu'il
-- arrive (tâche rejouée, deux déclenchements le même jour).
create unique index if not exists rappels_prelevement_un_envoi
  on public.rappels_prelevement (stripe_subscription_id, date_prelevement)
  where statut = 'envoye';
create index if not exists rappels_prelevement_date on public.rappels_prelevement (date_prelevement desc);

alter table public.rappels_prelevement enable row level security;
drop policy if exists rappels_prelevement_ceo on public.rappels_prelevement;
create policy rappels_prelevement_ceo on public.rappels_prelevement
  for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'ceo'));
grant select on public.rappels_prelevement to authenticated;

-- ── Secrets internes ──────────────────────────────────────────────────────
--
-- Jetons partagés entre les tâches planifiées (pg_cron) et les fonctions
-- qu'elles appellent. RLS activée SANS AUCUNE politique, et aucun droit pour
-- anon ni authenticated : seuls le service_role (fonctions) et postgres
-- (pg_cron) les lisent.
--
-- ⚠️ PAS `app_settings` : cette table est lisible par tout utilisateur
-- connecté (politique `app_settings_read_authenticated`, constaté le
-- 28/09/2026). Un secret n'a rien à y faire.
create table if not exists public.secrets_internes (
  cle        text primary key,
  valeur     text not null,
  created_at timestamptz not null default now()
);
alter table public.secrets_internes enable row level security;
revoke all on public.secrets_internes from anon, authenticated;

insert into public.secrets_internes (cle, valeur)
values ('rappel_prelevement', encode(extensions.gen_random_bytes(24), 'hex'))
on conflict (cle) do nothing;

-- ── Déclenchement ─────────────────────────────────────────────────────────
--
-- Appelé par pg_cron. Deux créneaux UTC (08 h et 09 h) pour tomber sur 10 h à
-- Paris été comme hiver : la fonction ne travaille que si l'heure de Paris est
-- 10 h, et le journal empêche tout doublon.
create or replace function public.tick_rappel_prelevement()
returns bigint
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_req bigint;
begin
  if extract(hour from (now() at time zone 'Europe/Paris')) <> 10 then
    return null;
  end if;
  v_req := net.http_post(
    url := 'https://ktvszjzryabjgxyobtyc.supabase.co/functions/v1/rappel-prelevement',
    body := jsonb_build_object('mode', 'envoi'),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-jeton-interne', (select valeur from secrets_internes where cle = 'rappel_prelevement')
    ),
    timeout_milliseconds := 120000
  );
  return v_req;
end;
$$;

revoke all on function public.tick_rappel_prelevement() from public, anon, authenticated;

-- La tâche planifiée n'est PAS créée ici : elle ne l'est qu'après validation
-- par Hassan de la première liste de rappels (aperçu sans envoi).
--   select cron.schedule('rappel_prelevement_quotidien', '0 8,9 * * *',
--                        $$ select public.tick_rappel_prelevement() $$);
