

## Corrections "Mon Activité" — 3 points

### 1. Fix Coach IA (Edge Function)

Les logs montrent : `Anthropic error: 404 model: claude-3-5-sonnet-20241022`. Le modèle Claude utilisé n'existe plus. Il faut le remplacer par `claude-sonnet-4-20250514` dans `supabase/functions/activity-ai-coach/index.ts` (ligne 38).

### 2. Ajouter le leaderboard pour les apporteurs

Actuellement, seul le CEO voit le classement. Les apporteurs doivent aussi voir un mini-leaderboard en bas de leur page "Mon Activité", montrant :
- Le classement de la semaine (tous les apporteurs ayant saisi)
- Leur propre ligne mise en surbrillance
- Leur score et leur rang

Cela nécessite que les apporteurs puissent lire les KPIs de tous les utilisateurs pour la semaine en cours. Il faudra ajouter une politique RLS `SELECT` sur `activity_kpis` pour les utilisateurs authentifiés (lecture seule sur la semaine courante), ou utiliser une approche plus simple : permettre la lecture à tous les authentifiés.

### 3. Note explicative du score

Ajouter une petite carte "Comment est calculé mon score ?" avec un texte concis :

> Ton score = moyenne de tes % d'atteinte sur les 3 objectifs (vidéos, messages, RDV) × bonus régularité. Dépasser un objectif rapporte plus de points. Bonus : +10% par objectif atteint ou dépassé (max +50%).

### Fichiers modifiés

| Fichier | Modification |
|---------|-------------|
| `supabase/functions/activity-ai-coach/index.ts` | Changer le modèle Claude → `claude-sonnet-4-20250514` |
| `src/pages/working/MyActivity.tsx` | Ajouter leaderboard pour apporteurs + note explicative du score |
| Migration SQL | Ajouter politique RLS lecture `activity_kpis` pour tous les authentifiés |

### Étapes
1. Migration : politique RLS lecture sur `activity_kpis` pour authenticated
2. Fix modèle dans edge function
3. Ajouter section leaderboard + note score dans la vue apporteur

