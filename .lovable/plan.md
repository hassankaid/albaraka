

## Renommage sidebar coaching + simplification du SpaceSwitcher

### Changements

**1. SpaceSwitcher -- passer de 3 a 2 espaces**

Fusionner les 3 entrées actuelles en 2 :
- **ETHICARENA TRACKING** (bleu, icone BarChart3) → `/dashboard`
- **ETHICARENA COACHING** (ambre, icone GraduationCap) → `/coaching` si coach/CEO, sinon `/mon-coaching`

La detection de l'espace actif : si le pathname commence par `/coaching` ou `/mon-coaching` → COACHING, sinon → TRACKING.

**2. DashboardLayout -- renommer les liens coaching**

Modifier `coachingNavItems` :
- `"Sessions"` → **`"Évaluations"`** (path `/coaching`, visible coach/CEO uniquement)
- `"Mon Coaching"` → **`"Historique"`** (path `/mon-coaching`, visible par tous)

Mettre a jour `pageTitles` en conséquence.

### Fichiers modifies

| Fichier | Modification |
|---------|-------------|
| `src/components/SpaceSwitcher.tsx` | Supprimer l'entrée "coaching-student", ne garder que 2 espaces. Adapter le path de COACHING selon le role. |
| `src/components/DashboardLayout.tsx` | Renommer les titres dans `coachingNavItems` et `pageTitles`. |

### Résultat

SpaceSwitcher : 2 choix (TRACKING / COACHING).
Sidebar coaching : "Évaluations" (coach) + "Historique" (tous).

