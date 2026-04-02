

## Créer l'espace ADMIN (CEO only) et réorganiser WORKING

### Objectif

Extraire les pages admin du CEO (Équipe, Commissions, Factures, Données, Créer) dans un nouvel espace **ETHICARENA ADMIN** accessible uniquement au CEO. Dans WORKING, le CEO voit :
- **Suivi Activité** (renommé depuis "Mon Activité" — vue admin du leaderboard/suivi des apporteurs)
- Générateur Contenu
- Agent IA
- Mon Dashboard, Leads, Calls, Contacts, Ventes, Paiements, Commissions

### Architecture cible

```text
WORKING (tous les rôles)
  Suivi Activité (CEO) / Mon Activité (autres)
  Mon Dashboard
  Leads, Calls, Contacts, Ventes, Paiements, Commissions
  Générateur Contenu, Agent IA

ADMIN (CEO uniquement)
  Équipe
  Commissions
  Factures
  Données
  Créer

TRAINING (CEO + collaborateurs)
  Scripts Setting, Scripts Closing

COACHING (inchangé)
  Évaluations, Historique, Administration
```

### Changements

#### 1. SpaceSwitcher.tsx
- Ajouter un 4e espace **ADMIN** (icône `Settings2`, couleur rouge/rose, path `/admin/team`)
- Visible uniquement pour `role === "ceo"`
- Détection : routes `/admin/*` (sauf `/admin/coaching`) → espace ADMIN
- WORKING path pour CEO : `/working/activity` (comme les autres, plus `/dashboard`)

#### 2. DashboardLayout.tsx
- Retirer les items `adminSection: true` de `workingNavItems`
- Créer `adminNavItems` : Équipe, Commissions, Factures, Données, Créer (CEO only)
- Ajouter un `currentNavMode: "admin"` quand route = `/admin/*` (sauf `/admin/coaching`)
- Renommer "Mon Activité" en "Suivi Activité" pour le CEO dans le rendu (ou via un titre conditionnel)
- Retirer le séparateur admin dans le mode working (plus besoin)
- Mettre à jour `pageTitles` : `/working/activity` → "Suivi Activité" pour CEO

#### 3. Fichiers modifiés

| Fichier | Modification |
|---------|-------------|
| `src/components/SpaceSwitcher.tsx` | Ajouter espace ADMIN (CEO only), détection route admin |
| `src/components/DashboardLayout.tsx` | Extraire adminNavItems, ajouter mode "admin", titre conditionnel "Suivi Activité" pour CEO |

