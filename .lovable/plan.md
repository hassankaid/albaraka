

## Optimisations "Mon Activité" — 4 points

### 1. Score Explanation mieux structuré

Remplacer le bloc de texte brut par une mise en page structurée avec des éléments visuels :
- Titre "Comment est calculé mon score ?"
- 3 lignes distinctes avec icônes/puces :
  - **Base** : Moyenne des % d'atteinte sur les 3 objectifs (vidéos, messages, RDV)
  - **Dépassement** : Pas de cap à 100% — dépasser un objectif rapporte plus de points
  - **Bonus régularité** : +10% par objectif atteint ou dépassé (max +30%)

### 2. Leaderboard avec onglets "Semaine" / "All Time"

Pour les deux vues (CEO et apporteur) :
- Ajouter des `Tabs` avec deux onglets : **Cette semaine** et **All Time**
- **Cette semaine** : classement existant (filtré sur `week_start` du lundi courant)
- **All Time** : requête de toutes les `activity_kpis` sans filtre de semaine, agrégées par `user_id` (somme des KPIs), puis calcul du score moyen par utilisateur. On utilisera une requête qui récupère tous les KPIs, puis on agrège côté client par user_id en calculant le score moyen sur l'ensemble des semaines saisies.

### 3. Navigation semaine par semaine (apporteurs)

Ajouter un état `selectedMonday` initialisé au lundi courant, avec des boutons chevron gauche/droite pour naviguer :
- **Chevron gauche** : `selectedMonday - 1 semaine`
- **Chevron droite** : `selectedMonday + 1 semaine` (désactivé si >= lundi courant)
- La requête `currentKpi` et la soumission utilisent `selectedMonday` au lieu de `currentMonday`
- Le formulaire se réinitialise quand on change de semaine
- Afficher la date de saisie/mise à jour (`updated_at`) sous le formulaire si une saisie existe pour cette semaine

### 4. Format de la semaine "Semaine du lundi X au dimanche Y AAAA"

Remplacer `Semaine du {d MMMM}` par `Semaine du {lundi d MMMM} au {dimanche d MMMM yyyy}`.
Exemple : "Semaine du 31 mars au 6 avril 2025"

### Fichier modifié

| Fichier | Modification |
|---------|-------------|
| `src/pages/working/MyActivity.tsx` | Les 4 points ci-dessus |

### Imports à ajouter
- `addDays` de `date-fns` (pour calculer le dimanche = lundi + 6)
- `ChevronLeft`, `ChevronRight` de `lucide-react`
- `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent` de `@/components/ui/tabs`

