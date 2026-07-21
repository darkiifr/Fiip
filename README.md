# Fiip

Outil de prise de notes simple et rapide.

[![My Skills](https://skillicons.dev/icons?i=react,vite,tailwind,rust,supabase)](https://skillicons.dev)

## Site public

Site public et liens de notes partagees :
[https://fiip.fr/](https://fiip.fr/)

Portail compte :
[https://accounts.fiip.fr/](https://accounts.fiip.fr/)

## Licence & Achat

Obtenez votre licence ici :
[https://vinsstudio.mysellauth.com/](https://vinsstudio.mysellauth.com/)

---

## Architecture zero-knowledge, R2 et B2

Fiip chiffre les donnees sensibles cote client avant tout envoi reseau. La passphrase Fiip de l'utilisateur sert a deriver la cle locale de chiffrement; elle ne doit jamais etre transmise ni stockee en clair cote serveur. Les notes publiees sont l'exception explicite: la publication cree un snapshot public separe dans `public_note_snapshots`, revocable sans exposer les notes privees.

Les pieces jointes utilisateur passent exclusivement par Cloudflare R2 via les Edge Functions Supabase `generate-upload-url`, `confirm-upload` et `generate-download-url`. Les objets R2 utilisent des cles anonymisees `{owner_id}/{generated_id}` sans nom de fichier ni extension lisible. Les identifiants R2 (`R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`) sont des secrets Edge Function et ne doivent jamais etre exposes dans le client.

Backblaze B2 est reserve aux backups froids de Postgres. Le workflow `.github/workflows/postgres-b2-backup.yml` cree un `pg_dump` quotidien au format compresse, le chiffre avec age, puis l'envoie dans le bucket B2 dedie avec une retention de 3 quotidiens, 1 hebdomadaire et 1 mensuel. Le workflow de restauration verifie le checksum et cree un backup prealable automatique. B2 ne doit pas servir de stockage de pieces jointes.

## Clerk et Supabase Third-Party Auth

Clerk est le fournisseur d'identite cloud du desktop, de l'app Expo et de l'extension. Ajouter la cle publique `VITE_CLERK_PUBLISHABLE_KEY` (et son alias `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` sur mobile) active les providers. Le token de session retourne par `getToken()` est transmis a Supabase Third-Party Auth, puis `identity-bootstrap` mappe le claim `sub` Clerk vers un UUID Fiip interne. Les policies utilisent `public.fiip_current_user_id()` pour resoudre les identites Clerk et Supabase pendant la migration.

L'application mobile utilise Expo et `@clerk/expo`. Le cache de jetons est conserve dans SecureStore, Google passe par `useSSO()` et `Mobile/src/services/clerkSessionBridge.ts` fournit le pont Clerk/Supabase. Les passkeys mobiles necessitent le plan Clerk Pro, `@clerk/expo-passkeys`, une development build et les associations de domaine natives; elles ne doivent pas etre affichees tant que ces quatre prerequis ne sont pas actives.

L'extension Chrome utilise `@clerk/chrome-extension` avec `syncHost=https://clerk.fiip.fr`; la connexion Google est deleguee au portail Clerk heberge sur `https://portail.fiip.fr/sign-in`, puis revient sur `https://accounts.fiip.fr/account`. Ajouter `VITE_CLERK_PUBLISHABLE_KEY`, `VITE_CLERK_SYNC_HOST` et `VITE_CLERK_SIGN_IN_URL` au packaging, publier une extension avec un CRX ID stable, puis ajouter `chrome-extension://<id>` dans les allowed origins Clerk. Les captures cloud passent ensuite par le JWT Clerk et `identity-bootstrap` avant l'ecriture Supabase.

L'instance Clerk de production utilise `fiip.fr`, Google OAuth et les enregistrements DNS `clerk`, `accounts`, `clkmail`, `clk._domainkey` et `clk2._domainkey`. Clerk Billing reste desactive: les droits Fiip continuent de provenir de SellAuth/KeyAuth et des tables de plans Supabase afin d'eviter deux sources de facturation concurrentes. Resend reste reserve aux e-mails produit des Edge Functions; Clerk envoie les e-mails d'authentification via son domaine d'envoi DKIM dedie.

## Feature flags et kill switch

La table `feature_flags` gere les statuts `enabled`, `disabled` et `degraded` pour les scopes `app`, `mobile`, `site` et `all`. L'Edge Function publique `get-feature-flags` est lue au demarrage, toutes les 10 minutes et a la reconnexion. Le site public affiche une banniere en mode degrade et bloque le rendu en maintenance globale.

## Dashboard admin

Le dashboard admin est un projet separe dans `../fiipAdminDashboard`. Son serveur conserve les secrets Supabase hors du navigateur, signe une session en cookie httpOnly, applique une protection CSRF et journalise les mutations dans `audit_log`. Son depot GitHub prive est `darkiifr/fiipAdminDashboard`.

## Conformite avant production

Avant publication, executer les tests, audits et scans de secrets sur Fiip et sur le dashboard admin. Verifier explicitement qu'aucun `.env` n'est versionne, que R2 contient toutes les pieces jointes, que B2 ne contient que les backups, que le dashboard admin ne peut pas acceder au contenu prive chiffre, et que les CGU/Privacy Policy decrivent l'architecture reelle.

---

## Installer la version Mobile (iOS) via AltStore

Si vous utilisez un iPhone ou un iPad, la manière recommandée d'installer et de mettre à jour **Fiip** est d'utiliser **AltStore**.

### Étape 1 : Prérequis
Si vous n'avez pas encore AltStore d'installé sur votre appareil Apple, suivez le guide officiel sur leur site :
👉 [Installer AltStore](https://altstore.io/)

### Étape 2 : Installer Fiip
Depuis votre iPhone/iPad, vous pouvez utiliser l'un de ces liens :

- **[Ajouter la source Fiip à AltStore](altstore://source?url=https%3A%2F%2Fgithub.com%2Fdarkiifr%2FFiip%2Freleases%2Flatest%2Fdownload%2Faltstore.json)**
  Recommandé pour recevoir les mises à jour dans AltStore.

- **[Installer directement l'IPA avec AltStore](altstore://install?url=https%3A%2F%2Fgithub.com%2Fdarkiifr%2FFiip%2Freleases%2Flatest%2Fdownload%2FFiipMobile-Unsigned.ipa)**
  Ouvre AltStore directement sur l'installation de l'IPA.

- **[Télécharger l'IPA directement](https://github.com/darkiifr/Fiip/releases/latest/download/FiipMobile-Unsigned.ipa)**
  Utile si vous voulez conserver le fichier ou l'ouvrir depuis AltStore ensuite.

> 🔄 **Mises à jour automatiques** : Dès qu'une nouvelle version de Fiip sera disponible, le badge "Update" apparaîtra nativement dans votre AltStore.

---
Produit par darkii
