

## Désélectionner les bénéficiaires par défaut sur la page Factures

### Changement

Dans `src/pages/AdminInvoices.tsx`, ligne 297, remplacer :

```ts
setSelectedIds(new Set(list.map(a => a.beneficiary_user_id)));
```

par :

```ts
setSelectedIds(new Set());
```

Cela initialise la sélection à vide au lieu de tout cocher. Le bouton "Tout sélectionner" reste disponible pour cocher en masse si besoin.

### Fichier modifié

| Fichier | Modification |
|---------|-------------|
| `src/pages/AdminInvoices.tsx` | Initialiser `selectedIds` à un Set vide au chargement des bénéficiaires |

