# Rapport securite et conformite Fiip

Date: 2026-07-20

## Perimetre controle

- Client desktop/web Fiip et backend Tauri.
- Application React Native dans `Mobile/`.
- Site public dans `PublicLinksite/`.
- Migrations et Edge Functions Supabase.
- Dashboard separe `../fiipAdminDashboard`.
- Workflows de backup et restauration Backblaze B2.

## Controles implementes

- Chiffrement client AES-GCM avec cle PBKDF2 derivee de la passphrase Fiip.
- Passphrase conservee uniquement en memoire; seul un verificateur chiffre est persiste.
- Notes, taches integrees, parametres, OCR et metadonnees de pieces jointes chiffres avant le reseau.
- Snapshots publics distincts et supprimes lors de la revocation.
- Pieces jointes privees transferees vers R2 avec cles `{owner_id}/{generated_id}`.
- Validation backend atomique des quotas notes, stockage, taille par note et taille par piece jointe.
- Garde-fou ZIP, cache local, file offline et reprise a la reconnexion.
- Clerk Third-Party Auth avec mapping `sub` vers UUID Fiip et policies provider-neutral.
- Kill switch et mode degrade sur desktop, mobile et site public.
- Dashboard admin avec cookie httpOnly signe, SameSite strict, CSRF, confirmations et audit.
- Backups Postgres chiffres par age, checksum, retention 3/1/1 et backup pre-restauration.

## Verification executee

- Racine: lint sans erreur bloquante, 242 tests passes et 1 ignore, build reussi, audit npm sans vulnerabilite.
- Edge Functions: `deno check` reussi sur les fonctions d'identite, R2, settings, flags et restauration.
- Edge settings: test Deno de merge par cle reussi.
- Mobile: 69 tests passes, audit npm sans vulnerabilite.
- Site public: 66 tests passes, lint et build reussis, audit npm sans vulnerabilite.
- Tauri: `cargo check` reussi.
- Dashboard admin: syntaxe Node, lint, build et audit npm reussis.
- Scan de motifs de secrets: aucun resultat dans les fichiers suivis Fiip ou admin.
- Historique: `Mobile/ios/.xcode.env` a existe, mais ne contenait que la resolution `NODE_BINARY`.

## Points restant avant production

- Demarrer Docker Desktop et executer un reset Supabase complet pour valider les migrations, RLS, Clerk JWT et quotas sur Postgres reel.
- Configurer les secrets Clerk, Supabase, R2, B2, age et GitHub Actions dans leurs dashboards.
- Activer la Native API Clerk. Le client mobile React Native CLI doit adopter Expo Modules avant d'utiliser l'interface officielle `@clerk/expo`; le pont de session est deja present.
- Le depot prive `darkiifr/fiipAdminDashboard` a ete cree et rattache au projet local. Les changements locaux doivent encore etre commits puis pousses.
- Reinstaller le plugin Chrome dans ChatGPT: l'hote natif Chrome est absent. La validation visuelle et le provisioning par navigateur n'ont donc pas pu etre executes.
- Corriger la dette de lint globale Mobile (311 erreurs historiques) avant d'imposer ce controle en CI.
- Examiner les avertissements `cargo audit` autorises, notamment `RUSTSEC-2024-0429` sur `glib` et les dependances GTK3 non maintenues.

## Decision de publication

L'implementation locale est prete pour une revue technique, mais la publication production doit rester bloquee jusqu'a la validation SQL/RLS sous Docker, au provisioning des services externes et a une validation visuelle via Chrome.
