

## Plan : Espaces séparés TRACKING et COACHING avec sidebars distinctes

### Problème actuel
Les liens "Coaching" et "Mon Coaching" sont mélangés dans la sidebar TRACKING. Or, l'idée est d'avoir **deux espaces complètement séparés** avec chacun sa propre sidebar.

### Architecture cible

```text
┌─────────────────────────────────────────────────┐
│  SpaceSwitcher (en haut de la sidebar)           │
│  ┌─────────────┐  ┌──────────────────┐          │
│  │  TRACKING    │  │  COACHING         │          │
│  └─────────────┘  └──────────────────┘          │
├─────────────────────────────────────────────────┤
│                                                  │
│  SI espace = TRACKING :                          │
│    Dashboard, Leads, Calls, Contacts,            │
│    Ventes, Paiements, Commissions,               │
│    Admin (Équipe, Factures, etc.)                 │
│                                                  │
│  SI espace = COACHING :                          │
│    Coach → "Sessions" (/coaching)                │
│    Élève → "Mon Coaching" (/mon-coaching)        │
│                                                  │
└─────────────────────────────────────────────────┘
```

### Modifications

**1. `src/components/DashboardLayout.tsx`**
- Séparer `allNavItems` en deux listes : `trackingNavItems` et `coachingNavItems`
- `trackingNavItems` : tous les items actuels SAUF "Coaching" et "Mon Coaching"
- `coachingNavItems` : 
  - "Sessions" (`/coaching`, icône GraduationCap) — visible si `is_coach` ou `ceo`
  - "Mon Coaching" (`/mon-coaching`, icône BookOpen) — visible pour tous
- Détecter l'espace actuel via le pathname : si `/coaching` ou `/mon-coaching` → espace COACHING, sinon → TRACKING
- Afficher dynamiquement la bonne liste de liens selon l'espace actuel
- Supprimer les entrées "Coaching" et "Mon Coaching" de `allNavItems`

**2. `src/components/SpaceSwitcher.tsx`**
- Aucune modification nécessaire, il gère déjà la navigation et la détection d'espace

### Comportement par rôle

| Rôle | Espace TRACKING | Espace COACHING |
|------|-----------------|-----------------|
| CEO | Sidebar complète (dashboard, leads, admin...) | Sessions (coach) + Mon Coaching |
| Collaborateur coach | Sa sidebar collaborateur | Sessions (coach) + Mon Coaching |
| Collaborateur non-coach | Sa sidebar collaborateur | Mon Coaching uniquement |
| Apporteur | N/A (espace ApporteurLayout) | N/A |

### Détail technique

Dans `DashboardLayout.tsx`, on ajoute une détection :
```tsx
const isCoachingSpace = location.pathname.startsWith("/coaching") 
  || location.pathname.startsWith("/mon-coaching");

const navItems = isCoachingSpace ? coachingNavItems : trackingNavItems;
```

Les items coaching :
```tsx
const coachingNavItems = [
  { title: "Sessions", path: "/coaching", icon: GraduationCap, 
    roles: ["ceo", "collaborateur"], coachOnly: true },
  { title: "Mon Coaching", path: "/mon-coaching", icon: BookOpen, 
    roles: ["ceo", "collaborateur"] },
];
```

Le filtrage `coachOnly` applique la même règle que maintenant (`is_coach || role === 'ceo'`).

