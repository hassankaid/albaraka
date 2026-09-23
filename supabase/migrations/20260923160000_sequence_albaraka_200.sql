-- ─────────────────────────────────────────────────────────────────────────
-- Séquence de lancement « Al Baraka 200 €/mois » — trois mails, une fois.
--
-- Ce n'est pas une séquence qui tourne : c'est une campagne one-shot. Le
-- mail 1 part le jour où Sidali donne le feu vert, les mails 2 et 3 suivent
-- à J+1 et J+2, à la même heure.
--
-- Pas de table de configuration pour la date de lancement : la date, c'est
-- le premier envoi du mail 1. Tant qu'il n'a pas eu lieu, le tick ne fait
-- rien. Une case en moins à remplir, et une case en moins à oublier.
--
-- Le périmètre se charge dans `email_campaign_recipients` sous le slug
-- `albaraka_200_lancement`. Il n'est pas défini au moment où ceci est écrit.
-- ─────────────────────────────────────────────────────────────────────────

-- ── Qui ne doit rien recevoir ────────────────────────────────────────────
--
-- Évalué À CHAQUE envoi, pas une fois pour toutes : quelqu'un qui achète
-- après le mail 1 ne doit pas recevoir le mail 2 qui lui dit « regarde la
-- vidéo ». C'est le genre de détail qui fait passer une campagne soignée
-- pour du spam.
create or replace function public.emails_a_exclure_albaraka_200()
returns table(email text, motif text)
language sql
stable
security definer
set search_path to 'public'
as $function$
  -- Adresses qui ont rebondi ou signalé un spam, toutes campagnes confondues.
  select distinct lower(trim(s.recipient_email)), 'adresse en erreur ou plainte'
  from email_campaign_sends s
  join email_campaign_events e on e.resend_email_id = s.resend_email_id
  where e.event_type in ('email.bounced', 'email.complained')

  union

  select distinct lower(trim(u.email)), 'désabonné'
  from email_unsubscribes u

  union

  -- Déjà dans l'écosystème : leur proposer d'y entrer n'a aucun sens.
  select distinct lower(trim(p.email)), 'a déjà un Pass actif'
  from profiles p
  join user_passes up on up.user_id = p.id and up.revoked_at is null
  where p.email is not null

  union

  -- A acheté l'offre depuis le début de la campagne.
  select distinct lower(trim(ct.email)), 'a acheté'
  from sales sa
  join contacts ct on ct.id = sa.contact_id
  where ct.email is not null
    and sa.product = 'Al Baraka 200 €/mois'

  union

  -- A déjà réservé son appel sur l'agenda de cette offre : le mail suivant
  -- lui redemanderait de faire ce qu'il a déjà fait.
  select distinct lower(trim(ct.email)), 'a réservé un appel'
  from calls k
  join contacts ct on ct.id = k.contact_id
  where ct.email is not null
    and k.event_type = 'al_baraka_200';
$function$;

revoke all on function public.emails_a_exclure_albaraka_200() from public, anon, authenticated;
grant execute on function public.emails_a_exclure_albaraka_200() to service_role;

comment on function public.emails_a_exclure_albaraka_200 is
  'Adresses a ne pas solliciter pour la campagne de lancement Al Baraka 200 EUR/mois : erreurs, plaintes, desabonnes, deja clients, acheteurs et personnes ayant deja reserve un appel.';


-- ── Le tick : mails 2 et 3, un jour après l'autre ────────────────────────
--
-- Il ne déclenche JAMAIS le mail 1. Le lancement reste un geste humain ;
-- ce qui s'automatise, c'est la suite, pour qu'elle ne dépende pas de
-- quelqu'un qui pense à cliquer deux matins de suite.
create or replace function public.tick_albaraka_200()
returns table(seq smallint, action text, detail text)
language plpgsql
security definer
set search_path to 'public', 'extensions'
as $function$
declare
  v_depart timestamptz;
  v_heure time;
  v_req bigint;
  s smallint;
  n int;
begin
  -- Le premier envoi du mail 1 fait office de date de lancement.
  select min(sent_at) into v_depart
  from email_campaign_sends
  where campaign_slug = 'albaraka_200_lancement' and email_seq = 1 and status = 'sent';

  if v_depart is null then
    seq := null; action := 'en_attente';
    detail := 'le mail 1 n''est pas parti : rien à enchaîner';
    return next;
    return;
  end if;

  v_heure := (v_depart at time zone 'Europe/Paris')::time;

  for s in 2..3 loop
    -- Le mail s part s-1 jours après le lancement, pas avant l'heure du
    -- lancement : une campagne partie à 10h ne doit pas relancer à 00h01.
    continue when (now() at time zone 'Europe/Paris')
                  < ((v_depart at time zone 'Europe/Paris')::date + (s - 1) * interval '1 day' + v_heure);

    -- Reste-t-il quelqu'un qui n'a pas reçu ce message ?
    select count(*) into n
    from email_campaign_recipients r
    where r.campaign_slug = 'albaraka_200_lancement'
      and not exists (
        select 1 from email_campaign_sends es
        where es.campaign_slug = 'albaraka_200_lancement'
          and es.email_seq = s
          and lower(trim(es.recipient_email)) = lower(trim(r.email))
      )
      and lower(trim(r.email)) not in (select x.email from public.emails_a_exclure_albaraka_200() x);

    if n = 0 then
      continue;
    end if;

    -- Garde-fou anti-doublon : si un envoi vient de partir, on laisse finir.
    if exists (
      select 1 from email_campaign_sends es
      where es.campaign_slug = 'albaraka_200_lancement'
        and es.email_seq = s
        and es.sent_at > now() - interval '3 minutes'
    ) then
      continue;
    end if;

    v_req := net.http_post(
      url := 'https://ktvszjzryabjgxyobtyc.supabase.co/functions/v1/send-albaraka-200-mail',
      body := jsonb_build_object('seq', s, 'max', 300),
      headers := '{"Content-Type":"application/json"}'::jsonb,
      timeout_milliseconds := 145000
    );

    seq := s;
    action := 'declenche';
    detail := n || ' destinataire(s)';
    return next;
  end loop;
end;
$function$;

revoke all on function public.tick_albaraka_200() from public, anon, authenticated;
grant execute on function public.tick_albaraka_200() to service_role;

comment on function public.tick_albaraka_200 is
  'Enchaine les mails 2 et 3 de la campagne Al Baraka 200 EUR/mois, a J+1 et J+2 de l''envoi du mail 1, a la meme heure. Ne declenche jamais le mail 1.';


-- ── Le cron ──────────────────────────────────────────────────────────────
--
-- Toutes les dix minutes. Tant que le mail 1 n'est pas parti, le tick sort
-- sur un seul min() et ne fait rien : la campagne dort jusqu'au feu vert.
-- Ensuite, il rattrape l'heure du lancement à dix minutes près pour les
-- mails 2 et 3 — l'heure exacte n'étant connue qu'au moment du départ.
select cron.schedule(
  'albaraka_200_lancement_auto',
  '*/10 * * * *',
  $$ select public.tick_albaraka_200() $$
);
