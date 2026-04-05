

## Corrections Training — 3 fixes

### Problemes identifies

1. **Modules colles** — Le `space-y-4` est sur un div parent mais les `AccordionItem` sont enfants directs de `Accordion`, pas du div. Le gap ne s'applique pas correctement.
2. **Bouton "Commencer" supprime** — La card est cliquable mais le label visuel (Commencer/Reprendre/Revoir) a ete retire. Il faut le remettre.
3. **Module ouvert par defaut = le premier** — Il faut ouvrir le module qui contient le prochain chapitre non termine (ou le dernier module si tout est fait).

### Plan

**Fichier 1 : `src/pages/training/FormationDetail.tsx`**

- Changer la logique `defaultOpen` : au lieu de toujours ouvrir `modules[0].id`, trouver le module qui contient le premier chapitre non complete (pas dans `completedSet`). Si tous sont completes, ouvrir le dernier module.
- Ajouter une classe sur chaque `AccordionItem` pour le spacing : remplacer le wrapper `<div className="space-y-4">` + `<Accordion>` par un `<Accordion>` avec `className="space-y-4"` directement, car `space-y-*` applique du margin entre les enfants directs — et les `AccordionItem` sont les enfants directs de `Accordion`.

**Fichier 2 : `src/components/training/FormationCard.tsx`**

- Remettre le bouton visuel "Commencer" / "Reprendre" / "Revoir" avec l'icone, en bas de la card (comme avant). La card entiere reste cliquable en plus.

### Details techniques

Pour le module a ouvrir par defaut :
```typescript
const firstIncompleteModule = modules.find((m) => {
  const visibleChapitres = m.chapitres.filter(c => c.status === "published" || isCeo);
  return visibleChapitres.some(c => !completedSet.has(c.id));
});
const defaultOpen = firstIncompleteModule
  ? [firstIncompleteModule.id]
  : modules.length > 0
  ? [modules[modules.length - 1].id]
  : [];
```

Pour le spacing des modules, remplacer :
```tsx
<div className="space-y-4">
  <Accordion type="multiple" defaultValue={defaultOpen}>
```
par :
```tsx
<Accordion type="multiple" defaultValue={defaultOpen} className="space-y-4">
```
et supprimer le `<div>` wrapper.

