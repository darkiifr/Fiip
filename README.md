# Fiip

Fiip est une application de prise de notes disponible sur ordinateur, mobile et navigateur. Les notes peuvent rester locales ou être synchronisées de manière chiffrée entre les appareils de l'utilisateur.

## Liens

- Site : [fiip.fr](https://fiip.fr/)
- Compte : [accounts.fiip.fr](https://accounts.fiip.fr/)
- Téléchargements : [dernière version](https://github.com/darkiifr/Fiip/releases/latest)
- Assistance : [Discord Fiip](https://discord.gg/nghHqs2pvN)

## Installation

### Ordinateur

Téléchargez l'installateur Windows, macOS ou Linux depuis la [dernière release](https://github.com/darkiifr/Fiip/releases/latest).

### Android

Téléchargez l'APK depuis la [dernière release](https://github.com/darkiifr/Fiip/releases/latest).

### iPhone et iPad avec AltStore Classic

1. Installez [AltStore Classic](https://altstore.io/).
2. Ouvrez [la source officielle Fiip](altstore://source?url=https%3A%2F%2Fgithub.com%2Fdarkiifr%2FFiip%2Freleases%2Flatest%2Fdownload%2Faltstore.json).
3. Installez Fiip depuis la source ajoutée.

L'IPA peut aussi être [ouverte directement dans AltStore](altstore://install?url=https%3A%2F%2Fgithub.com%2Fdarkiifr%2FFiip%2Freleases%2Flatest%2Fdownload%2FFiipMobile-Unsigned.ipa). AltStore Classic signe l'application avec le compte Apple de l'utilisateur et impose ses propres règles de renouvellement.

## Confidentialité

Le contenu privé synchronisé et les pièces jointes sont chiffrés côté client. Cloudflare R2 stocke les pièces jointes chiffrées; Backblaze B2 est réservé aux sauvegardes chiffrées de la base. Une note publique est une copie distincte créée et révoquée explicitement par l'utilisateur.

Consultez la [politique de confidentialité](https://fiip.fr/privacy) et les [conditions d'utilisation](https://fiip.fr/terms) pour les informations complètes.

## Développement

Prérequis : Node.js 22, Deno, Rust et les dépendances système de Tauri.

```bash
npm ci
deno task dev
```

Commandes de validation principales :

```bash
deno task lint
deno task test
deno task build
deno task security-check
```

Les configurations locales se basent sur `.env.example`. Les fichiers `.env` et les secrets de déploiement ne doivent jamais être versionnés.

## Architecture

- Desktop : React, Vite et Tauri
- Mobile : Expo et React Native
- Authentification : Clerk relié à Supabase Third-Party Auth
- Données : Postgres et Edge Functions Supabase
- Pièces jointes : Cloudflare R2
- Sauvegardes : Backblaze B2

Les détails de contribution sont dans [CONTRIBUTING.md](CONTRIBUTING.md).
