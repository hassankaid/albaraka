-- Rattrapage validé par Sidali le 31/10/2026 : un taux de closing saisi à 10 % au lieu de 15 %,
-- puis corrigé, a réécrit l'échéance déjà payée sans créer l'arriéré.
-- 1. Une ligne à payer de 5 % sur cette échéance (33,33 €), reprise par la prochaine facture.
-- 2. L'échéance payée revient au montant réellement versé (66,67 €) ; son taux n'est pas modifié,
--    car le trigger le recopierait sur toutes les lignes de la vente.
-- Appliqué en base le 31/10/2026.

insert into public.commissions (sale_id, payment_id, beneficiary_user_id, percentage, amount, role, status)
select c.sale_id, c.payment_id, c.beneficiary_user_id, 5, 33.33, 'closer', 'due'
  from public.commissions c
  join public.payments p on p.id = c.payment_id
 where c.sale_id = 'c47065e5-25cf-4d12-a523-f31e089d11c0'
   and c.role = 'closer'
   and p.due_date = '2026-09-13'
   and c.status = 'paid'
   and c.amount = 100;

update public.commissions c
   set amount = 66.67
  from public.payments p
 where p.id = c.payment_id
   and c.sale_id = 'c47065e5-25cf-4d12-a523-f31e089d11c0'
   and c.role = 'closer'
   and p.due_date = '2026-09-13'
   and c.status = 'paid'
   and c.amount = 100;
