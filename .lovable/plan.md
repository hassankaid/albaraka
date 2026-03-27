

## Plan : Élargir la réaffectation des leads recyclés à tous les collaborateurs

### Contexte
Actuellement, dans l'onglet "À recycler", le CEO ne peut réaffecter les leads qu'aux collaborateurs de niveau "intermédiaire". La demande est de permettre la réaffectation à **tous les collaborateurs** (intermédiaires ET confirmés), tout en conservant la règle RLS existante (les intermédiaires ne voient que leurs leads assignés).

### Modification

**Fichier : `src/pages/Leads.tsx`**
- Ligne ~572 et ~726 : Supprimer les deux `.filter((c) => c.collaborateur_level === "intermediaire")` dans les menus de réaffectation de l'onglet "À recycler", pour afficher l'ensemble des collaborateurs disponibles.

Aucune modification RLS nécessaire — les politiques existantes restent inchangées.

