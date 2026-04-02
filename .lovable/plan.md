

## Repenser la sidebar WORKING — Supprimer les sections SUIVI/OUTILS

### Constat

Les labels "SUIVI" et "OUTILS" créent une séparation artificielle. "Mon Activité" est autant du suivi qu'un outil, et l'utilisateur veut que ce soit la première page affichée. Plutôt que des sous-sections, on adopte une **liste unique ordonnée** sans labels de section, comme le font Slack ou Stripe Dashboard.

### Nouvelle organisation de la sidebar (DashboardLayout)

L'ordre reflète la priorité d'usage, avec "Mon Activité" en premier :

1. Mon Activité *(apporteurs + CEO)*
2. Mon Dashboard
3. Leads
4. Mes Calls
5. Contacts *(CEO)*
6. Mes Ventes
7. Mes Paiements
8. Mes Commissions
9. Générateur Contenu
10. Agent IA
11. ── séparateur visuel (trait fin) ──
12. Équipe *(CEO)*
13. Commissions *(CEO)*
14. Factures *(CEO)*
15. Données *(CEO)*
16. Créer *(CEO)*

Le séparateur sépare les pages perso/équipe des pages admin CEO — c'est plus logique qu'un label "outils".

### Nouvelle organisation (ApporteurLayout)

Liste unique sans labels :
1. Mon Activité
2. Dashboard
3. Mes Leads
4. Mes Ventes
5. Commissions & Factures
6. Mon Profil

### Page par défaut

La redirection `/working` → `/working/activity` existe déjà. Pour que "Mon Activité" soit vraiment la landing page quand on arrive sur l'espace WORKING, il faut aussi que le SpaceSwitcher pointe vers `/working/activity` au lieu de `/dashboard` pour les rôles qui y ont accès. Le CEO, lui, arrive toujours sur `/dashboard`.

### Fichiers modifiés

| Fichier | Modification |
|---------|-------------|
| `src/components/DashboardLayout.tsx` | Supprimer les sections "suivi"/"outils", réordonner les items, ajouter un séparateur avant les items admin CEO |
| `src/components/ApporteurLayout.tsx` | Supprimer les sections, réordonner avec Mon Activité en premier |
| `src/components/SpaceSwitcher.tsx` | Pour apporteurs/collaborateurs, pointer WORKING vers `/working/activity` au lieu de `/dashboard` |

