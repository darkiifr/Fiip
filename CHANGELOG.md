# Fiip v9.0.4

## Authentification

- Fiabilise les flux d'authentification Supabase sur desktop, portail et mobile.
- Supprime le challenge anti-bot client des flux email/password afin de s'aligner sur la configuration Auth sans verification externe.
- Ajoute Google OAuth sur les trois surfaces avec callbacks valides, rejet des schemas inattendus et protection contre les doubles traitements.
- Conserve le relais desktop `https://portail.fiip.fr/auth/callback` vers `fiip://login-callback`.
- Ajoute la gestion mobile du callback `fiip://login-callback` pour les liens entrants a froid et a chaud.

## Portail et configuration

- Securise la page relais du portail en conservant query/hash et en proposant un bouton manuel si l'ouverture automatique echoue.
- Nettoie la configuration publique pour ne garder que les variables reellement consommees par les clients.

## Validation

- Tests desktop auth, build Vite, lint et audit npm valides.
- Tests portail, build portail et audit npm valides.
- Tests mobile auth, audit npm mobile, `cargo check` et `cargo test` valides.
- `cargo audit` termine avec les avertissements upstream deja presents.
