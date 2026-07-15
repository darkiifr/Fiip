# Project Overview: Fiip

Fiip is a multi-platform, fast, and simple note-taking application designed for productivity and collaboration. It leverages a modern tech stack to provide a seamless experience across Web, Desktop (Windows/macOS), and Mobile (iOS/Android).

## Tech Stack

- **Core Application (Root):** React 19, Vite 8, Tailwind CSS 4.
- **Desktop Wrapper:** Tauri 2.0 (Rust backend).
- **Mobile Application (`/Mobile`):** React Native 0.85.
- **Public Sharing Site (`/PublicLinksite`):** React, Vite.
- **Backend & Database:** Supabase.
- **Editor Engine:** Tiptap (ProseMirror) with collaboration via Yjs and Hocuspocus.
- **Licensing & Payments:** KeyAuth.
- **AI Integration:** OpenRouter (OpenAI/GPT models).
- **Runtime/Task Runner:** Deno (configured in `deno.json` for task execution).
- **I18n:** i18next, managed via Crowdin.

## Directory Structure

- `src/`: Main React source code for the Web/Desktop application.
  - `components/`: UI components, including the editor and various modals.
  - `services/`: Core logic for AI, KeyAuth, Supabase, and PDF generation.
  - `hooks/`: Custom React hooks.
  - `locales/`: Translation files.
- `src-tauri/`: Rust source code for the Tauri desktop application.
- `Mobile/`: React Native project for iOS and Android.
- `PublicLinksite/`: Source code for the public note-sharing website.
- `supabase/`: Database schema and configuration.
- `scripts/`: Maintenance and build scripts (version bumping, manifest generation).

## Building and Running

The project primarily uses **Deno** as a task runner (though `npm` scripts are also available).

### Desktop & Web (Root)
- **Development:** `deno task dev` (runs Vite at localhost:1420)
- **Tauri Dev:** `deno task tauri dev`
- **Build Web:** `deno task build`
- **Build Tauri:** `deno task tauri build`
- **Tests:** `deno task test`
- **Lint:** `deno task lint`

### Mobile Application (`/Mobile`)
- **Start Metro:** `npm start` (inside `Mobile/`)
- **Run Android:** `npm run android`
- **Run iOS:** `npm run ios`

### Public Sharing Site (`/PublicLinksite`)
- **Development:** `npm run dev` (inside `PublicLinksite/`)
- **Build:** `npm run build`

## Development Conventions

- **State Management:** Uses React's built-in state management and Zustand (in Mobile).
- **Styling:** Tailwind CSS 4 for the web/desktop app; React Native stylesheets for mobile.
- **Testing:** Vitest for the web application; Jest for the mobile application.
- **Communication:** Web/Desktop uses `@tauri-apps/api` to communicate with the Rust backend.
- **Modularity:** High use of services (`src/services/`) to abstract external API calls (AI, KeyAuth, Supabase).
- **Licensing:** Most advanced features (AI, Pro features) are gated by `keyAuthService.hasAIAccess()` or `hasProAccess()`.

## Environment Variables

Ensure a `.env` file exists in the root with the following (referenced in `src/services/keyauth.js` and others):
- `VITE_KEYAUTH_NAME`, `VITE_KEYAUTH_OWNERID`, `VITE_KEYAUTH_SECRET`, `VITE_KEYAUTH_APIURL`
- `OPENROUTER_MANAGEMENT_KEY` (secret Supabase Edge uniquement, jamais dans le client)
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- `VITE_HOCUSPOCUS_URL`
