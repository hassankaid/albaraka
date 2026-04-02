

## "Mon Activité" — Plan d'implémentation

### Algorithme de classement révisé (sans cap)

Le cap à 100% est supprimé. Le score utilise la **moyenne d'atteinte non capée + bonus régularité** :

```text
Score = Moyenne_atteinte × Bonus_régularité

Moyenne_atteinte = moyenne(
  videos / obj_videos,
  messages / obj_messages,
  réponses / obj_réponses,
  rdv / obj_rdv,
  ventes / obj_ventes
) × 100

Bonus_régularité = 1 + 0.1 × nombre_KPIs_≥_objectif
  (de 1.0 si aucun objectif atteint, à 1.5 si les 5 sont atteints)
```

Exemples :
- **A** : 150% msg, 120% vidéos, 80% rép, 50% rdv, 30% ventes → Moy=86%, 2 atteints → 86×1.2 = **103**
- **B** : 100% partout → Moy=100%, 5 atteints → 100×1.5 = **150**
- **C** : 200% msg, 200% vidéos, 100% rép+rdv+ventes → Moy=160%, 5 atteints → 160×1.5 = **240**

Un apporteur qui dépasse les objectifs est récompensé, et la régularité sur tous les axes donne un bonus supplémentaire. Plus d'ex-aequo artificiels.

### Base de données

**Table `activity_kpis`** : id, user_id, week_start (lundi), 5 KPIs int, ai_feedback text, created_at, updated_at. Unique (user_id, week_start).

**Table `activity_objectives`** : id, kpi_key, weekly_target, created_at, updated_at. Seed : videos=7, messages=500, replies=10, appointments=10, sales=3.

RLS : user lit/écrit ses propres KPIs, CEO lit tout. Objectifs lisibles par tous, modifiables par CEO.

### Fichiers

| Fichier | Action |
|---------|--------|
| Migration SQL | Tables + RLS + seed objectifs |
| `src/pages/working/MyActivity.tsx` | Saisie hebdo + objectifs + graphique + feedback IA |
| `src/components/DashboardLayout.tsx` | Nav "Mon Activité" pour apporteurs/collab-apporteurs |
| `src/components/ApporteurLayout.tsx` | Nav WORKING "Mon Activité" |
| `src/App.tsx` | Route `/working/activity` |
| `supabase/functions/activity-ai-coach/index.ts` | Edge function feedback post-soumission |
| `src/components/admin-coaching/AdminCoachingDashboard.tsx` | Top 3 apporteurs hebdo |

### Étapes

1. Migration DB (tables + RLS + seed)
2. Page MyActivity (saisie + objectifs barres sans cap + graphique)
3. Routes + navigation (deux layouts)
4. Edge function coach IA (post-soumission)
5. Classement CEO dans admin coaching (score non capé + bonus régularité)

