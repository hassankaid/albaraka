

## Builder coaching : passer de Sheet à master-detail

### Principe

Remplacer le Sheet latéral par un layout en deux colonnes intégré dans l'onglet Builder :
- **Colonne gauche (~300px)** : sélecteur de type (tabs ou dropdown) + liste des étapes cliquables
- **Colonne droite (flex-1)** : contenu complet de l'étape sélectionnée (titre, objectif, tips, critères, scripts, débriefs)

Quand aucune étape n'est sélectionnée, la zone droite affiche un état vide ("Sélectionnez une étape").

### Changements dans `AdminCoachingBuilder.tsx`

1. **Supprimer** le composant `Sheet`/`SheetContent` et les états `showStepSheet`
2. **Restructurer le JSX** :
   - Wrapper `flex gap-6` sur toute la hauteur
   - Gauche : `w-80 shrink-0` avec les types en tabs verticaux ou dropdown + liste des étapes (cards cliquables, highlight sur l'étape active)
   - Droite : `flex-1 overflow-y-auto` avec le contenu de l'étape (même contenu que l'ancien Sheet, mais dans un Card ou directement)
3. **Conserver les Dialogs** existants (nouveau type, nouvelle étape, édition type) -- ils restent en modal car ce sont des actions ponctuelles
4. **Accordion ouvert par défaut** : les sections critères/scripts/débriefs peuvent être toutes visibles puisqu'on a plus d'espace

### Résultat

- Plus de contenu coupé
- Navigation fluide entre étapes (clic = changement instantané)
- Boutons "+ Ajouter une étape" et "⚙ Type" restent dans la colonne gauche
- Le bouton "Supprimer l'étape" reste en bas de la zone droite

### Fichier modifié

| Fichier | Modification |
|---------|-------------|
| `src/components/admin-coaching/AdminCoachingBuilder.tsx` | Remplacer Sheet par layout master-detail en deux colonnes |

