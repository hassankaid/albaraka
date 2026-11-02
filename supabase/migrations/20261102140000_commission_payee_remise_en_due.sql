-- 02/11/2026 : la suppression d'une facture d'octobre (delete-apporteur-invoice) a remis en « due »
-- une commission déjà réglée le 01/10/2026 par une facture de septembre, parce qu'elle partageait
-- le même paiement qu'une ligne de rattrapage. Elle repasse en « paid » ; sa date de paiement
-- n'avait pas été effacée. Appliqué en base le 02/11/2026.

update public.commissions
   set status = 'paid'
 where id = '7f4d4991-e977-4c03-9e40-3e12ff8369a6'
   and status = 'due'
   and paid_at = '2026-10-01 14:35:47.177+00';
