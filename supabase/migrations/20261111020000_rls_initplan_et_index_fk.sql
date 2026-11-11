-- Audit performance du 11/11/2026 (demande de Sidali après le ralentissement du 10/11).
--
-- 1) Règles d'accès (RLS) évaluées UNE fois par requête au lieu d'une fois par LIGNE.
--    300 des 350 règles appelaient get_user_role() (fonction VOLATILE qui relit
--    profiles), auth.uid(), is_ceo(auth.uid())… directement : Postgres les
--    réexécutait pour chaque ligne lue. Entourées d'un (SELECT …), elles sont
--    calculées une seule fois (« initPlan »), comme le recommande Supabase.
--    Mesuré pour un collaborateur : lire leads 600 ms -> 5 ms, contacts 90 -> 2 ms ;
--    CEO : commissions 390 -> 72 ms, ventes + paiements 206 -> 18 ms.
--    Vérifié avant application : nombre de lignes visibles IDENTIQUE sur les
--    154 tables protégées pour 11 comptes (CEO, agence, apporteurs,
--    collaborateurs confirmés/intermédiaires, compte inexistant).
--    Réécriture idempotente (une règle déjà entourée n'est pas retouchée).
--
--    ⚠️ Pour toute NOUVELLE règle : écrire (SELECT auth.uid()), (SELECT get_user_role()),
--    (SELECT is_ceo(auth.uid())), jamais l'appel nu.

do $rw$
declare
  p record; q text; w text; n int := 0;
  fn text := $f$
    select regexp_replace(
             regexp_replace(
               regexp_replace(
                 regexp_replace($1,
                   '(?<!SELECT )(is_ceo|appels_acces|studio_ouvert)\(auth\.uid\(\)\)', '(SELECT \1(auth.@UID@))', 'g'),
                 '(?<!SELECT )(get_user_role|can_assign_leads_now)\(\)', '(SELECT \1())', 'g'),
               '(?<!SELECT )(?<!is_ceo\()(?<!appels_acces\()(?<!studio_ouvert\()auth\.(uid|role)\(\)', '(SELECT auth.\1())', 'g'),
             '@UID@', 'uid()', 'g')
  $f$;
begin
  for p in select * from pg_policies where schemaname = 'public' loop
    execute fn into q using p.qual;
    execute fn into w using p.with_check;
    if q is distinct from p.qual or w is distinct from p.with_check then
      execute format('alter policy %I on %I.%I %s %s', p.policyname, p.schemaname, p.tablename,
                     case when q is not null then 'using (' || q || ')' else '' end,
                     case when w is not null then 'with check (' || w || ')' else '' end);
      n := n + 1;
    end if;
  end loop;
  raise notice 'règles réécrites : %', n;
end $rw$;

-- get_user_role() ne fait que lire : STABLE (au lieu de VOLATILE) permet à
-- Postgres de l'optimiser là où elle serait encore appelée sans (SELECT …).
alter function public.get_user_role() stable;

-- 2) Index sur les clés étrangères les plus lues (jointures ventes / commissions /
--    calls / leads faites par les tableaux de bord et les règles d'accès).
--    commissions était lue 717 836 fois en entier, pour seulement 199 lectures par index.
create index if not exists commissions_sale_id_idx on public.commissions (sale_id);
create index if not exists commissions_payment_id_idx on public.commissions (payment_id);
create index if not exists commissions_beneficiary_user_id_idx on public.commissions (beneficiary_user_id);
create index if not exists sales_lead_id_idx on public.sales (lead_id);
create index if not exists sales_contact_id_idx on public.sales (contact_id);
create index if not exists sales_closed_by_idx on public.sales (closed_by);
create index if not exists sales_call_id_idx on public.sales (call_id);
create index if not exists calls_lead_id_idx on public.calls (lead_id);
create index if not exists calls_assigned_to_idx on public.calls (assigned_to);
create index if not exists leads_assigned_to_idx on public.leads (assigned_to);
create index if not exists leads_apporteur_id_idx on public.leads (apporteur_id);
create index if not exists lead_activities_user_id_idx on public.lead_activities (user_id);
create index if not exists call_activities_user_id_idx on public.call_activities (user_id);
create index if not exists invoice_lines_sale_id_idx on public.invoice_lines (sale_id);
create index if not exists contact_identifiers_contact_id_idx on public.contact_identifiers (contact_id);
