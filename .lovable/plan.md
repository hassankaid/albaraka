

## Fix du scroll : colonnes indépendantes dans le Builder

### Problème
Les deux colonnes (liste + éditeur) scrollent avec la page globale. Quand on clique une étape, il faut scroller manuellement pour voir l'éditeur.

### Solution
Fixer le layout master-detail à la hauteur restante du viewport (`h-[calc(100vh-280px)]`) et donner à chaque colonne son propre `overflow-y-auto` indépendant. Ainsi :
- Cliquer sur une étape affiche toujours l'éditeur en haut de la zone droite
- La liste des étapes à gauche reste visible et scrollable indépendamment

### Changements dans `AdminCoachingBuilder.tsx`

1. Le wrapper flex principal garde `min-h-[calc(100vh-280px)]` mais ajoute `h-[calc(100vh-280px)]` pour **contraindre** la hauteur (pas juste un minimum)
2. Colonne gauche : ajouter `overflow-y-auto` pour scroll indépendant
3. Colonne droite : ajouter `overflow-y-auto` sur le wrapper (pas juste sur le contenu interne)
4. La Card de l'éditeur perd le `h-full` et le `flex flex-col` interne pour juste se dérouler naturellement dans la zone scrollable droite

### Fichier modifié

| Fichier | Modification |
|---------|-------------|
| `src/components/admin-coaching/AdminCoachingBuilder.tsx` | Fixer hauteur du layout + scroll indépendant par colonne |

