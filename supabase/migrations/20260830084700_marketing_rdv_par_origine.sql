-- Rendez-vous ventiles par agenda d'origine. Applique en production le 30/08/2026.
--
-- Un RDV pris sur l'evenement de la conference, un autre sous la video du
-- tunnel VSL et un troisieme depuis la page temoignages n'ont pas la meme
-- valeur : le premier vient d'assister au direct, le deuxieme ne l'a pas vu, le
-- troisieme revient de lui-meme. Un « nombre de RDV » global masque exactement
-- la difference qu'on cherche a piloter.
--
-- Les trois familles existaient DEJA comme `calls.event_type` distincts, posees
-- par `webhook-calendly` le 24/08/2026 : cette fonction ne fait que les nommer.
-- Les libelles historiques sont repris pour que les mois passes restent
-- lisibles au lieu de tomber en bloc dans « autre » (840 conference, 379 vsl,
-- 2 retargeting, 52 hors perimetre sur tout l'historique).

create or replace function public.marketing_origine_rdv(p_event_type text)
returns text language sql immutable as $$
  select case
    when p_event_type is null then 'autre'
    when p_event_type = 'appel_vsl_tunnel'   then 'vsl'
    when p_event_type = 'appel_temoignages'  then 'retargeting'
    when lower(p_event_type) in ('inscription_conference', 'inscription conférence') then 'conference'
    when p_event_type ilike '%vsl%'           then 'vsl'
    when p_event_type ilike '%rediffusion%'   then 'retargeting'
    when p_event_type ilike '%setting%webi%'  then 'conference'
    when p_event_type ilike '%conf%'          then 'conference'
    else 'autre'
  end;
$$;

comment on function public.marketing_origine_rdv(text) is
  'Agenda d''origine d''un rendez-vous : conference, vsl, retargeting, autre. Les UUID Calendly changent a chaque recreation d''agenda — c''est `webhook-calendly` qui fait la correspondance, pas cette fonction.';

create or replace function public.marketing_rdv(p_mode text, p_from date, p_to date)
returns table (origine text, rdv bigint, annules bigint, no_show bigint, honores bigint)
language plpgsql stable security definer set search_path = public
as $$
declare
  v_role text := coalesce(public.get_user_role(), '');
begin
  -- coalesce indispensable : sans lui, un appelant sans profil passe
  -- (NULL not in (...) vaut NULL, pas TRUE).
  if v_role not in ('ceo', 'agence') then
    raise exception 'acces_refuse' using errcode = '42501';
  end if;
  if p_mode not in ('conference', 'calendrier') then
    raise exception 'mode_inconnu: %', p_mode;
  end if;

  return query
  select public.marketing_origine_rdv(c.event_type) as origine,
         count(*)::bigint,
         count(*) filter (where c.status = 'annule')::bigint,
         count(*) filter (where c.status = 'no_show')::bigint,
         -- « Honore » = le rendez-vous a eu lieu, quelle qu'en soit l'issue.
         count(*) filter (where c.status not in ('annule', 'no_show', 'planifie'))::bigint
  from public.calls c
  where case p_mode
          when 'conference' then c.conference_date between p_from and p_to
          else (coalesce(c.scheduled_at, c.created_at) at time zone 'Europe/Paris')::date between p_from and p_to
        end
  group by 1
  order by 2 desc;
end;
$$;

revoke all on function public.marketing_rdv(text, date, date) from public, anon;
grant execute on function public.marketing_rdv(text, date, date) to authenticated;
