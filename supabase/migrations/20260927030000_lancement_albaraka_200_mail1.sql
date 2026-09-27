-- ─────────────────────────────────────────────────────────────────────────
-- Lancement du mail 1 de la campagne « Al Baraka 200 €/mois ».
--
-- Le mail 1 était un geste manuel. Avec 5 431 destinataires en 19 lots de
-- 300, cela demanderait de relancer 19 fois en deux heures un lundi matin.
--
-- Cadence inégale, et c'est voulu : 10 minutes entre les 5 premiers lots,
-- 5 minutes ensuite. Les 1 500 premières adresses sont celles qui ont déjà
-- ouvert un de nos e-mails — c'est la phase où l'on surveille les rebonds et
-- où l'on veut le temps de couper. Passée sans incident, rien ne justifie
-- d'attendre.
--
-- La pause de 09h00 à 09h20 protège les relances post-conférence des 28, 29
-- et 30 : une campagne de 5 431 adresses qui sature l'expéditeur au même
-- moment ferait passer en spam un message attendu par 93 inscrits. La même
-- pause a été ajoutée à tick_albaraka_200() pour les mails 2 et 3.
--
-- Cron associé, à supprimer une fois la campagne partie :
--   select cron.schedule('albaraka_200_mail1_lancement', '* 6-9 28 9 *',
--                        $$ select public.tick_albaraka_200_mail1() $$);
--   select cron.unschedule('albaraka_200_mail1_lancement');
-- (06h00–09h59 UTC = 08h00–11h59 Paris, le 28 septembre uniquement.)
-- ─────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.tick_albaraka_200_mail1()
 RETURNS TABLE(action text, detail text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare
  v_now    timestamptz := now();
  v_paris  timestamp   := now() at time zone 'Europe/Paris';
  v_envois int;
  v_dernier timestamptz;
  v_reste  int;
  v_delai  interval;
  v_req    bigint;
begin
  -- Le jour du lancement, et lui seul.
  if v_paris::date <> date '2026-09-28' then
    action := 'hors_jour'; detail := v_paris::date::text; return next; return;
  end if;

  if v_paris::time < time '08:00' then
    action := 'pas_encore'; detail := 'depart a 08h00 Paris'; return next; return;
  end if;

  -- Les relances post-conference partent a 09h00. On leur laisse le tuyau
  -- calme : une campagne de 5 431 adresses qui sature l'expediteur au meme
  -- moment ferait passer en spam un message attendu par 93 inscrits.
  if v_paris::time >= time '09:00' and v_paris::time < time '09:20' then
    action := 'pause_conference'; detail := 'envois post-conference en cours'; return next; return;
  end if;

  select count(*), max(sent_at) into v_envois, v_dernier
  from email_campaign_sends
  where campaign_slug = 'albaraka_200_lancement' and email_seq = 1 and status = 'sent';

  -- Reste-t-il quelqu'un ? Les exclusions sont reevaluees ici aussi : qui
  -- achete pendant la campagne cesse d'en recevoir.
  select count(*) into v_reste
  from email_campaign_recipients r
  where r.campaign_slug = 'albaraka_200_lancement'
    and not exists (
      select 1 from email_campaign_sends es
      where es.campaign_slug = 'albaraka_200_lancement' and es.email_seq = 1
        and lower(trim(es.recipient_email)) = lower(trim(r.email)))
    and lower(trim(r.email)) not in (select x.email from public.emails_a_exclure_albaraka_200() x);

  if v_reste = 0 then
    action := 'termine'; detail := v_envois || ' envois'; return next; return;
  end if;

  -- 5 lots de 300 = 1 500 adresses : la phase de surveillance.
  v_delai := case when v_envois < 1500 then interval '10 minutes' else interval '5 minutes' end;

  if v_dernier is not null and v_now < v_dernier + v_delai then
    action := 'attend'; detail := 'prochain lot apres ' || to_char(v_dernier + v_delai at time zone 'Europe/Paris', 'HH24:MI');
    return next; return;
  end if;

  -- Garde-fou anti-doublon, identique au tick des mails 2 et 3 : si un envoi
  -- vient de partir, on le laisse finir plutot que d'en lancer un second.
  if exists (
    select 1 from email_campaign_sends es
    where es.campaign_slug = 'albaraka_200_lancement' and es.email_seq = 1
      and es.sent_at > v_now - interval '3 minutes') then
    action := 'en_cours'; return next; return;
  end if;

  v_req := net.http_post(
    url := 'https://ktvszjzryabjgxyobtyc.supabase.co/functions/v1/send-albaraka-200-mail',
    body := jsonb_build_object('seq', 1, 'max', 300),
    headers := '{"Content-Type":"application/json"}'::jsonb,
    timeout_milliseconds := 145000);

  action := 'declenche';
  detail := v_reste || ' restant(s), delai ' || v_delai;
  return next;
end;
$function$;

revoke all on function public.tick_albaraka_200_mail1() from public, anon, authenticated;

comment on function public.tick_albaraka_200_mail1 is
  'Declenche le mail 1 de la campagne Al Baraka 200, par lots de 300, le 28/09/2026 a partir de 08h00 Paris. Pause de 09h00 a 09h20 pour les envois post-conference.';
