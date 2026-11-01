-- Rôle de commission « Coach » pour le coaching individuel (décisions de Sidali, 01/11/2026) :
-- taux unique proposé à 88,89 %, modifiable sur chaque vente ; pas de calcul selon le prix.
-- Le coaching du 29/10 reste en closer à 40 €. Les coachings sortent du nombre de ventes de
-- statistiques_equipe ; team_sales_rankings ne retient déjà que setter, closer et apporteur.
-- Appliqué en base le 01/11/2026.

alter table public.commissions drop constraint if exists commissions_role_check;
alter table public.commissions add constraint commissions_role_check
  check (role = any (array['apporteur'::text, 'setter'::text, 'closer'::text, 'agence_marketing'::text, 'coach'::text]));

CREATE OR REPLACE FUNCTION public.statistiques_equipe()
 RETURNS TABLE(user_id uuid, leads_recus bigint, leads_travailles bigint, ventes bigint, ventes_closees bigint, commissions_generees numeric, commissions_acquises numeric, commissions_payees numeric, derniere_presence timestamp with time zone, derniere_action timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
begin
  if auth.uid() is not null
     and not exists (select 1 from profiles c where c.id = auth.uid() and c.role = 'ceo') then
    raise exception 'reserve au CEO';
  end if;

  return query
  select p.id,
         coalesce(l.recus, 0),
         coalesce(l.travailles, 0),
         -- Toute vente commissionnee (apporteur, closer, setter, agence_marketing),
         -- sauf le coaching individuel : il n'est pas une performance de vente
         -- (Sidali, 01/11/2026). Les montants, eux, restent dans les colonnes ci-dessous.
         coalesce(c.ventes_impliquees, 0),
         coalesce(v.n, 0),
         coalesce(c.genere, 0),
         coalesce(c.acquis, 0),
         coalesce(c.paye, 0),
         greatest(
           u.last_sign_in_at,
           (select max(coalesce(s.refreshed_at, s.updated_at, s.created_at))
              from auth.sessions s where s.user_id = p.id)
         ),
         greatest(l.derniere_maj, k.dernier_appel)
  from profiles p
  left join auth.users u on u.id = p.id
  left join lateral (
    select count(*) as recus,
           count(*) filter (where status <> 'a_qualifier') as travailles,
           max(updated_at) as derniere_maj
    from leads where assigned_to = p.id
  ) l on true
  left join lateral (select count(*) as n from sales where closed_by = p.id) v on true
  left join lateral (select max(created_at) as dernier_appel from calls where assigned_to = p.id) k on true
  left join lateral (
    select count(distinct sale_id) filter (where status <> 'cancelled' and role <> 'coach') as ventes_impliquees,
           sum(amount) filter (where status <> 'cancelled')    as genere,
           sum(amount) filter (where status in ('paid','due')) as acquis,
           sum(amount) filter (where status = 'paid')          as paye
    from commissions where beneficiary_user_id = p.id
  ) c on true;
end;
$function$;
