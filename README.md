# Plateforme Al Baraka

Plateforme de gestion interne de l'écosystème Ethicarena : CRM, finance, coaching, formation, outils IA.

## Stack

- **Frontend** : React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui
- **Backend** : Supabase (Auth, Postgres, Storage, Edge Functions Deno)
- **Hébergement** : Vercel (frontend) — `albarakaecosysteme.com`

## Développement local

Prérequis : Node.js 20+ et npm.

```sh
git clone <GIT_URL>
cd albaraka
npm install
npm run dev        # http://localhost:8080
```

Commandes utiles :

```sh
npm run build        # Build production
npm run preview      # Prévisualise le build
npm run lint         # ESLint
npm run test         # Vitest
```

## Déploiement

Le frontend est déployé automatiquement sur **Vercel** à chaque push sur `main`.

- **Production** : https://albarakaecosysteme.com
- **SPA rewrites** : configurés dans `vercel.json` pour React Router.
- **Variables d'environnement** : voir `.env.example`. Les clés Supabase publiques sont actuellement codées en dur dans `src/integrations/supabase/client.ts`.

Les **Edge Functions** restent hébergées sur Supabase (projet `ktvszjzryabjgxyobtyc`) et se déploient via `supabase functions deploy`.

## Structure

```
src/
├── pages/           # Pages (une par route)
├── components/      # Composants réutilisables
│   └── ui/          # shadcn/ui
├── hooks/           # Custom hooks
├── lib/             # Utilitaires
└── integrations/
    └── supabase/    # Client Supabase + types auto-générés

supabase/
├── functions/       # Edge Functions (Deno)
└── migrations/      # Migrations SQL
```
