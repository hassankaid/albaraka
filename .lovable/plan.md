

## Restreindre la visibilité des sessions coaching par rôle

### Règles de visibilité

| Profil | Mes sessions (en tant qu'élève) | Sessions d'équipe |
|--------|---|----|
| **CEO** | ✅ Ses sessions en tant qu'élève | ✅ Toutes les sessions (onglet visible) |
| **Coach** (is_coach=true) | ✅ Ses sessions en tant qu'élève | ✅ Sessions qu'il a coachées (onglet visible) |
| **Collaborateur non-coach** | ✅ Ses sessions en tant qu'élève | ❌ Onglet masqué |
| **Apporteur non-coach** | ✅ Ses sessions en tant qu'élève | ❌ Onglet masqué |

### Changements dans `src/pages/MonCoaching.tsx`

1. **Déterminer si l'utilisateur a accès aux sessions d'équipe** : `const canSeeTeam = profile?.role === 'ceo' || profile?.is_coach === true`

2. **Conditionner la requête `teamSessions`** : ajouter `enabled: !!profile?.id && canSeeTeam`. Pour les coachs (non-CEO), filtrer avec `.eq("coach_user_id", profile.id)` au lieu de `.neq("student_user_id", profile.id)` — ils voient les sessions qu'ils ont menées. Pour le CEO, garder le `.neq("student_user_id")` actuel (voit tout).

3. **Masquer l'onglet "Sessions équipe"** : ne rendre le `TabsTrigger` et le `TabsContent` "team" que si `canSeeTeam` est true. Sans cet onglet, le `Tabs` component n'a plus besoin de tabs du tout pour les non-coachs — on peut simplement retirer le wrapper `Tabs` et afficher directement la liste "Mes sessions".

### Fichier modifié

| Fichier | Modification |
|---------|-------------|
| `src/pages/MonCoaching.tsx` | Masquer onglet équipe pour non-coachs, filtrer par coach_user_id pour les coachs |

