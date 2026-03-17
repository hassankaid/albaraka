

## Plan : Statuts manuels + Intégration Stripe sur les paiements

### 1. Nouveaux statuts de paiement

Ajouter deux statuts réels en base : `late` et `lost`, en plus de `pending`, `paid`, `cancelled`.

**Changements DB (migration) :**
- Pas de contrainte enum sur `status` (c'est un `text`), donc pas de migration structurelle nécessaire pour les nouveaux statuts.
- Modifier le trigger `sync_commission_status_on_payment` pour gérer `late` et `lost` (commissions → `cancelled` quand `lost`).
- Modifier `compute_sale_payment_status` pour prendre en compte `lost`.
- Créer un trigger/fonction `cascade_lost_payments` : quand un paiement passe à `lost`, toutes les mensualités suivantes (même `sale_id`, `payment_number` supérieur, statut != `paid`) passent aussi à `lost`.

### 2. UI admin — Changement manuel de statut

Dans `src/pages/Payments.tsx`, colonne Action du CEO :
- Remplacer le simple bouton "Payé" par un **dropdown d'actions** contextuel selon le statut actuel :
  - `pending` / `late` → boutons : "Payé" (avec calendrier), "En retard", "Perdu"
  - `paid` → pas d'action (ou modification de date uniquement, déjà en place)
  - `lost` → pas d'action
- Quand le CEO clique "Perdu", une confirmation s'affiche ("Cela marquera aussi les mensualités suivantes comme perdues").

### 3. Mise à jour des badges et filtres

- `getPaymentStatusInfo` : ajouter `late` (rouge, distinct du "retard calculé") et `lost` (gris foncé / barré).
- Le filtre statut : ajouter "Perdu" dans les options.
- Le KPI "en retard" inclura les `late` + `pending` dépassés.

### 4. Intégration Stripe

- **Activer Stripe** via l'outil dédié (clé secrète nécessaire).
- Créer une **edge function `stripe-webhook`** qui écoute les événements :
  - `invoice.paid` / `payment_intent.succeeded` → met le paiement en `paid` avec `paid_at`.
  - `invoice.payment_failed` / `charge.failed` → met le paiement en `late`.
- Stocker le `stripe_customer_id` et/ou `stripe_subscription_id` sur la table `payments` ou `sales` (migration à définir après activation Stripe, selon le modèle choisi — abonnement ou paiements ponctuels).
- Le webhook sera déployé automatiquement.

### 5. Fichiers impactés

| Fichier | Modification |
|---------|-------------|
| `src/pages/Payments.tsx` | Dropdown actions CEO, nouveaux badges, filtre "Perdu" |
| `src/components/admin-create/CreatePaymentsForm.tsx` | Ajouter `late` et `lost` dans les options de statut |
| Migration SQL | Trigger cascade `lost`, mise à jour `sync_commission_status_on_payment` et `compute_sale_payment_status` |
| `supabase/functions/stripe-webhook/index.ts` | Nouvelle edge function pour les webhooks Stripe |
| `supabase/config.toml` | Enregistrer la nouvelle function |

### 6. Ordre d'exécution

1. Migration SQL (triggers + fonctions)
2. UI statuts manuels (Payments.tsx, CreatePaymentsForm)
3. Activer Stripe (outil)
4. Edge function webhook Stripe
5. Lier les paiements existants / futurs à Stripe (selon config)

