

## Correction réaffectation + Protection anti-doublon

### 1. Réaffectation corrective (données)

Via l'outil d'insertion SQL, réaffecter :
- **42 leads** actuellement chez Hedi → retour chez **Sabrina** (`071078ef-04ff-4ddc-9a38-f6ba8e6748c4`)
- **15 leads** actuellement chez Saba → retour chez **Miradie** (`016f6199-a0a2-468e-8b36-73d815fb7e50`)

Tous ces leads sont encore en `a_qualifier` et n'ont pas été traités. L'opération consiste en deux `UPDATE` sur la table `leads` + insertion d'activités de log pour traçabilité.

### 2. Protection dans l'affectation en masse

Modifier `handleBulkAssign` dans `src/pages/Leads.tsx` pour :

1. **Avant d'affecter**, vérifier si certains leads sélectionnés sont déjà assignés à un autre collaborateur (`assigned_to IS NOT NULL`)
2. **Si des leads déjà assignés sont détectés** : afficher une boîte de confirmation avec un message clair :
   - "X leads sur Y sont déjà assignés à un collaborateur. Voulez-vous quand même les réaffecter ?"
   - Boutons : "Annuler" / "Affecter uniquement les non-assignés" / "Tout réaffecter"
3. Selon le choix, filtrer les IDs avant l'update

### Fichiers modifiés

| Fichier | Modification |
|---------|-------------|
| `src/pages/Leads.tsx` | Ajouter vérification pré-affectation + dialog de confirmation |
| Base de données | UPDATE 42 + 15 leads + log d'activité |

