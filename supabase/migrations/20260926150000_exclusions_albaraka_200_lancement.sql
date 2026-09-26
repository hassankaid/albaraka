-- ─────────────────────────────────────────────────────────────────────────
-- Périmètre d'exclusion de la campagne « Al Baraka 200 €/mois ».
--
-- Arrêté avec Hassan le 26/09/2026, la veille du lancement. Deux changements
-- par rapport à la version du 23/09 :
--
--  1. « a acheté CETTE offre » devient « a la moindre ligne de vente », quel
--     que soit le produit ET quel que soit le statut de paiement — y compris
--     `lost`, `in_progress` et `late`. Proposer une offre d'entrée à
--     quelqu'un dont le paiement est en cours, ou qui a déjà été client et
--     est parti, coûte plus cher que l'opportunité manquée.
--
--  2. Les inscrits aux conférences du 20/09 et du 27/09 sont écartés : ils
--     reçoivent déjà une autre communication, et celle du 27/09 a lieu le
--     matin même du lancement.
--
-- Ces règles vivent ICI et non dans le périmètre chargé, parce que la
-- fonction est réévaluée avant CHACUN des trois mails : quelqu'un qui achète
-- entre le mail 1 et le mail 2 doit cesser d'en recevoir. Un périmètre figé
-- au chargement ne saurait pas faire ça.
-- ─────────────────────────────────────────────────────────────────────────
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

  -- TOUTE vente, tout produit, tout statut. Volontairement large.
  select distinct lower(trim(ct.email)), 'client — a une vente'
  from sales sa
  join contacts ct on ct.id = sa.contact_id
  where ct.email is not null

  union

  -- Même règle, pour les ventes rattachées à un compte plutôt qu'à un contact.
  select distinct lower(trim(pr.email)), 'client — a une vente'
  from sales sa
  join profiles pr on pr.id = sa.buyer_profile_id
  where pr.email is not null

  union

  -- Inscrits aux deux conférences en cours : une autre séquence leur parle
  -- déjà, et celle du 27/09 tombe le matin du lancement.
  select distinct lower(trim(ct.email)), 'inscrit à une conférence en cours'
  from leads l
  join contacts ct on ct.id = l.contact_id
  where ct.email is not null
    and l.conference_date in (date '2026-09-20', date '2026-09-27')

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
  'Exclusions campagne Al Baraka 200 EUR/mois : erreurs, plaintes, desabonnes, Pass actif, TOUTE vente (tout statut), inscrits conferences 20/09 et 27/09, appels deja reserves.';
