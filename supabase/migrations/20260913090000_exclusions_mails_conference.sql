-- ═══════════════════════════════════════════════════════════════════════
-- Qui ne doit pas recevoir un mail de la séquence d'une conférence.
--
-- POURQUOI. À partir du 13/09/2026, cinq mails suivent la conférence (dimanche
-- 14h → mercredi 19h), tous avec « réserve ton appel ». Relancer quelqu'un qui
-- a déjà réservé, ou déjà acheté, gâche la relation et fait passer la marque
-- pour un robot. La liste est calculée au moment de CHAQUE envoi par
-- send-conference-mail : quelqu'un qui réserve lundi sort de la séquence mardi.
--
-- DEUX NIVEAUX.
--   - Toujours : les adresses qui ont déjà rebondi (email.bounced) ou signalé
--     un mail comme spam (email.complained). Continuer à leur écrire dégrade la
--     réputation de l'expéditeur pour tout le monde.
--   - Après la conférence (p_post_conference) : les contacts inscrits à cette
--     conférence qui ont un appel créé, ou une vente, depuis le début du live
--     (heure de début de la fiche, à Paris).
-- ═══════════════════════════════════════════════════════════════════════

create or replace function public.emails_a_exclure_conference(p_conference_date date, p_post_conference boolean)
returns table(email text, motif text)
language sql
stable
security definer
set search_path to 'public'
as $function$
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

  select i.email, 'a réservé un appel depuis le live'
  from inscrits i, debut d
  where p_post_conference
    and exists (select 1 from calls k where k.contact_id = i.contact_id and k.created_at >= d.ts)

  union

  select i.email, 'a acheté depuis le live'
  from inscrits i, debut d
  where p_post_conference
    and exists (select 1 from sales s where s.contact_id = i.contact_id and s.created_at >= d.ts);
$function$;

revoke all on function public.emails_a_exclure_conference(date, boolean) from public, anon, authenticated;
grant execute on function public.emails_a_exclure_conference(date, boolean) to service_role;
