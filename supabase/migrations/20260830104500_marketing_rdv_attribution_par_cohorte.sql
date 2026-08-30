-- Correctif d'attribution des rendez-vous. Applique en production le 30/08/2026.
--
-- `calls.conference_date` est pose par `set_call_conference_date`, qui rattache
-- un appel a la conference SUIVANT sa date de rendez-vous. Pour le CRM c'est
-- coherent. Pour le marketing, c'est faux.
--
-- Constate sur la conference du 30/08/2026 : quatre appels pris les 27 et 28/08,
-- en pleine campagne, par des leads `webi_vsl_ads` eux-memes rattaches au 30/08,
-- mais programmes les 31/08 et 01/09 — donc credites au 06/09, qui n'avait alors
-- rien depense. La campagne du 30/08 a paye 11 rendez-vous VSL et n'en affichait
-- que 7.
--
-- Deux corrections, sans toucher au declencheur ni a `calls.conference_date` :
-- cette colonne sert ailleurs dans le CRM, la reecrire deplacerait des chiffres
-- non audites.
--   1. Mode CONFERENCE : l'appel suit la cohorte du LEAD, a defaut la sienne.
--   2. Mode CALENDRIER : le rendez-vous compte quand il est PRIS. Prendre un
--      rendez-vous est le resultat marketing ; qu'il se tienne plus tard releve
--      du commercial.

create or replace function public.marketing_rdv(p_mode text, p_from date, p_to date)
returns table (origine text, rdv bigint, annules bigint, no_show bigint, honores bigint)
language plpgsql stable security definer set search_path = public
as $$
declare
  v_role text := coalesce(public.get_user_role(), '');
begin
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
         count(*) filter (where c.status not in ('annule', 'no_show', 'planifie'))::bigint
  from public.calls c
  left join public.leads l on l.id = c.lead_id
  where case p_mode
          when 'conference'
            then coalesce(l.conference_date, c.conference_date) between p_from and p_to
          else (c.created_at at time zone 'Europe/Paris')::date between p_from and p_to
        end
  group by 1
  order by 2 desc;
end;
$$;

revoke all on function public.marketing_rdv(text, date, date) from public, anon;
grant execute on function public.marketing_rdv(text, date, date) to authenticated;
