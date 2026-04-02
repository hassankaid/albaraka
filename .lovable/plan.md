

## Corrections "Mon Activité" — 4 points

### 1. Objectifs limités à 3 KPIs seulement

Dans `MyActivity.tsx`, la section "Objectifs hebdomadaires" affiche actuellement les 5 KPIs avec barres de progression. Il faut n'afficher les barres d'objectifs que pour les 3 KPIs ayant un objectif : **Vidéos (7)**, **Messages (500)**, **RDV (10)**. Les "Réponses reçues" et "Ventes réalisées" restent dans la saisie hebdomadaire mais disparaissent de la section objectifs.

Ajout d'une constante `OBJECTIVE_KEYS` pour filtrer, et boucle sur cette liste dans la carte objectifs au lieu de `KPI_CONFIG`.

### 2. Supprimer la page "Accueil" Working

La page `/working` (Working.tsx) est supprimée de la navigation. Les utilisateurs arrivent directement sur `/working/activity` (Mon Activité).

**Fichiers modifiés :**
- `DashboardLayout.tsx` : retirer l'item "Accueil" (`path: "/working"`) de `workingNavItems` + retirer `/working` de `pageTitles`
- `App.tsx` : changer `<Route path="/working" element={<Working />} />` en un redirect `<Route path="/working" element={<Navigate to="/working/activity" replace />} />`
- `ApporteurLayout.tsx` : pas de changement nécessaire (n'a pas "Accueil")

### 3. Fix sidebar double-highlight

Le problème vient du fait que NavLink pour `/working` (Accueil) est actif quand on est sur `/working/activity` car `/working` est un préfixe. En supprimant "Accueil" (point 2), ce problème disparaît automatiquement.

### 4. CEO ne doit pas voir le formulaire de saisie

Le CEO n'est pas un apporteur qui saisit des KPIs. Sur `MyActivity.tsx`, il faut conditionner l'affichage :
- Si `profile.role === "ceo"` : afficher une **vue admin** avec le classement de tous les apporteurs de la semaine (réutiliser la logique du leaderboard déjà dans `AdminCoachingDashboard.tsx`, ou rediriger vers le classement)
- Sinon : afficher le formulaire de saisie actuel

Pour le CEO, la page affichera :
- Le classement complet de la semaine (pas juste top 5) avec scores
- Les détails KPI de chaque apporteur
- Pas de formulaire de saisie

### Fichiers modifiés

| Fichier | Modification |
|---------|-------------|
| `src/pages/working/MyActivity.tsx` | Objectifs limités à 3 KPIs + vue admin CEO (classement) au lieu du formulaire |
| `src/components/DashboardLayout.tsx` | Retirer "Accueil" de workingNavItems + pageTitles |
| `src/App.tsx` | Redirect `/working` → `/working/activity` |

