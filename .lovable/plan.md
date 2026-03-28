

## Simplifier le scroll du Builder

### Probleme
Le layout actuel avec hauteur fixe et deux scrolls independants (liste + editeur) est confus -- trop de zones de scroll imbriquees.

### Solution
Revenir a un scroll unique (la page) et utiliser `scrollIntoView` pour amener automatiquement l'editeur dans le viewport quand on clique une etape.

### Changements dans `AdminCoachingBuilder.tsx`

1. **Supprimer la contrainte de hauteur fixe** : remplacer `h-[calc(100vh-280px)]` par juste `min-h-[calc(100vh-280px)]`
2. **Supprimer `overflow-y-auto`** des deux colonnes -- tout scrolle avec la page normalement
3. **Ajouter un `ref`** sur la Card editeur (colonne droite)
4. **`scrollIntoView({ behavior: 'smooth', block: 'start' })`** quand on selectionne une etape -- l'editeur remonte automatiquement en vue
5. La colonne gauche reste `sticky top-4` pour rester visible pendant le scroll de l'editeur

### Resultat
- Un seul scroll (la page), plus naturel
- Cliquer une etape = l'editeur apparait en haut automatiquement
- La liste des etapes reste visible grace au `sticky`
- Plus de sensation de "fouilli" avec des scrolls multiples

### Fichier modifie

| Fichier | Modification |
|---------|-------------|
| `src/components/admin-coaching/AdminCoachingBuilder.tsx` | Scroll unique + sticky sidebar + scrollIntoView |

