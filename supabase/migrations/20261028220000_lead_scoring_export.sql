-- Rapport du lead scoring (28/10/2026) : liste des conférences et export Excel des
-- leads d'une période, avec leur priorité, leurs tags et leurs résultats (mêmes
-- définitions que scoring_rapport). CEO et agence.

create or replace function public.scoring_conferences()
returns table (conference_date date, leads bigint)
language plpgsql stable security definer
set search_path = public
as $$
#variable_conflict use_column
begin
  if coalesce(get_user_role(), '') not in ('ceo', 'agence') then raise exception 'acces_refuse' using errcode = '42501'; end if;
  return query
  select l.conference_date, count(*)::bigint
  from leads l
  where l.conference_date is not null and l.conference_date >= date '2026-05-01'
  group by l.conference_date
  order by l.conference_date desc;
end;
$$;
revoke all on function public.scoring_conferences() from public, anon;
grant execute on function public.scoring_conferences() to authenticated;

create or replace function public.scoring_export(p_debut date, p_fin date, p_mode text default 'conference')
returns table (
  entree timestamptz, nom text, email text, telephone text, canal text, canal_precision text, tunnel text,
  conference_date date, statut text, setter text, priorite text, score_100 integer, reponses jsonb,
  saisi_setter boolean, reinscrit boolean, jeu_ven boolean, score_70 integer, rdv boolean, ventes bigint, ca numeric
)
language plpgsql stable security definer
set search_path = public
as $$
#variable_conflict use_column
begin
  if coalesce(get_user_role(), '') not in ('ceo', 'agence') then raise exception 'acces_refuse' using errcode = '42501'; end if;
  if p_mode not in ('conference', 'entree') then raise exception 'mode_inconnu'; end if;
  return query
  select e.created_at, coalesce(e.contact_full_name, e.raw_full_name), coalesce(e.contact_email, e.raw_email),
         coalesce(e.contact_phone, e.raw_phone), e.canal, e.canal_precision, e.tunnel, l.conference_date,
         e.status, e.assigned_to_name, e.quiz_priorite, e.quiz_score_100, e.quiz_answers,
         e.quiz_saisi_par is not null, e.reinscrit_de is not null, e.signal_jeu_ven, e.quiz_score,
         exists (select 1 from calls k
                 where (k.lead_id = e.id or (k.contact_id = e.contact_id and k.created_at >= e.created_at))
                   and k.status is distinct from 'annule'),
         (select count(*) from marketing_ventes_attribuees va where va.lead_id = e.id)::bigint,
         (select round(coalesce(sum(va.amount_ht), 0), 2) from marketing_ventes_attribuees va where va.lead_id = e.id)
  from leads_enriched e
  join leads l on l.id = e.id
  where case p_mode when 'conference' then l.conference_date between p_debut and p_fin
                    else (e.created_at at time zone 'Europe/Paris')::date between p_debut and p_fin end
  order by e.created_at;
end;
$$;
revoke all on function public.scoring_export(date, date, text) from public, anon;
grant execute on function public.scoring_export(date, date, text) to authenticated;
