

## Restructuration des espaces — WORKING absorbe TRACKING + nouveau TRAINING

### Architecture cible

```text
AVANT (3 espaces)              APRÈS (3 espaces)
─────────────────              ──────────────────
TRACKING                       WORKING (fusionné)
  Dashboard, Leads, Calls...     ┌─ Section "Suivi" ──────────┐
                                 │  Dashboard, Leads, Calls,  │
WORKING                          │  Ventes, Paiements, etc.   │
  Mon Activité, Scripts,         └────────────────────────────-┘
  Générateur, Agent IA           ┌─ Section "Outils" ─────────┐
                                 │  Mon Activité, Générateur,  │
COACHING                         │  Agent IA                   │
  Évaluations, Historique        └─────────────────────────────┘

                               TRAINING (nouveau)
                                 Scripts Setting
                                 Scripts Closing

                               COACHING (inchangé)
                                 Évaluations, Historique, Admin
```

Je recommande les **sections séparées avec sous-titres** (petits labels gris "SUIVI" et "OUTILS" dans la sidebar). C'est le pattern le plus courant dans les SaaS pro (Notion, Linear, etc.), lisible sans surcharger l'UI, et cohérent avec le design existant.

### Détail des changements

#### 1. SpaceSwitcher.tsx
- Remplacer les 3 espaces par : **WORKING**, **TRAINING**, **COACHING**
- WORKING : icône Briefcase, path `/dashboard` (CEO/collab) ou `/my-space` (apporteur)
- TRAINING : icône BookOpenCheck, path `/training/scripts/setting`
- COACHING : inchangé
- Détection espace courant : `/training/*` → TRAINING, `/coaching|/mon-coaching` → COACHING, tout le reste → WORKING

#### 2. DashboardLayout.tsx
- Fusionner `trackingNavItems` et `workingNavItems` en une seule liste avec un champ `section`
- Section "SUIVI" : Dashboard, Leads, Calls, Contacts, Ventes, Paiements, Commissions, Équipe, Commissions admin, Factures, Données, Créer, Profil
- Section "OUTILS" : Mon Activité, Générateur Contenu, Agent IA
- Nouveau `trainingNavItems` : Scripts Setting (`/training/scripts/setting`), Scripts Closing (`/training/scripts/closing`)
- Rendu sidebar : si espace WORKING → afficher les deux sections avec label. Si espace TRAINING → `trainingNavItems`. Si COACHING → `coachingNavItems`

#### 3. ApporteurLayout.tsx
- Même logique : fusionner tracking + working nav items
- Section "SUIVI" : Dashboard, Leads, Ventes, Commissions, Profil
- Section "OUTILS" : Mon Activité
- Pas d'accès TRAINING pour les apporteurs (pas de scripts)

#### 4. App.tsx — Routes
- Renommer `/working/scripts/setting` → `/training/scripts/setting`
- Renommer `/working/scripts/closing` → `/training/scripts/closing`
- Ajouter redirect `/training` → `/training/scripts/setting`
- Les routes `/working/activity` et `/working/content` restent inchangées
- La route `/working` redirige toujours vers `/working/activity`

#### 5. Working.tsx (page hub)
- Cette page n'est plus utilisée (le redirect `/working` → `/working/activity` existe déjà). Aucun changement nécessaire.

### Gestion du switch collab/apporteur
Le bouton "Espace Apporteur" / "Espace Collaborateur" en bas de sidebar reste identique. Il change juste de layout (DashboardLayout ↔ ApporteurLayout), les deux étant maintenant dans l'espace WORKING.

### Fichiers modifiés

| Fichier | Modification |
|---------|-------------|
| `src/components/SpaceSwitcher.tsx` | 3 espaces : WORKING, TRAINING, COACHING |
| `src/components/DashboardLayout.tsx` | Fusionner nav items avec sections "SUIVI" / "OUTILS" + ajouter trainingNavItems |
| `src/components/ApporteurLayout.tsx` | Fusionner tracking + working avec sections |
| `src/App.tsx` | Routes scripts → `/training/*`, redirect `/training` |

### Points de vigilance
- Les routes `/working/activity` et `/working/content` ne changent PAS de préfixe
- Seuls les scripts changent de `/working/scripts/*` à `/training/scripts/*`
- Le coaching est totalement inchangé
- Les redirections existantes dans ProtectedRoute.tsx restent valides (elles pointent vers `/dashboard`, `/my-space`, etc.)

