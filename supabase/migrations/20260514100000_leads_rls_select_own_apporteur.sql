-- ═══════════════════════════════════════════════════════════════════════════
-- Fix RLS : tout utilisateur authentifié peut lire ses propres leads apportés,
-- quel que soit son rôle (apporteur, collaborateur, ceo, agence).
--
-- CONTEXTE
--   Avant cette migration, seul le rôle 'apporteur' pouvait voir un lead où
--   apporteur_id = auth.uid() (policy leads_select_apporteur). Un
--   collaborateur qui apportait des leads via son funnel quiz ne voyait pas
--   ses propres leads dans son interface — ex : Neylla, collaboratrice, qui
--   avait 11 leads quiz + 16 autres leads apportés mais en voyait 0 dans
--   son onglet "Mes leads apportés".
--
--   Détecté en testant la nouvelle UI des onglets ApporteurLeads (commit
--   e96d1c1). Côté SQL admin on voyait bien les 27 leads, côté frontend
--   authentifié comme Neylla la RLS retournait un set vide.
--
-- FIX
--   Cette policy est ADDITIVE — un utilisateur voit l'union de toutes les
--   policies SELECT qui matchent. Elle ne réduit pas l'accès existant et
--   donne juste l'accès supplémentaire dont la nouvelle UI a besoin.
-- ═══════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS leads_select_own_apporteur ON public.leads;

CREATE POLICY leads_select_own_apporteur ON public.leads
  FOR SELECT
  USING (apporteur_id = auth.uid());
