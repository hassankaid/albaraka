

## Plan : Salaire fixe mensuel pour collaborateurs et agence

### Principe
Ajouter deux champs sur la table `profiles` : `fixed_salary` (montant) et `fixed_salary_active` (booléen). Lors de la génération de facture, si le bénéficiaire a un salaire fixe actif, une ligne supplémentaire "Salaire fixe" est ajoutée à la facture, en plus des éventuelles commissions.

### Changements

**1. Migration base de données**
- Ajouter `fixed_salary numeric default null` et `fixed_salary_active boolean default false` sur `profiles`

**2. Edge Function `generate-apporteur-invoice`**
- Après avoir récupéré les commissions éligibles, vérifier si le bénéficiaire a un `fixed_salary_active = true`
- Si oui, ajouter le montant du salaire fixe au total et créer une ligne de facture dédiée (client_name = "Salaire fixe", commission_amount = montant du salaire, pourcentage = null)
- Permettre la génération d'une facture même sans commissions (cas où il n'y a qu'un salaire fixe)
- Ajouter la ligne dans le HTML de la facture

**3. Page AdminInvoices — onglet "À facturer"**
- Dans la requête qui liste les bénéficiaires à facturer, inclure aussi les profils avec `fixed_salary_active = true` même s'ils n'ont pas de commissions "due" ce mois-ci
- Afficher le montant du salaire fixe dans le total affiché

**4. Page Profile (CEO/collaborateur/agence)**
- Ajouter un champ "Salaire fixe mensuel" (input numérique) visible uniquement pour le CEO sur la page admin ou sur les profils concernés
- Le CEO peut activer/désactiver et modifier le montant

**5. AdminData ou section dédiée**
- Permettre au CEO de voir et modifier le salaire fixe depuis la gestion des profils (pas que depuis le profil de chaque personne)

### Points techniques
- La ligne de facture pour le salaire fixe utilise `payment_id` et `sale_id` à NULL — il faut rendre ces colonnes nullable dans `invoice_lines` ou créer un type de ligne distinct
- Le trigger `sync_commissions_on_invoice_paid` n'est pas impacté car le salaire fixe n'est pas une commission
- Les colonnes `invoice_lines.sale_id` et `invoice_lines.payment_id` sont actuellement NOT NULL — une migration les rendra nullable pour supporter les lignes de salaire fixe

