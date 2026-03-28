

## Amélioration UX du Builder coaching

### Résumé
Trois améliorations de l'éditeur d'étapes dans le Sheet du Builder :
1. **Tips** : liste dynamique avec champs individuels + ajout/suppression
2. **Scripts** : éditeur riche (gras, italique, souligné) via Tiptap
3. **Débriefs** : options individuelles avec champs + ajout/suppression

---

### 1. Tips — Liste dynamique

Remplacer le textarea "un par ligne" par une liste d'inputs individuels :
- Chaque tip = un `Input` avec un bouton suppression (Trash2)
- Bouton "+ Ajouter un tip" en bas
- Stockage inchangé : `tips: string[]` dans `coach_steps`

### 2. Scripts — Éditeur riche avec Tiptap

**Dépendances à installer** : `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-underline`

**Migration SQL** : Ajouter une colonne `script_content text` à `coach_script_refs` pour stocker le HTML. Les anciennes données restent dans `script_lines` comme fallback.

**Composant** : Créer `src/components/ui/rich-text-editor.tsx` — un petit wrapper Tiptap avec toolbar (B, I, U).

**Builder** : Remplacer le textarea des scripts par ce composant. Au chargement, si `script_content` est null, on initialise depuis `script_lines.join("<br>")`.

**Session de notation** (`CoachingSession.tsx` + `SessionDetail.tsx`) : Rendre `script_content` avec `dangerouslySetInnerHTML` si disponible, sinon afficher `script_lines` comme avant (liste à puces).

### 3. Débriefs — Options individuelles

Remplacer le textarea "une option par ligne" par :
- Chaque option = un `Input` avec bouton suppression
- Bouton "+ Ajouter une option" en bas
- Stockage inchangé : `options: string[]` dans `coach_debrief_options`

---

### Fichiers modifiés

| Fichier | Modification |
|---------|-------------|
| `package.json` | Ajouter dépendances Tiptap |
| `src/components/ui/rich-text-editor.tsx` | Nouveau composant éditeur riche |
| `src/components/admin-coaching/AdminCoachingBuilder.tsx` | Tips en liste, scripts en éditeur riche, débriefs en items individuels |
| `src/pages/CoachingSession.tsx` | Rendu `script_content` HTML si disponible |
| `src/pages/SessionDetail.tsx` | Rendu `script_content` HTML si disponible |
| Migration SQL | `ALTER TABLE coach_script_refs ADD COLUMN script_content text` |

### Section technique

- Tiptap extensions : `StarterKit` (bold, italic) + `Underline`
- Le composant `RichTextEditor` prend `content: string` et `onChange: (html: string) => void`
- Toolbar minimaliste : 3 boutons toggle (B/I/U) avec état actif
- La mutation `updateScript` envoie `script_content` au lieu de `script_lines`
- Fallback : si `script_content` est null/vide, on lit `script_lines` comme avant

