# Fiip - Guide de Contribution pour Agents IA

Ce document resume les conventions utiles pour intervenir rapidement sur Fiip sans casser les chemins desktop, mobile ou public.

## Commandes de Base

Fiip utilise Deno comme interface principale du desktop/web, npm pour les sous-projets et Cargo pour Tauri.

### Desktop & Web

- Developpement: `deno task dev` (Vite sur le port 1420)
- Tauri dev: `deno task tauri dev`
- Lint: `deno task lint`
- Tests: `deno task test` (delegue a `npm run test` pour fiabiliser Vitest/JSDOM)
- Build: `deno task build`
- Securite: `deno task security-check`
- Validation complete: `deno task quality`

### Tauri / Rust

- Check: `cargo check` dans `src-tauri/`
- Audit: `cargo audit` dans `src-tauri/`

### Site public

- Dossier: `PublicLinksite/`
- Lint: `npm run lint`
- Tests: `npm test`
- Build: `npm run build`
- Audit: `npm audit --audit-level=moderate`

### Mobile

- Dossier: `Mobile/`
- Demarrage: `npm start`
- iOS / Android: `npm run ios` / `npm run android`
- Tests: `npm test -- --runInBand`
- Audit: `npm audit --audit-level=moderate`
- Apres modification de dependances: toujours executer `npm install` pour appliquer les `patches/`.

## Architecture Technique

- Frontend desktop: React 19 + Tailwind CSS 4 + Vite/Rolldown.
- Desktop natif: Tauri 2.0 avec backend Rust.
- Editeur: Tiptap v3 avec Yjs, Hocuspocus et `@tiptap/extension-collaboration-caret`.
- Backend: Supabase (Auth, DB, Storage). Les flux doivent respecter RLS.
- Mobile: React Native avec Supabase, Zustand, React Navigation et primitives Liquid Glass.
- Site public: Vite/React, rendu public des notes via Supabase, Markdown sanitise avec DOMPurify.
- IA: OpenRouter uniquement via `ai-proxy`; la Management Key reste dans les secrets Supabase et les cles enfant sont chiffrees par utilisateur ou famille.

## URLs Produit

- Site public Fiip: `https://fiip.fr/`
- Authentification Clerk Fiip: `https://portail.fiip.fr/`
- Espace compte Fiip: `https://accounts.fiip.fr/`
- Notes publiques: `https://fiip.fr/n/{slug}`
- Achat licence: `https://vinsstudio.mysellauth.com/`
- Utiliser les constantes de liens du projet au lieu de hardcoder ces URLs dans les composants.

## IA et OpenRouter

- Services principaux: `src/services/ai.js` et `Mobile/src/services/ai.ts`.
- Le modele impose est `openrouter/free` via `FREE_MODEL_ROUTER`.
- Endpoints autorises: `/chat/completions`, `/generation` et `/models`.
- Ne pas reintroduire de champ de cle API, modele payant ou modele personnalise dans l'UI.
- Les statistiques d'usage doivent venir de la reponse OpenRouter et de `/generation`.
- Les secrets doivent rester dans GitHub Actions ou dans l'environnement local non versionne.

## Secrets GitHub Actions

Secrets attendus:

- `OPENROUTER_MANAGEMENT_KEY` (secret Supabase Edge uniquement)
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_KEYAUTH_OWNERID`
- `VITE_KEYAUTH_SECRET`
- `VITE_HOCUSPOCUS_URL`
- `TAURI_SIGNING_PRIVATE_KEY`
- `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`
- `CHROME_WEBSTORE_EXTENSION_ID`
- `CHROME_WEBSTORE_PUBLISHER_ID`
- `CHROME_WEBSTORE_CLIENT_ID`
- `CHROME_WEBSTORE_CLIENT_SECRET`
- `CHROME_WEBSTORE_REFRESH_TOKEN`

Variables GitHub optionnelles:

- `VITE_KEYAUTH_NAME` (fallback: `Fiip`)
- `VITE_KEYAUTH_APIURL` (fallback: `https://keyauth.win/api/1.2/`)

Les workflows injectent aussi les alias mobile `EXPO_PUBLIC_SUPABASE_*` et `EXPO_PUBLIC_KEYAUTH_*` a partir des memes secrets.

## Design System

Le projet suit une direction Liquid Glass moderne.

- Desktop: utiliser `src/components/GlassSurface.jsx`, `src/components/GlassSurface.css` et les primitives `src/components/ui/*`.
- Mobile iOS: utiliser `@callstack/liquid-glass` via les composants comme `Mobile/src/components/ui/GlassCard.tsx`.
- Tokens globaux desktop: `src/index.css`.
- Theme mobile: `Mobile/src/theme/fiipDesign.ts`.
- Typographies cibles: Geist pour l'interface, le texte courant et les titres; Geist Mono pour raccourcis, donnees et code.
- Respecter `prefers-reduced-motion` pour les animations web.

## Qualite et Securite

- Dependabot couvre npm racine, npm Mobile, npm PublicLinksite, Cargo `src-tauri` et GitHub Actions.
- Workflow principal: `.github/workflows/security-audit.yml`.
- Les validations attendues avant livraison sont:
  - `deno task lint`
  - `deno task test`
  - `deno task build`
  - `deno task security-check`
  - `npm audit --audit-level=moderate`
  - `cargo check` et `cargo audit` dans `src-tauri/`
  - `npm test -- --runInBand` et `npm audit --audit-level=moderate` dans `Mobile/`
  - `npm run lint`, `npm test`, `npm run build`, `npm audit --audit-level=moderate` dans `PublicLinksite/`

## Conventions de Code

- Garder la logique metier dans `src/services/` ou `Mobile/src/services/`.
- Eviter la logique complexe directement dans les composants React.
- Ne pas remettre Tiptap v2 ni `@tiptap/extension-collaboration-cursor`.
- Utiliser `unplugin-icons` avec le prefixe `~icons/` cote desktop.
- Les listes scrollables doivent prevoir `scrollbar-gutter: stable` quand necessaire.
- Ne pas versionner les secrets, fichiers `.env`, dossiers de build, caches, coverage ou artefacts locaux.
- Le fichier local `codex.md` est ignore par Git pour les notes personnelles Codex.

## Documentation Supplementaire

- `GEMINI.md`: vue technique detaillee.
- `README.md`: installation et configuration initiale.
- `CONTRIBUTING.md`: standards de contribution.
