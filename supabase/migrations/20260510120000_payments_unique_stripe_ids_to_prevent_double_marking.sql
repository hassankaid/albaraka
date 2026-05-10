-- Filet de sécurité au niveau BDD : un même PaymentIntent ou une même Invoice
-- Stripe ne peut pas être attaché à plusieurs lignes payments. Évite le bug
-- de double-marquage observé sur la vente ANSARA MOHAMMED le 09/05/2026 (race
-- condition entre payment_intent.succeeded et invoice.paid arrivés en parallèle
-- → la 2e invocation a marqué M3 paid avec les mêmes Stripe IDs que M2).
--
-- Index PARTIEL : ne couvre que les lignes où l'ID est non-null. Ainsi les
-- ~99% de lignes pending (sans Stripe IDs) ne sont pas concernées.

CREATE UNIQUE INDEX IF NOT EXISTS payments_unique_stripe_pi
  ON payments (stripe_payment_intent_id)
  WHERE stripe_payment_intent_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS payments_unique_stripe_invoice
  ON payments (stripe_invoice_id)
  WHERE stripe_invoice_id IS NOT NULL;
