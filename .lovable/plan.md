

## Ajouter "Close" comme statut manuel (Leads + Calls)

### Contexte

Le statut "Close" est actuellement réservé au système (déclenché automatiquement lors de la création d'une vente via le trigger `update_lead_call_on_sale`). L'utilisateur souhaite pouvoir aussi le sélectionner manuellement en cas de problème de rattachement, sans casser le mécanisme automatique existant.

### Impact

Aucun impact négatif : le trigger automatique continuera de fonctionner normalement. Ajouter "Close" au dropdown manuel signifie simplement qu'un collaborateur/CEO peut aussi forcer ce statut si besoin. Les deux mécanismes coexistent sans conflit.

### Changements

**1. ProcessCallModal.tsx** — Ajouter `{ value: "close", label: "Close" }` à la fin du `STATUS_LIST`

**2. leadConfig.ts** — Ajouter `"close"` à `LEAD_MANUAL_STATUSES` (ce qui l'ajoute automatiquement au dropdown de ProcessLeadModal via `LEAD_STATUS_LIST`)

### Fichiers modifiés

| Fichier | Modification |
|---------|-------------|
| `src/components/calls/ProcessCallModal.tsx` | Ajouter "Close" dans `STATUS_LIST` |
| `src/lib/leadConfig.ts` | Ajouter `"close"` dans `LEAD_MANUAL_STATUSES` |

