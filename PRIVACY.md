# Privacy Policy

**Last Updated:** 2026-07-20

## Introduction

Fiip respecte la vie privee de ses utilisateurs. Cette politique explique quelles donnees sont traitees, pourquoi elles le sont, et quelles limites techniques existent dans une architecture zero-knowledge.

## Donnees et chiffrement

- Les notes privees, pieces jointes, resultats OCR synchronises et parametres synchronises sont chiffres cote client avant envoi reseau avec une cle derivee d'une passphrase Fiip.
- Fiip ne stocke pas cette passphrase en clair et ne peut pas dechiffrer le contenu prive depuis Supabase, Cloudflare R2, Backblaze B2 ou le dashboard admin.
- Les notes publiees par lien public sont une exception explicite: Fiip cree un snapshot public separe, dechiffrable par le serveur pour l'affichage public et la moderation.
- Les metadonnees techniques necessaires au service peuvent inclure identifiant utilisateur, plan, taille de blobs chiffres, statut d'upload, appareils connectes, journaux d'audit et etats de feature flags.

## Sous-traitants

- Supabase: authentification compatible Third-Party Auth, base Postgres, Edge Functions et RLS.
- Clerk: gestion d'identite et emission de JWT pour les clients Fiip.
- Cloudflare R2: stockage unique des pieces jointes utilisateur chiffrees.
- Backblaze B2: stockage froid des backups Postgres compresses et chiffres uniquement.
- OpenRouter: appels IA via `ai-proxy` lorsque l'utilisateur active une fonctionnalite IA.
- Prestataires de paiement/licence configures par Fiip, notamment SellAuth/KeyAuth selon le flux d'achat actif.

Certains sous-traitants peuvent traiter des donnees hors Union europeenne. Lorsque requis, Fiip s'appuie sur les clauses contractuelles types ou mecanismes contractuels equivalents fournis par ces prestataires.

## Conservation

- Contenu prive chiffre: conserve tant que le compte ou la synchronisation associee existe.
- Snapshots publics: conserves tant que le lien public reste actif, puis revoques ou supprimes.
- Pieces jointes R2 chiffrees: conservees tant qu'elles sont rattachees au compte ou a une note non supprimee.
- Backups B2: retention reduite, avec 3 quotidiens glissants, 1 hebdomadaire et 1 mensuel.
- Logs d'audit admin: conserves pour tracer les actions sensibles et destructives.
- Donnees de compte/licence: conservees pendant la duree necessaire a la fourniture du service, aux obligations legales et au support.

## Droits utilisateur

Vous pouvez demander l'acces, la rectification, l'effacement, la portabilite ou l'opposition au traitement de vos donnees. L'effacement d'un compte declenche la suppression des donnees actives et une purge progressive des backups selon la politique de retention. Pour exercer vos droits, contactez le support Fiip depuis le portail compte ou le canal officiel de support.

## Dashboard admin

Le dashboard admin peut gerer feature flags, statut systeme, backups, utilisateurs, plans et moderation des notes publiques. Il ne doit pas pouvoir dechiffrer le contenu prive zero-knowledge. Toute action sensible ou destructive doit demander confirmation et etre journalisee dans `audit_log`.

## Changements

Cette politique peut etre mise a jour lorsque l'architecture ou les sous-traitants changent. La date ci-dessus indique la derniere mise a jour.
