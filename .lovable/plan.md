

## Analyse de la situation

### Données actuelles des commissions payées (paid)

| Client | Mensualité | Payé le | paid_at actuel |
|--------|-----------|---------|----------------|
| SABRINA BOUNGAB | 1/8 | 12/10/2025 | 12/10/2025 |
| SABRINA BOUNGAB | 2/8 | 12/11/2025 | 12/11/2025 |
| SABRINA BOUNGAB | 3/8 | 12/12/2025 | 12/12/2025 |
| WALID BRINI | 1/2 | 21/12/2025 | 21/12/2025 |
| SABRINA BOUNGAB | 4/8 | 12/01/2026 | 01/02/2026 |
| WALID BRINI | 2/2 | 23/01/2026 | 23/01/2026 |

### Commissions "due" (paiement client reçu, commission pas encore versée)

| Client | Mensualité | Payé le |
|--------|-----------|---------|
| SABRINA BOUNGAB | 5/8 | 12/02/2026 |
| AKIF TASER | 1/4 | 15/02/2026 |

---

## Proposition validée par l'utilisateur

### 1. Corriger le `paid_at` historique (avant février 2026)

Pour les commissions déjà payées, recalculer `paid_at` = 1er du mois suivant la date de paiement client (`payments.paid_at`).

Exemples concrets :
- Paiement 12/10/2025 → `paid_at` = **01/11/2025**
- Paiement 12/11/2025 → `paid_at` = **01/12/2025**
- Paiement 12/12/2025 → `paid_at` = **01/01/2026**
- Paiement 21/12/2025 → `paid_at` = **01/01/2026**
- Paiement 12/01/2026 → `paid_at` = **01/02/2026** (déjà correct)
- Paiement 23/01/2026 → `paid_at` = **01/02/2026**

### 2. Commissions à partir de février 2026 : gestion via factures

Les commissions avec `payment_paid_at >= 2026-02-01` ne seront plus passées en "paid" automatiquement. Le flux devient :

```text
Paiement client reçu → Commission passe en "due"
                         ↓
CEO génère une facture pour le mois → Commissions liées passent en "invoiced"
                         ↓
CEO marque la facture comme payée → Commissions liées passent en "paid"
                                    (paid_at = date de paiement facture)
```

### 3. Modifications techniques

**Migration SQL :**
- Mettre à jour les `paid_at` historiques avec la formule `(date_trunc('month', payments.paid_at) + interval '1 month')::date`
- Modifier le trigger `sync_commission_status_on_payment` pour ne plus toucher `paid_at` (il met juste `pending` → `due` quand le paiement est reçu)

**Nouvelle logique facture → commissions :**
- Quand le CEO passe une facture en `paid`, toutes les commissions liées (via `invoice_lines`) passent en `paid` avec `paid_at` = date de paiement de la facture
- Cela peut être un trigger sur `apporteur_invoices` ou une action côté frontend

**Frontend (ApporteurCommissions.tsx) :**
- L'historique continue d'utiliser `paid_at` pour le groupement mensuel — aucun changement nécessaire car les dates seront maintenant correctes

### 4. Impact sur l'affichage

Dans l'onglet Historique, au lieu de voir "Reçu le 4 mars 2026" partout, on verra :
- Novembre 2025 : Sabrina (mensualité 1) — Reçu le 1 nov. 2025
- Décembre 2025 : Sabrina (mensualité 2) — Reçu le 1 déc. 2025
- Janvier 2026 : Sabrina (mensualité 3), Walid (mensualité 1) — Reçu le 1 janv. 2026
- Février 2026 : Sabrina (mensualité 4), Walid (mensualité 2) — Reçu le 1 févr. 2026

