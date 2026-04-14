# Ethicarena Hub

Plateforme de gestion interne Ethicarena : CRM, finance, coaching, formation, outils IA.

## Stack

- **Frontend**: React 18 + TypeScript + Vite (port 8080) + Tailwind CSS + shadcn/ui
- **Backend**: Supabase (Auth, Postgres, Storage, Edge Functions Deno)
- **State**: TanStack React Query v5
- **Forms**: react-hook-form + zod
- **Routing**: React Router v6 (nested routes)
- **Deploy**: Push sur `main` = deploy automatique Vercel (domaine `albarakaecosysteme.com`)

## Commandes

```bash
npm run dev          # Dev server (port 8080)
npm run build        # Build production
npm run lint         # ESLint
npm run test         # Vitest (run once)
npm run test:watch   # Vitest (watch mode)
```

## Structure projet

```
src/
├── pages/           # Pages (une par route)
├── components/      # Composants reutilisables
│   └── ui/          # shadcn/ui
├── hooks/           # Custom hooks (useAuth, useFinancialData, etc.)
├── lib/             # Utilitaires
├── integrations/
│   └── supabase/    # Client Supabase + types auto-generes
└── assets/

supabase/
├── functions/       # Edge Functions (Deno, Claude API, Stripe)
└── migrations/      # Migrations SQL
```

## Conventions

- **Langue UI**: Francais (pas de lib i18n, textes en dur dans les composants)
- **Imports**: Utiliser l'alias `@/` pour les imports depuis `src/`
- **Composants UI**: Toujours utiliser shadcn/ui avant de creer un composant custom
- **Data fetching**: TanStack Query avec les clients Supabase directement
- **Types Supabase**: Auto-generes dans `src/integrations/supabase/types.ts` — ne pas editer manuellement
- **Edge Functions**: Deno runtime, JWT verification desactivee pour la plupart
- **TypeScript**: Config souple (noImplicitAny: false, strictNullChecks: false)
- **Fichiers sensibles**: Ne jamais commit `.env` (contient SUPABASE_KEY)

## Roles utilisateurs

- `ceo` : acces total + admin
- `collaborateur` : CRM + commissions
- `apporteur` : espace dedie /my-space
- `agence` : role defini, implementation limitee

## Base de donnees

- 37 tables schema public, RLS active partout
- Supabase project ID: `ktvszjzryabjgxyobtyc`
- Utiliser le MCP Supabase pour les queries SQL et migrations

## Git

- Branche principale: `main`
- Chaque push sur main declenche un deploy Vercel
- Toujours verifier `npm run build` avant de push
