---
name: fiip-app
description: Use when working on Fiip desktop, mobile, browser extension, public note site, notes, notebooks, settings, sync, AI/Dexter, licensing, exports, release workflows, or the local Fiip MCP server.
---

# Fiip App

## Workflow

Start by reading `AGENTS.md` at the repo root. Use existing project services before adding component-local business logic.

For app data operations from an agent, prefer the local MCP server configured in `.mcp.json`:

- `fiip_list_notes` to inspect notes.
- `fiip_search_notes` to find notes by title, content, or tag.
- `fiip_get_note` before updating or deleting.
- `fiip_create_note` and `fiip_update_note` for note edits.
- `fiip_delete_note` for soft deletion.
- `fiip_export_note_fiin` for importable `.fiin` exports.
- `fiip_get_settings` and `fiip_update_settings` for local MCP settings.

Read `references/mcp-tools.md` when you need the exact tool schemas.

## Guardrails

- Do not create release tags unless the user explicitly requests a tag or release.
- Keep AI on OpenRouter through `FREE_MODEL_ROUTER`; do not add user API-key fields or paid model pickers.
- Treat `profiles.plan_level` as the server source of subscription truth.
- Keep protected notes out of AI, public sharing, OCR sync, collaboration, and search indexing unless existing project logic explicitly unlocks them.
- Keep desktop theme behavior dark-only unless the user explicitly reintroduces another theme mode.
- Use `.fiin` for Fiip note export/import payloads.

## Validation

Prefer targeted checks for the files changed, then broaden when shared services or workflows changed:

- Desktop: `deno task lint`, `deno task test`, `deno task build`, `deno task security-check`.
- Tauri: `cargo check` and `cargo audit` in `src-tauri/`.
- Mobile: `npm test -- --runInBand` and `npm audit --audit-level=moderate` in `Mobile/`.
- Public site: `npm run lint`, `npm test`, `npm run build`, and `npm audit --audit-level=moderate` in `PublicLinksite/`.

For GitHub Actions release fixes, inspect logs with `gh run view` and patch workflows locally. Do not rerun or tag releases unless explicitly requested.
