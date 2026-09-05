-- ═══════════════════════════════════════════════════════════════════════
-- Les deux dernières échéances de Fatiha Hachlag n'avaient AUCUNE commission.
--
-- Son échéancier a été retravaillé deux fois (250 € -> 150 € -> 210 €) et les
-- échéances 9 et 10 ont été créées sans leurs commissions. Les huit premières
-- portent bien apporteur 25 % (Chaimaa Miftah) et closer 10 % (Sabrina Da Cunha).
--
-- 147,00 € qui n'auraient été crédités à personne le jour où elle paie.
--
-- POURQUOI LA RÈGLE DU 05/09 NE POUVAIT PAS RATTRAPER ÇA : elle recalcule les
-- montants des lignes existantes, elle ne crée pas celles qui manquent. Le trou
-- n'était donc pas visible dans le contrôle de conformité — 2 157 lignes sur
-- 2 157 étaient justes, simplement il en manquait deux.
--
-- Les montants suivent la règle : 210,00 x 25 % = 52,50 et 210,00 x 10 % = 21,00.
-- Ce n'est pas un rattrapage du passé : ces deux échéances sont à venir
-- (29/01/2027 et 28/02/2027) et n'ont encore rien versé.
-- ═══════════════════════════════════════════════════════════════════════

insert into commissions
  (sale_id, payment_id, beneficiary_user_id, beneficiary_external, percentage, amount, role, status)
select
  p.sale_id,
  p.id,
  m.beneficiary_user_id,
  m.beneficiary_external,
  m.percentage,
  round(p.amount * m.percentage / 100, 2),
  m.role,
  'pending'
from payments p
cross join (values
  ('71aaf5f5-158a-47e7-b368-7d228b96a199'::uuid, null::text, 25.00::numeric, 'apporteur'::text),
  ('071078ef-04ff-4ddc-9a38-f6ba8e6748c4'::uuid, null::text, 10.00::numeric, 'closer'::text)
) as m(beneficiary_user_id, beneficiary_external, percentage, role)
where p.sale_id = '73fca3e3-fbe3-4fad-8d30-2433ed2436a0'
  and p.payment_number in (9, 10)
  -- Garde-fou : ne crée que ce qui manque vraiment.
  and not exists (
    select 1 from commissions co
    where co.payment_id = p.id and co.role = m.role
  );
