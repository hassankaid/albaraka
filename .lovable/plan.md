

## Refonte affichage "Mes Contenus" — Double vue Cards + Liste

### Objectif

Ajouter un toggle Cards/Liste sur la page "Mes Contenus". La vue **Cards** sera aérée (max 2 colonnes, plus de padding, texte plus grand). La vue **Liste** sera un tableau stylisé avec une ligne par contenu.

### Ce qui change

**1. Toggle vue** — Deux icônes (grille / liste) en haut à droite, à côté du bouton "Nouveau contenu". L'état est stocké en `localStorage` pour persister entre les sessions.

**2. Vue Cards (améliorée)**
- Grille 1 colonne mobile, **2 colonnes max** sur desktop (au lieu de 3)
- Plus de padding (`p-5` au lieu de `p-4`), titre en `text-base` au lieu de taille par défaut
- Badge statut plus visible, barre de progression plus épaisse (`h-2` au lieu de `h-1.5`)
- Min-height augmenté pour plus d'aération

**3. Vue Liste (nouvelle)**
- Chaque contenu = une ligne horizontale dans une Card
- Colonnes : Titre + accroche | Thème + Format | Statut (badge) | Progression (barre compacte) | Date | Actions (Reprendre / Supprimer)
- Hover highlight sur chaque ligne
- Clic sur la ligne = Reprendre (comme un lien)

### Fichier modifié

| Fichier | Modification |
|---------|-------------|
| `src/pages/working/MyContents.tsx` | Ajout toggle vue, nouveau composant `ContentPieceRow`, cards aérées, localStorage pour la préférence |

