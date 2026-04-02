

## Optimisations "Mon Activité" — 4 corrections

### 1. Formatage du feedback Coach IA (markdown)

Le feedback AI contient du markdown (`**gras**`, emojis sur nouvelles lignes) mais est rendu en texte brut via `<p className="whitespace-pre-line">`. Solution : parser le markdown simple (gras, retours ligne) en JSX. On utilisera un rendu simple avec `dangerouslySetInnerHTML` après conversion des `**...**` en `<strong>` et des `\n` en `<br/>`, ou mieux, installer/utiliser un petit composant de rendu markdown léger. Vu que le projet n'a pas de lib markdown, on fera un rendu manuel simple : split par `\n`, remplacer `**...**` par `<strong>`.

### 2. Retirer le badge "×1.3" sur chaque barre d'objectif

Le `×{(pct / 100).toFixed(1)}` sur chaque ligne individuelle porte à confusion car le bonus s'applique au score global, pas par KPI. On retire ce badge. On garde juste `valeur/objectif (pourcentage%)` en vert quand >= 100%.

### 3. Amélioration design du Classement

- Déplacer le toggle Semaine/All Time en haut à droite du header de la Card (inline avec le titre)
- Score avec 1 décimale (`computeScore` retourne un float arrondi à 1 décimale)
- Meilleur espacement et structure visuelle des items du leaderboard

### 4. Score avec décimale

Modifier `computeScore` pour retourner un nombre à 1 décimale : `parseFloat((avg * bonus).toFixed(1))` au lieu de `Math.round(...)`. Idem dans `useAllTimeRanked`.

### Fichier modifié

| Fichier | Modification |
|---------|-------------|
| `src/pages/working/MyActivity.tsx` | Les 4 points ci-dessus |

### Détail des changements

**Ligne 51** : `Math.round(avg * bonus)` → `parseFloat((avg * bonus).toFixed(1))`

**Ligne 91** : `{r.score}` → `{r.score.toFixed(1)}`

**Ligne 199** : `Math.round(totalScore / weeks.length)` → `parseFloat((totalScore / weeks.length).toFixed(1))`

**Lignes 515** : Retirer le span avec `×{(pct / 100).toFixed(1)}`

**Lignes 534-535** : Remplacer le `<p>` brut par un rendu qui convertit `**text**` en `<strong>` et respecte les sauts de ligne

**Lignes 146-169** : Restructurer `LeaderboardWithTabs` pour mettre le toggle en haut à droite du `CardHeader`

