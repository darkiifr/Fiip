# Portail compte, appareils et securite

## Objectif

Remplacer le portail compte actuel par une surface operationnelle qui affiche une licence et ses limitations reelles, suit les installations connectees, permet de les revoquer et expose un historique de securite compréhensible.

## Donnees et securite

- Creer `account_devices` : un identifiant d'installation aleatoire, l'utilisateur, la licence active, plateforme, nom affichable, version, dates de creation et derniere activite, et date de revocation.
- Creer `account_security_events` : utilisateur, appareil facultatif, type d'evenement, date et metadonnees reduites. Ne jamais stocker ni afficher un HWID, un jeton, une cle de licence ou une adresse IP complete.
- Les appareils sont declares par des applications authentifiees. Le portail ne peut ni choisir l'utilisateur ni la licence envoyes : la fonction derive ces valeurs du JWT et de la licence active du profil.
- Les limites d'appareils sont appliquees par le backend avant insertion. Les appareils revoques ne peuvent plus emettre de heartbeat ou acceder aux operations synchronisees protegees.
- Les actions de revocation valident la propriete, utilisent des identifiants UUID, produisent un evenement de securite et n'exposent pas les erreurs internes.

## API

La fonction `account-api` ajoute les actions authentifiees suivantes :

- `list_devices` et `list_security_events` pour le portail;
- `register_device` et `heartbeat_device` pour desktop et mobile;
- `revoke_device` pour une installation precise;
- `revoke_all_devices` pour cloturer toutes les installations sauf, optionnellement, l'appareil courant.

La reponse `summary` inclut les donnees deja chargees pour l'aperçu. Les sections detaillees sont chargees a l'ouverture puis conservees en cache de session pour eviter un rechargement complet entre sections.

## Portail

Le portail devient un espace dense et operationnel : navigation laterale compacte sur bureau, en-tete de compte et statut de licence, et contenu par section.

- L'aperçu indique `OCR limite` et `Aucune licence active` lorsqu'aucune licence active n'est presente. Il ne montre jamais `Illimite` par defaut.
- La section Appareils liste le nom, la plateforme, la version, la derniere activite et l'etat. L'appareil courant est identifiable. Chaque ligne offre une revocation avec confirmation.
- La section Securite liste les evenements utiles, permet la revocation globale et explique l'effet des actions sensibles.
- Les sections se chargent a la demande avec etats de chargement, vide et erreur explicites.
- Le style est sombre, structure, lisible et responsive; les indicateurs et actions de securite restent fonctionnels au clavier.

## Validation

- Tests unitaires pour la normalisation des limitations de licence, les actions client et les etats d'affichage sans licence.
- Tests de la fonction Edge pour authentification, propriete, limite d'appareils et revocation.
- Lint, tests, build et audit du site public; verification des migrations SQL et des politiques RLS.
