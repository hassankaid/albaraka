-- ─────────────────────────────────────────────────────────────────────────
-- Tableau de bord « Consommation IA » (admin) et colonnes du « Suivi Élèves ».
-- Lecture seule, réservée au CEO (rien n'est renvoyé aux autres).
-- « Vidéos » = vidéos importées dans le Studio et comptées au quota (compte_le).
-- ─────────────────────────────────────────────────────────────────────────

create or replace function public.ia_tableau(p_debut timestamptz, p_fin timestamptz default now())
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with j as (
    select * from ia_consommations where cree_le >= p_debut and cree_le < p_fin
  ),
  videos as (
    select user_id, count(*) as n from studio_montages
     where compte_le >= p_debut and compte_le < p_fin group by user_id
  ),
  par_user as (
    select coalesce(a.user_id, v.user_id) as user_id,
           coalesce(a.cout, 0) as cout, coalesce(a.cout_studio, 0) as cout_studio,
           coalesce(a.appels, 0) as appels, a.dernier, coalesce(v.n, 0) as videos
      from (select user_id, sum(cout_usd) as cout,
                   sum(cout_usd) filter (where fonctionnalite like 'studio%') as cout_studio,
                   count(*) as appels, max(cree_le) as dernier
              from j where user_id is not null group by user_id) a
      full join videos v on v.user_id = a.user_id
  )
  select case when not is_ceo(auth.uid()) then null else jsonb_build_object(
    'credit', studio_config_valeur('credit_ia'),
    'seuil', studio_config_valeur('credit_alerte_seuil'),
    'totaux', (select jsonb_build_object(
                 'cout', round(coalesce(sum(cout_usd), 0), 4), 'appels', count(*),
                 'utilisateurs', count(distinct user_id),
                 'videos', (select coalesce(sum(n), 0) from videos),
                 'cout_studio', round(coalesce(sum(cout_usd) filter (where fonctionnalite like 'studio_%' and fonctionnalite <> 'studio_banque'), 0), 4))
               from j),
    'par_jour', coalesce((select jsonb_agg(x order by x.jour) from (
                  select (cree_le at time zone 'Europe/Paris')::date as jour, round(sum(cout_usd), 4) as cout, count(*) as appels
                    from j group by 1) x), '[]'::jsonb),
    'par_fonctionnalite', coalesce((select jsonb_agg(x) from (
                  select fonctionnalite, count(*) as appels, round(sum(cout_usd), 4) as cout,
                         count(distinct user_id) as utilisateurs, max(cree_le) as dernier,
                         count(*) filter (where statut = 'erreur') as erreurs
                    from j group by fonctionnalite) x), '[]'::jsonb),
    'par_utilisateur', coalesce((select jsonb_agg(x order by x.cout desc, x.videos desc) from (
                  select u.user_id, coalesce(p.full_name, p.email, 'Compte supprimé') as nom, p.email, p.role,
                         (select string_agg(distinct up.pass_type::text, ', ') from user_passes up
                           where up.user_id = u.user_id and up.revoked_at is null) as pass,
                         round(u.cout, 4) as cout, round(u.cout_studio, 4) as cout_studio,
                         round(u.cout - u.cout_studio, 4) as cout_autres, u.appels, u.videos, u.dernier
                    from par_user u left join profiles p on p.id = u.user_id) x), '[]'::jsonb)
  ) end;
$$;

create or replace function public.ia_detail_utilisateur(p_user uuid, p_debut timestamptz, p_fin timestamptz default now())
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select case when not is_ceo(auth.uid()) then null else jsonb_build_object(
    'par_fonctionnalite', coalesce((select jsonb_agg(x) from (
        select fonctionnalite, count(*) as appels, round(sum(cout_usd), 4) as cout, max(cree_le) as dernier
          from ia_consommations where user_id = p_user and cree_le >= p_debut and cree_le < p_fin
         group by fonctionnalite order by 3 desc) x), '[]'::jsonb),
    'derniers', coalesce((select jsonb_agg(x) from (
        select cree_le, fonctionnalite, modele, tokens_entree, tokens_sortie, round(cout_usd, 4) as cout, statut, reference
          from ia_consommations where user_id = p_user and cree_le >= p_debut and cree_le < p_fin
         order by cree_le desc limit 30) x), '[]'::jsonb)
  ) end;
$$;

-- pour le « Suivi Élèves » : depuis le début, vidéos Studio et coût IA total par personne
create or replace function public.ia_par_eleve()
returns table (user_id uuid, videos bigint, cout numeric)
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(v.user_id, c.user_id), coalesce(v.n, 0), round(coalesce(c.cout, 0), 4)
    from (select user_id, count(*) as n from studio_montages where compte_le is not null group by user_id) v
    full join (select user_id, sum(cout_usd) as cout from ia_consommations where user_id is not null group by user_id) c
      on c.user_id = v.user_id
   where is_ceo(auth.uid());
$$;

revoke all on function public.ia_tableau(timestamptz, timestamptz) from public, anon;
revoke all on function public.ia_detail_utilisateur(uuid, timestamptz, timestamptz) from public, anon;
revoke all on function public.ia_par_eleve() from public, anon;
grant execute on function public.ia_tableau(timestamptz, timestamptz) to authenticated;
grant execute on function public.ia_detail_utilisateur(uuid, timestamptz, timestamptz) to authenticated;
grant execute on function public.ia_par_eleve() to authenticated;
