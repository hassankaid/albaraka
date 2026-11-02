-- 02/11/2026, demande de Sidali : une cliente a payé son Pass (2 000 €) en trois fois par trois bons de
-- commande (250 € le 01/11, puis 1 500 € et 250 € le 02/11), ce qui a créé trois ventes et trois
-- abonnements Stripe. Les abonnements sont résiliés côté Stripe le 02/11 (aucun prélèvement de plus).
-- On garde la vente du 01/11 (contrat signé, code AB1000, commissions) et on y range les trois
-- paiements réels ; elle passe soldée. Appliqué en base le 02/11/2026.

-- 1. Factures client déjà émises des deux autres ventes : rattachées aux échéances 2 et 3 de la vente gardée.
update public.client_invoices
   set sale_id = '72e57a3a-c4c0-40d4-b882-4dcb1fc5d827', payment_id = 'b5eceeb6-4d54-4a90-922d-08e7688fe16c'
 where payment_id = '7d351052-5a7f-40f8-890e-d4f651901ad3';
update public.client_invoices
   set sale_id = '72e57a3a-c4c0-40d4-b882-4dcb1fc5d827', payment_id = '173f0157-2d40-4a84-94e0-1e1d60facbf9'
 where payment_id = '121b6bb5-7fd8-499f-9eb8-bce185fd2adc';

-- 2. Contrats non signés et ventes en double (leurs échéances partent en cascade ; elles n'avaient aucune commission).
delete from public.client_contracts
 where sale_id in ('afd75c9e-358f-4a16-b997-947dbd509e2f', '994ca9b5-3e57-43ed-8649-2cc2ddcc431f')
   and status = 'pending_signature';
delete from public.sales
 where id in ('afd75c9e-358f-4a16-b997-947dbd509e2f', '994ca9b5-3e57-43ed-8649-2cc2ddcc431f');

-- 3. Échéances 4 à 8 de la vente gardée : plus rien à payer (commissions supprimées par le déclencheur).
delete from public.payments
 where sale_id = '72e57a3a-c4c0-40d4-b882-4dcb1fc5d827' and payment_number between 4 and 8 and status = 'pending';

-- 4. Échéances 2 et 3 = les paiements réels du 02/11 (commissions recalculées et passées à payer par les déclencheurs).
update public.payments
   set amount = 1500, due_date = '2026-11-02', status = 'paid', paid_at = '2026-11-02',
       stripe_payment_intent_id = 'pi_3UXIzCJX0OcQy7IO0Ry9XN1K', stripe_invoice_id = 'in_1UXIzBJX0OcQy7IOkADNYc7s',
       stripe_subscription_id = 'sub_1UXIzBJX0OcQy7IOlesVqA8E'
 where id = 'b5eceeb6-4d54-4a90-922d-08e7688fe16c' and status = 'pending';
update public.payments
   set amount = 250, due_date = '2026-11-02', status = 'paid', paid_at = '2026-11-02',
       stripe_payment_intent_id = 'pi_3UXJ1yJX0OcQy7IO1Zmwnnyl', stripe_invoice_id = 'in_1UXJ1yJX0OcQy7IOht9E9hie',
       stripe_subscription_id = 'sub_1UXJ1yJX0OcQy7IOxprVp9c5'
 where id = '173f0157-2d40-4a84-94e0-1e1d60facbf9' and status = 'pending';

update public.payments set total_payments = 3 where sale_id = '72e57a3a-c4c0-40d4-b882-4dcb1fc5d827';
update public.sales set mensualites = 3 where id = '72e57a3a-c4c0-40d4-b882-4dcb1fc5d827';
