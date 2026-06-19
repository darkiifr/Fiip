# Fiip - Agent Quick Reference

Voir `AGENTS.md` pour le guide complet.

## A retenir

- Desktop/web: `deno task quality`.
- Desktop tests: `deno task test`.
- Desktop build: `deno task build`.
- Desktop audit: `deno task security-check`.
- Rust: `cargo check` et `cargo audit` dans `src-tauri/`.
- Public site: travailler dans `PublicLinksite/`, puis `npm run lint`, `npm test`, `npm run build`, `npm audit --audit-level=moderate`.
- Mobile: travailler dans `Mobile/`, puis `npm test -- --runInBand` et `npm audit --audit-level=moderate`.

## Contraintes Produit

- Tiptap est en v3. Utiliser `@tiptap/extension-collaboration-caret`.
- L'IA passe uniquement par OpenRouter avec `VITE_OPENROUTER_KEY`.
- Le routeur de modele doit rester `openrouter/free`.
- Ne pas remettre de saisie de cle API utilisateur ni de modele payant/personnalise.
- Supabase reste le backend commun desktop/mobile/public.
- Le design doit rester coherent avec la direction Liquid Glass et les tokens existants.
