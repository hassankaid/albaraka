-- Ouverture des accès lecture pour le rôle 'agence'
--
-- Contexte : l'agence marketing externe (ex: SKALESY) dispose d'un Dashboard
-- dédié qui agrège :
--   - Le Marketing Dashboard (budget ads, leads, RDV, ventes, CPL/CPR/CAC)
--   - Un bloc synthèse de SES commissions (collectées, à venir, ROI)
--
-- Tables lues par le hook useMarketingDashboardData :
--   - ads, leads, calls, sales, contacts, lead_tags (dernière déjà ouverte)
--
-- Tables lues pour les commissions :
--   - commissions (policy commissions_select_own déjà ok)
--   - apporteur_invoices (policy "Apporteurs can view own invoices" déjà ok)
--   - sales, payments (joinés)
--
-- Écriture non ouverte : l'agence est en lecture seule.

CREATE POLICY ads_select_agence ON ads
  FOR SELECT USING (get_user_role() = 'agence');

CREATE POLICY leads_select_agence ON leads
  FOR SELECT USING (get_user_role() = 'agence');

CREATE POLICY calls_select_agence ON calls
  FOR SELECT USING (get_user_role() = 'agence');

CREATE POLICY sales_select_agence ON sales
  FOR SELECT USING (get_user_role() = 'agence');

CREATE POLICY contacts_select_agence ON contacts
  FOR SELECT USING (get_user_role() = 'agence');

-- Payments : policy restreinte aux payments liés à ses commissions
-- (pas de lecture globale des échéances clients)
CREATE POLICY payments_select_agence ON payments
  FOR SELECT USING (
    get_user_role() = 'agence'
    AND id IN (
      SELECT payment_id FROM commissions
      WHERE beneficiary_user_id = auth.uid() AND payment_id IS NOT NULL
    )
  );
