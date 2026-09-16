-- Désabonnement e-mail : le maillon qui manquait
--
-- Jusqu'ici le seul moyen de partir était un lien « mailto: » vers
-- contact@albarakaecosysteme.com — une adresse qui ne reçoit rien (le domaine
-- n'a aucun enregistrement MX). Autrement dit : aucun moyen de se désabonner.
-- Le destinataire agacé n'avait qu'un bouton à sa disposition, « Spam ».
-- La campagne du 31/05 a fini à 0,28 % de plaintes, pour un seuil rouge de
-- 0,30 % chez Google.

create table if not exists public.email_unsubscribes (
  email      text primary key,
  motif      text,
  source     text not null default 'lien',
  created_at timestamptz not null default now()
);

comment on table public.email_unsubscribes is
  'Adresses qui ne doivent plus recevoir d''envois de campagne. Exclues par emails_a_exclure_conference.';

-- Un jeton par adresse, stable dans le temps : le lien de désabonnement reste
-- valable même dans un vieux message.
create table if not exists public.email_unsubscribe_tokens (
  email      text primary key,
  token      text not null unique default encode(extensions.gen_random_bytes(16), 'hex'),
  created_at timestamptz not null default now()
);

alter table public.email_unsubscribes enable row level security;
alter table public.email_unsubscribe_tokens enable row level security;

drop policy if exists desabonnements_select_ceo on public.email_unsubscribes;
create policy desabonnements_select_ceo on public.email_unsubscribes
  for select using (public.is_ceo(auth.uid()));

drop policy if exists jetons_desabonnement_select_ceo on public.email_unsubscribe_tokens;
create policy jetons_desabonnement_select_ceo on public.email_unsubscribe_tokens
  for select using (public.is_ceo(auth.uid()));

-- Jetons d'un lot de destinataires, créés au besoin.
create or replace function public.jetons_desabonnement_email(p_emails text[])
returns table (email text, token text)
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  insert into public.email_unsubscribe_tokens (email)
  select distinct lower(trim(e))
  from unnest(p_emails) as e
  where e is not null and trim(e) <> ''
  on conflict (email) do nothing;

  return query
  select t.email, t.token
  from public.email_unsubscribe_tokens t
  where t.email in (
    select distinct lower(trim(e)) from unnest(p_emails) as e where e is not null
  );
end;
$$;

-- Désabonnement effectif. Renvoie l'adresse traitée, ou null si le jeton est
-- inconnu — sans jamais révéler l'adresse associée à un jeton invalide.
create or replace function public.desabonner_email(p_token text, p_source text default 'lien')
returns text
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_email text;
begin
  select t.email into v_email
  from public.email_unsubscribe_tokens t
  where t.token = p_token;

  if v_email is null then
    return null;
  end if;

  insert into public.email_unsubscribes (email, source)
  values (v_email, coalesce(nullif(p_source, ''), 'lien'))
  on conflict (email) do nothing;

  return v_email;
end;
$$;

revoke all on function public.jetons_desabonnement_email(text[]) from public, anon, authenticated;
revoke all on function public.desabonner_email(text, text) from public, anon, authenticated;

-- Les désabonnés rejoignent les adresses en erreur et les plaintes dans la
-- liste d'exclusion appliquée juste avant chaque envoi.
create or replace function public.emails_a_exclure_conference(p_conference_date date, p_post_conference boolean)
returns table(email text, motif text)
language sql
stable
security definer
set search_path to 'public'
as $$
  with debut as (
    select ((p_conference_date + coalesce(c.starts_at_local, time '11:00')) at time zone 'Europe/Paris') as ts
    from conferences c
    where c.conference_date = p_conference_date
  ),
  inscrits as (
    select distinct l.contact_id, lower(trim(ct.email)) as email
    from leads l
    join contacts ct on ct.id = l.contact_id
    where l.conference_date = p_conference_date
      and ct.email is not null
  )
  select distinct lower(trim(s.recipient_email)), 'adresse en erreur ou plainte'
  from email_campaign_sends s
  join email_campaign_events e on e.resend_email_id = s.resend_email_id
  where e.event_type in ('email.bounced', 'email.complained')

  union

  select u.email, 'désabonné'
  from email_unsubscribes u

  union

  select i.email, 'a réservé un appel depuis le live'
  from inscrits i, debut d
  where p_post_conference
    and exists (select 1 from calls k where k.contact_id = i.contact_id and k.created_at >= d.ts)

  union

  select i.email, 'a acheté depuis le live'
  from inscrits i, debut d
  where p_post_conference
    and exists (select 1 from sales s where s.contact_id = i.contact_id and s.created_at >= d.ts);
$$;
