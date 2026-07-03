# Chrome Web Store - Fiip Web Clipper

Ce document contient les reponses a copier dans le Chrome Web Store Developer Dashboard pour eviter les blocages de publication.

## Objectif unique

Fiip Web Clipper permet a l'utilisateur de capturer la page web active ou sa selection de texte, puis de l'envoyer vers Fiip avec le titre, l'URL source, le contenu nettoye et les images web referencees.

## Confidentialite

L'extension traite le contenu de la page active uniquement lorsque l'utilisateur clique sur le bouton de capture. Le contenu capture peut inclure le titre de la page, l'URL source, le texte selectionne, le HTML nettoye de la page et les URLs d'images HTTP/HTTPS presentes dans la page. Ces donnees servent uniquement a creer une note Fiip.

Par defaut, l'extension tente d'ouvrir l'application locale Fiip avec un lien `fiip://clip`. Le fallback cloud Supabase n'est utilise que si l'utilisateur a configure une URL Supabase, une cle anonyme et un jeton d'acces dans le stockage de l'extension.

## Code distant

Fiip Web Clipper n'execute pas de code distant. Tous les scripts executes par l'extension sont empaquetes dans le fichier ZIP soumis au Chrome Web Store. L'extension peut effectuer une requete HTTPS vers l'API REST Supabase configuree par l'utilisateur pour creer une note lorsque l'ouverture locale de Fiip echoue, mais cette requete transporte des donnees et n'importe pas de JavaScript executable.

## Permissions

`activeTab`: necessaire pour acceder temporairement a l'onglet actif uniquement apres l'action explicite de l'utilisateur sur l'extension. Cette permission permet de lire le contenu a capturer sans demander un acces permanent a tous les sites.

`scripting`: necessaire pour injecter les scripts empaquetes `content-helpers.js` et `content.js` dans l'onglet actif au moment de la capture. L'injection se fait a la demande et uniquement pour collecter le contenu demande.

`storage`: necessaire pour conserver localement la configuration optionnelle du fallback cloud Supabase, par exemple l'URL Supabase, la cle anonyme et le jeton d'acces utilisateur.

## Permissions hote

Le manifeste ne declare pas de `host_permissions`. L'extension utilise `activeTab` et `scripting` pour acceder temporairement a la page active apres un clic utilisateur.

## Captures d'ecran a fournir

Uploader au moins une capture d'ecran dans l'onglet Store Listing. Captures recommandees:

- popup Fiip Web Clipper ouverte sur une page web;
- capture en mode "Page lisible";
- note creee dans Fiip avec le lien source.

Les captures doivent montrer l'interface reelle, sans donnee personnelle visible.
