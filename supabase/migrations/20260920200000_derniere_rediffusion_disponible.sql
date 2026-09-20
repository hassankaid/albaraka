-- Quelle est la rediffusion en ligne en ce moment ?
--
-- La page de disqualification A du funnel de prise de rendez-vous répond
-- « seules les personnes ayant regardé la conférence peuvent réserver ». Sans
-- lien vers la rediffusion, c'était un cul-de-sac : la personne apprend ce qui
-- lui manque et n'a aucun moyen de le combler. On lui propose donc la
-- rediffusion la plus récente.
--
-- Le funnel `/rdv-rediffusion` est générique — il ne porte pas de jeton de
-- conférence — d'où cette lecture côté serveur plutôt qu'un lien en dur : la
-- page suit d'elle-même la dernière conférence dont la rediffusion est prête.
--
-- Lecture seule, et ne renvoie que ce qui est déjà public sur /redif/<jeton>.
create or replace function public.derniere_rediffusion_disponible()
returns table (conference_date date, token text)
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
  select c.conference_date, c.token
  from public.conferences c
  where c.status = 'ready'
    and c.replay_url is not null
  order by c.conference_date desc
  limit 1;
$$;

grant execute on function public.derniere_rediffusion_disponible() to anon, authenticated, service_role;
