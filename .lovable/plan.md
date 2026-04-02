## "Mon Activité" — Plan d'implémentation complet

### Rappel du périmètre

Nouvelle page "Mon Activité" dans l'espace WORKING pour les apporteurs (purs et collaborateurs-apporteurs) : saisie hebdo de 5 KPIs, objectifs, graphique d'évolution, coach IA post-soumission, classement CEO.

### Algorithme de classement révisé

Le cap à 100% est supprimé. Le classement utilise un **score composite à deux dimensions** :

```text
Score = Moyenne d'atteinte (sans cap) × Bonus régularité

Moyenne d'atteinte = moyenne(
  videos / obj_videos,
  messages / obj_messages,
  réponses / obj_réponses,
  rdv / obj_rdv,
  ventes / obj_ventes
) × 100

Bonus régularité = 1 + 0.1 × nombre_de_KPIs_≥_objectif
  (varie de 1.0 à 1.5 selon combien de KPIs atteignent l'objectif)
```

Exemple concret :
- **Apporteur A** : 150% messages, 120% vidéos, 80% réponses, 50% rdv, 30% ventes → Moyenne = 86%, 2 KPIs atteints → Score = 86 × 1.2 = **103.2**
- **Apporteur B** : 100% sur les 5 → Moyenne = 100%, 5 KPIs atteints → Score = 100 × 1.5 = **150.0**
- **Apporteur C** : 200% messages, 200% vidéos, 100% réponses, 100% rdv, 100% ventes → Moyenne = 160%, 5 atteints → Score = 160 × 1.5 = **240.0**

Résultat : le dépassement est récompensé, la régularité donne un bonus, et il n'y a plus d'ex-aequo artificiels à 100%.

### Base de données

**Table `activity_kpis`** :
- `id` uuid PK, `user_id` uuid (ref profiles), `week_start` date (lundi), `videos_published` int, `messages_sent` int, `replies_received` int, `appointments` int, `sales_made` int, `ai_feedback` text, `created_at`, `updated_at`
- Contrainte unique : `(user_id, week_start)`

**Table `activity_objectives`** :
- `id` uuid PK, `kpi_key` text, `weekly_target` int, `created_at`, `updated_at`
- Seed : videos=7, messages=500, replies=10, appointments=10, sales=3

RLS : chaque user lit/écrit ses propres `activity_kpis` ; CEO lit tout. `activity_objectives` lisible par tous les authentifiés, modifiable par CEO.

### Page MyActivity — Layout

```text
┌──────────────────────────────────────────────────────┐
│  OBJECTIFS HEBDO (5 barres de progression)           │
│  Peuvent dépasser 100% (barre pleine + badge ×1.5)  │
├──────────────────────────────────────────────────────┤
│  COACH IA (dernier feedback après soumission)        │
│  Message statique d'accueil si première visite       │
├──────────────────────────────────────────────────────┤
│  SAISIE HEBDO (semaine du XX au XX)                  │
│  5 champs numériques + bouton Valider                │
├──────────────────────────────────────────────────────┤
│  ÉVOLUTION (graphique barres groupées par semaine)   │
│  Apparaît dès ≥ 2 semaines de données               │
└──────────────────────────────────────────────────────┘
```

### Classement CEO (AdminCoachingDashboard)

Section "Top Apporteurs de la semaine" : liste classée par score composite (sans cap), avec % moyen d'atteinte + nombre de KPIs atteints affichés. Médailles pour le top 3.

### Fichiers à créer/modifier

| Fichier | Action |
|---------|--------|
| Migration SQL | Tables `activity_kpis` + `activity_objectives` + RLS + seed |
| `src/pages/working/MyActivity.tsx` | Page complète |
| `src/components/DashboardLayout.tsx` | Nav item "Mon Activité" pour apporteurs/collaborateurs-apporteurs |
| `src/components/ApporteurLayout.tsx` | Nav item WORKING "Mon Activité" |
| `src/App.tsx` | Route `/working/activity` |
| `supabase/functions/activity-ai-coach/index.ts` | Edge function feedback IA post-soumission |
| `src/components/admin-coaching/AdminCoachingDashboard.tsx` | Section classement hebdo |

### Étapes

1. Migration DB
2. Page MyActivity (saisie + objectifs + graphique)
3. Routes + navigation
4. Edge function coach IA
5. Classement CEO