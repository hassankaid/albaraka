-- Séquence e-mail du tunnel Liberty.
--
-- Elle ne ressemble à aucune de celles déjà en place. Les envois de conférence
-- suivent un CALENDRIER COMMUN — tout le monde reçoit le rappel du samedi 19h,
-- quelle que soit sa date d'inscription. Ici, chaque inscrit a son propre
-- calendrier : la confirmation part à son inscription, puis un message par jour
-- à 9h, à partir du lendemain. Deux personnes inscrites à deux jours d'écart
-- reçoivent le même message à deux jours d'écart.
--
-- D'où ce découpage : une fonction dit QUI est dû pour un message donné, et le
-- tick appelle la fonction d'envoi pour ceux-là. Aucune table de planification
-- — l'échéance se recalcule à partir de la date d'inscription, et le journal
-- d'envois (`email_campaign_sends`) fait foi pour ce qui est déjà parti.

-- Première inscription possible : le jour de la mise en ligne du tunnel.
--
-- Ce plancher n'est pas décoratif. Sans lui, un lead ancien dont la source
-- deviendrait « liberty » par accident recevrait les cinq messages d'affilée,
-- à la minute. C'est le genre d'incident qu'on ne voit qu'une fois parti.
create or replace function public.debut_sequence_liberty()
returns date language sql immutable as $$ select date '2026-09-22' $$;

/**
 * Qui doit recevoir le message `p_seq` de la séquence Liberty, maintenant.
 *
 * Échéances, en heure de Paris :
 *   1 → à l'inscription          (confirmation, porte le lien de la vidéo)
 *   2 → lendemain 9h
 *   3 → surlendemain 9h
 *   4 → J+3 9h
 *   5 → J+4 9h
 *
 * Les messages 2 à 5 ont une fenêtre de 6 heures : passé 15h, l'échéance est
 * abandonnée plutôt que rattrapée. Un « bonjour, voici la suite » qui tombe à
 * 23h fait plus de mal que de bien, et le lendemain le message suivant prend
 * le relais. La confirmation, elle, n'expire pas : elle porte le lien que la
 * personne attend, tard vaut mieux que jamais.
 *
 * Exclusions, évaluées AU MOMENT de l'envoi : désabonnés, adresses en erreur,
 * plaintes pour spam, et — à partir du message 2 — ceux qui ont déjà réservé
 * un appel ou acheté. Relancer « réserve ton appel » quelqu'un qui vient de
 * réserver est la meilleure façon de perdre le rendez-vous.
 */
create or replace function public.destinataires_sequence_liberty(p_seq integer)
returns table (email text, first_name text)
language sql
stable
security definer
set search_path to 'public'
as $$
  with inscrits as (
    -- Une personne peut avoir plusieurs leads ; c'est sa PREMIÈRE arrivée sur
    -- le tunnel qui cale sa séquence.
    select distinct on (lower(trim(ct.email)))
           lower(trim(ct.email)) as email,
           -- Même extraction que pour les conférences : `contacts` ne porte
           -- qu'un `full_name`, le prénom en est le premier mot.
           nullif(initcap(split_part(trim(ct.full_name), ' ', 1)), '') as first_name,
           l.contact_id          as contact_id,
           l.created_at          as inscrit_le
    from leads l
    join contacts ct on ct.id = l.contact_id
    where l.source like 'liberty%'
      and ct.email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[a-z]{2,}$'
      and l.created_at >= debut_sequence_liberty()
    order by lower(trim(ct.email)), l.created_at
  ),
  echeances as (
    select i.*,
           case
             when p_seq <= 1 then i.inscrit_le
             else ((((i.inscrit_le at time zone 'Europe/Paris')::date + (p_seq - 1))
                     + time '09:00') at time zone 'Europe/Paris')
           end as prevu_a
    from inscrits i
  )
  select e.email, e.first_name
  from echeances e
  where e.prevu_a <= now()
    and (p_seq <= 1 or e.prevu_a > now() - interval '6 hours')
    and not exists (
      select 1 from email_campaign_sends s
      where s.campaign_slug = 'tunnel_liberty'
        and s.email_seq = p_seq
        and lower(trim(s.recipient_email)) = e.email)
    and not exists (
      select 1 from email_unsubscribes u where u.email = e.email)
    and not exists (
      select 1
      from email_campaign_sends s
      join email_campaign_events ev on ev.resend_email_id = s.resend_email_id
      where lower(trim(s.recipient_email)) = e.email
        and ev.event_type in ('email.bounced', 'email.complained'))
    and (p_seq <= 1 or not exists (
      select 1 from calls k
      where k.contact_id = e.contact_id and k.created_at >= e.inscrit_le))
    and (p_seq <= 1 or not exists (
      select 1 from sales v
      where v.contact_id = e.contact_id and v.created_at >= e.inscrit_le))
  order by e.email;
$$;

/**
 * Déclenche les messages dus. Appelée toutes les minutes par pg_cron.
 *
 * Un seul appel en vol par message : la fonction d'envoi n'écrit son journal
 * qu'au fil de l'eau, et relancer pendant qu'elle tourne repart d'un journal
 * incomplet — c'est ce qui avait produit 353 doublons sur la conférence du
 * 31/05/2026. D'où le verrou de trois minutes.
 */
create or replace function public.tick_sequence_liberty()
returns table (seq integer, action text, detail text)
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  s integer;
  n integer;
  v_req bigint;
begin
  for s in 1..5 loop
    select count(*) into n from destinataires_sequence_liberty(s);
    if n = 0 then
      continue;
    end if;

    if exists (
      select 1 from email_campaign_sends es
      where es.campaign_slug = 'tunnel_liberty'
        and es.email_seq = s
        and es.sent_at > now() - interval '3 minutes'
    ) then
      continue;
    end if;

    v_req := net.http_post(
      url := 'https://ktvszjzryabjgxyobtyc.supabase.co/functions/v1/send-liberty-mail',
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
$$;

grant execute on function public.destinataires_sequence_liberty(integer) to service_role;
grant execute on function public.tick_sequence_liberty() to service_role;
