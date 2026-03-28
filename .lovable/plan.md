

## Builder : type en haut, étapes en sidebar

### Principe

Réorganiser le Builder en séparant les deux niveaux de navigation :

```text
┌─────────────────────────────────────────────────┐
│  [Appel Setter] [Appel Closer] [RDV] [Clos.]   │  ← Tabs colorés en haut
│  + Nouveau type                          ⚙️     │
├────────────┬────────────────────────────────────┤
│ Étapes     │                                    │
│            │                                    │
│ 1. Intro   │   Éditeur de l'étape               │
│ 2. Découv. │   (titre, tips, critères,          │
│ 3. Pitch   │    scripts, débriefs)              │
│ 4. Close   │                                    │
│            │                                    │
│ + Étape    │                                    │
├────────────┴────────────────────────────────────┘
```

### Changements dans `AdminCoachingBuilder.tsx`

1. **Haut de page** : barre horizontale avec les types de coaching en tabs colorés (badge avec `theme_color`), bouton "+ Nouveau type" à droite, bouton ⚙️ sur le type actif
2. **Sidebar gauche (w-64)** : uniquement les étapes du type sélectionné + bouton "+ Ajouter une étape" en bas -- `sticky top-4`
3. **Zone droite** : éditeur inchangé

### Fichier modifié

| Fichier | Action |
|---------|--------|
| `src/components/admin-coaching/AdminCoachingBuilder.tsx` | Déplacer sélecteur de type en haut, sidebar = étapes uniquement |

