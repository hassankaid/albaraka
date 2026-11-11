-- SÉCURITÉ (11/11/2026) : leads_enriched et calls_enriched lisibles par TOUT
-- compte connecté.
--
-- Ces vues appartiennent à postgres, sans security_invoker : elles lisaient
-- leads/calls en contournant les règles d'accès. Un compte élève/apporteur
-- (363 comptes) pouvait donc lire par l'API les 7 458 leads et 1 424 calls
-- (nom, e-mail, téléphone), alors que la table leads ne lui en montre aucun.
-- Les écrans, eux, filtraient côté navigateur : rien ne se voyait à l'écran.
--
-- Correctif sans changer ce que chacun voit :
--   - la vue existante devient *_base (définition, colonnes et jointures
--     intactes) et n'est plus accessible depuis l'API ;
--   - une vue du même nom la reprend telle quelle, avec un filtre qui
--     reproduit EXACTEMENT les règles de lecture des tables leads / calls
--     (vérifié compte par compte avant application : mêmes lignes que la table).
--   Les colonnes enrichies (noms des setters, statuts de call…) restent
--   calculées comme avant : seules les LIGNES visibles sont filtrées.
--   Les fonctions SECURITY DEFINER (rapports de scoring…) et les fonctions
--   serveur (service_role) gardent l'accès complet, comme avant.
--
-- ⚠️ Si les règles de lecture de leads ou de calls changent, mettre à jour
-- le filtre ci-dessous en conséquence.

alter view public.leads_enriched rename to leads_enriched_base;
revoke all on public.leads_enriched_base from anon, authenticated;

create view public.leads_enriched as
select b.*
from public.leads_enriched_base b
where current_user in ('postgres', 'service_role', 'supabase_admin')
   -- leads_select_ceo, leads_select_agence
   or (select public.get_user_role()) in ('ceo', 'agence')
   -- leads_select_assigner (CEO ou délégué d'affectation)
   or (select public.can_assign_leads_now())
   -- leads_select_own_apporteur
   or b.apporteur_id = (select auth.uid())
   -- leads_select_apporteur
   or ((select public.get_user_role()) = 'apporteur'
       and (b.apporteur_id = (select auth.uid()) or b.assigned_to = (select auth.uid())))
   -- leads_select_collab_intermediaire + leads_select_collab_confirmed
   or ((select public.get_user_role()) = 'collaborateur'
       and (b.assigned_to = (select auth.uid())
            or (b.assigned_to is null and b.recycled_at is null
                and exists (select 1 from public.profiles p
                            where p.id = (select auth.uid()) and p.collaborateur_level = 'confirme'))));

grant select on public.leads_enriched to authenticated;

alter view public.calls_enriched rename to calls_enriched_base;
revoke all on public.calls_enriched_base from anon, authenticated;

create view public.calls_enriched as
select b.*
from public.calls_enriched_base b
where current_user in ('postgres', 'service_role', 'supabase_admin')
   -- calls_select_team, calls_select_agence
   or (select public.get_user_role()) in ('ceo', 'collaborateur', 'agence')
   -- calls_select_apporteur
   or ((select public.get_user_role()) = 'apporteur'
       and b.lead_id in (select l.id from public.leads l where l.apporteur_id = (select auth.uid())));

grant select on public.calls_enriched to authenticated;

-- Les droits par défaut de Supabase ouvrent tout nouvel objet à anon et
-- authenticated (écriture comprise) : on ne garde que la lecture, pour les
-- comptes connectés. (Le filtre ne renvoyait de toute façon aucune ligne à anon.)
revoke all on public.leads_enriched, public.calls_enriched from anon;
revoke insert, update, delete, truncate, references, trigger on public.leads_enriched, public.calls_enriched from authenticated;
