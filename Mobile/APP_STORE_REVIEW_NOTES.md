# Fiip Mobile App Store Review Notes

## Executive Summary

- Fiip Mobile is a notes app with local notes, Supabase sync, attachments, sharing, AI assistance, and optional biometric locking.
- Top approval risks reduced in this pass: no external iOS purchase CTA for digital features, account deletion request is reachable from Settings, and invalid ATS plist key was removed.
- Remaining pre-submission risks: StoreKit is not implemented for paid iOS plans, final account deletion requires a Supabase server-side deletion worker, and App Store Connect privacy answers must disclose account/cloud data.

## Risk Register

| Priority | Area | Finding | Evidence | Recommendation | Effort | Confidence |
| --- | --- | --- | --- | --- | --- | --- |
| P1 | IAP | Paid iOS plans are not purchasable through StoreKit. | `Mobile/src/screens/SubscriptionScreen.tsx` | Keep paid plans disabled on iOS until StoreKit is implemented, or ship as free-only on iOS. | M | High |
| P1 | Account | Account creation exists; deletion must be available in-app. | `Mobile/src/screens/SupabaseAuthScreen.tsx`, `Mobile/src/screens/SettingsScreen.tsx` | Current app now exposes a deletion request. Add a Supabase Edge Function to actually delete auth user + data. | M | High |
| P1 | Privacy | App uses Supabase Auth and cloud notes. | `Mobile/src/services/supabase.js` | In App Store Connect privacy, disclose account identifier/email and user content if synced. | S | High |
| P2 | Permissions | Camera, mic, speech, photo library strings exist and are specific. | `Mobile/ios/FiipMobile/Info.plist` | Keep permission prompts contextual; do not request permissions at launch. | S | High |
| P2 | External links | GitHub update/AltStore flows are not App Store distribution features. | `Mobile/src/services/updater.ts`, `Mobile/src/services/altStore.ts` | Hide these flows in the App Store build if they are reachable from UI. | S | Medium |
| P2 | Technical | Paywall imported an uninstalled blur dependency. | `Mobile/src/components/PaywallModal.tsx` | Fixed by removing unused import. | S | High |

## Reviewer Experience Checklist

- Install and launch: should open the notes app without a required purchase.
- First-run clarity: core notes flow is visible; cloud sync requires account login.
- Permissions: camera/mic/photos/speech strings are present and explain note capture.
- Core feature access: local notes work without paid subscription.
- Purchase/restore path: iOS paid plans are disabled until StoreKit is connected.
- Account deletion: Settings > Cloud et sécurité > Supprimer le compte cloud.
- Offline: local Zustand/AsyncStorage notes remain available; Supabase sync resumes when authenticated.

## Suggested App Review Notes

Fiip is a notes app. Reviewers can create and edit local notes without buying anything.

Cloud sync is optional. To test Supabase sync, use:

- Email: `<reviewer-test-email>`
- Password: `<reviewer-test-password>`

Camera/photo/microphone/speech permissions are used only for note capture: scanned documents, photo attachments, voice notes, and dictation.

Paid plans are disabled on iOS in this build until StoreKit products are approved. The iOS app does not link to an external purchase page for digital features.

Account deletion can be requested from Settings > Cloud et sécurité > Supprimer le compte cloud.

## Next Submission Tasks

- Add a Supabase Edge Function `request-account-deletion` or `delete-account` using service-role credentials to remove the Supabase Auth user and owned cloud rows.
- Add StoreKit products and restore purchases before enabling Pro/Pro+ purchases on iOS.
- Fill App Store Connect privacy nutrition labels for account data and synced user content.
- Hide AltStore/manual updater UI from App Store builds if those screens are exposed.
