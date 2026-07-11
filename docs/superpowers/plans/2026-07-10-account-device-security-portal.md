# Account Device Security Portal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a real account portal with backend-tracked devices, security events, no-license OCR limits, lazy section loading, and a redesigned operational UI.

**Architecture:** Supabase owns the account/device state through `account-api`; the portal calls typed account actions and caches section payloads per browser session. UI components stay presentation-focused and use helpers for capability labels and local installation identity.

**Tech Stack:** Supabase Edge Functions, Postgres RLS, React 18, Vite, Vitest, `@iconify/react`.

## Global Constraints

- Do not expose backend provider names in end-user copy.
- No HWID, license key, token, or complete IP address is stored in device/security tables.
- New public schema tables must have RLS enabled and explicit `GRANT` statements.
- No license must display `OCR limite`, never `Illimite` by default.
- Sections load on demand and keep a session cache when switching.
- Keep the account portal dense, dark, operational, responsive, keyboard usable.

---

## File Structure

- Create `supabase/migrations/<generated>_account_device_security.sql`: account device and security-event tables, constraints, RLS, grants.
- Modify `supabase/functions/account-api/index.ts`: add validation, device registration, heartbeat, listing, revocation, summary payloads.
- Create `PublicLinksite/src/services/accountPresentation.js`: pure helpers for OCR/device/license labels.
- Create `PublicLinksite/src/services/deviceIdentity.js`: browser installation id and device descriptor.
- Modify `PublicLinksite/src/services/account.js`: account API action wrappers.
- Modify `PublicLinksite/src/App.jsx`: section state, History API navigation, lazy section data loading.
- Modify `PublicLinksite/src/components/account/*.jsx`: redesigned layout, overview, devices, security sections.
- Modify `PublicLinksite/src/index.css`: account portal refactor only.
- Add or modify tests in `PublicLinksite/src/services/*.test.js` and account component tests.

## Task 1: Capability Presentation

**Files:**
- Create: `PublicLinksite/src/services/accountPresentation.js`
- Test: `PublicLinksite/src/services/accountPresentation.test.js`

**Interfaces:**
- Produces: `getLicenseState(account): { hasActiveLicense, planLabel, statusLabel }`
- Produces: `getOcrState(account): { label, detail, tone }`
- Produces: `getDeviceLimitState(account): { used, limit, label }`

- [ ] Write failing tests for no-license OCR showing `OCR limite`, active limited OCR, and unlimited licensed OCR.
- [ ] Run `npm test -- accountPresentation.test.js` from `PublicLinksite` and confirm failure.
- [ ] Implement the helper functions with no UI dependencies.
- [ ] Re-run the targeted test and confirm pass.

## Task 2: Backend Device Tracking

**Files:**
- Create: `supabase/migrations/<generated>_account_device_security.sql`
- Modify: `supabase/functions/account-api/index.ts`
- Test: `supabase/functions/account-api/device-validation.test.ts`

**Interfaces:**
- Consumes: authenticated Supabase JWT from `getAuthenticatedUser(req)`.
- Produces actions: `register_device`, `heartbeat_device`, `list_devices`, `list_security_events`, `revoke_device`, `revoke_all_devices`.

- [ ] Use `supabase migration new account_device_security` to create the migration filename.
- [ ] Write validation tests for invalid UUIDs, long names, unknown platforms, and sanitized event metadata.
- [ ] Run `deno test supabase/functions/account-api/device-validation.test.ts` and confirm failure.
- [ ] Add focused validators exported from `supabase/functions/account-api/index.ts`.
- [ ] Add tables with RLS and explicit grants.
- [ ] Implement account-api actions using server-derived `user.id` and selected active license.
- [ ] Re-run Deno tests and inspect the SQL for RLS/grants.

## Task 3: Portal Account API Client

**Files:**
- Modify: `PublicLinksite/src/services/account.js`
- Create: `PublicLinksite/src/services/deviceIdentity.js`
- Test: `PublicLinksite/src/services/account.test.js`

**Interfaces:**
- Produces: `registerCurrentDevice()`, `fetchAccountDevices()`, `fetchSecurityEvents()`, `revokeDevice(deviceId)`, `revokeAllDevices(options)`.

- [ ] Write failing tests proving wrappers call `account-api` with action names and local installation id.
- [ ] Run targeted public tests and confirm failure.
- [ ] Implement wrappers and stable browser installation id.
- [ ] Re-run targeted tests and confirm pass.

## Task 4: Lazy Portal Navigation

**Files:**
- Modify: `PublicLinksite/src/App.jsx`
- Modify: `PublicLinksite/src/components/account/AccountLayout.jsx`
- Test: `PublicLinksite/src/App.test.jsx`

**Interfaces:**
- Consumes: client wrappers from Task 3.
- Produces: section cache object passed as `sectionData`.

- [ ] Write failing tests for account route section switching without reload and on-demand device/security fetch.
- [ ] Run targeted tests and confirm failure.
- [ ] Implement `active` state, `pushState`, `popstate`, registration after login, and section cache.
- [ ] Re-run targeted tests and confirm pass.

## Task 5: Redesigned Account Sections

**Files:**
- Modify: `PublicLinksite/src/components/account/AccountOverview.jsx`
- Modify: `PublicLinksite/src/components/account/AccountDevices.jsx`
- Modify: `PublicLinksite/src/components/account/AccountSecurity.jsx`
- Modify: `PublicLinksite/src/components/account/AccountSubscription.jsx`
- Modify: `PublicLinksite/src/index.css`
- Test: `PublicLinksite/src/components/account/AccountOverview.test.jsx`
- Test: `PublicLinksite/src/components/account/AccountDevices.test.jsx`

**Interfaces:**
- Consumes: capability helpers and account action callbacks.
- Produces: dense operational UI with loading, empty, error, and confirmation states.

- [ ] Write failing UI tests for no-license OCR, device list rows, current device badge, revoke confirmation, and security empty state.
- [ ] Run targeted public tests and confirm failure.
- [ ] Implement redesigned components and account CSS.
- [ ] Re-run targeted tests and confirm pass.

## Task 6: Verification

**Files:**
- No new files unless test failures require scoped fixes.

- [ ] Run `npm run lint` in `PublicLinksite`.
- [ ] Run `npm test` in `PublicLinksite`.
- [ ] Run `npm run build` in `PublicLinksite`.
- [ ] Run `npm audit --audit-level=moderate` in `PublicLinksite`.
- [ ] Run targeted Deno tests for `account-api`.
- [ ] Start the public site dev server and inspect `/account` and `/account/devices`.
