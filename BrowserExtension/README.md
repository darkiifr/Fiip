# Fiip Web Clipper

Extension Manifest V3 publiée officiellement sur le Chrome Web Store, et compatible Microsoft Edge en installation manuelle. Elle capture la page active ou la sélection, tente d'ouvrir Fiip via `fiip://clip`, puis utilise le fallback Supabase si l'utilisateur a configuré les identifiants nécessaires dans le stockage de l'extension.

## Fichiers importants

- `manifest.json`: manifeste MV3, permissions minimales, icônes, popup et background worker.
- `content-helpers.js`: collecte et nettoyage HTML côté page.
- `content.js`: écoute `FIIP_COLLECT_CLIP` et renvoie le payload de capture.
- `background-helpers.js`: deep link Fiip, fallback Supabase, validation URL source.
- `background.js`: service worker Chromium compatible Chrome et Edge.
- `popup.html`, `popup.css`, `popup.js`: UI Liquid Glass alignée avec Fiip.
- `icons/`: icônes Store et barre d'outils.

## Tests

Depuis la racine du repo:

```bash
npm run test:extensions
```

Ce script couvre:

- extraction et nettoyage HTML du content script;
- échappement du texte sélectionné;
- filtrage des images HTTP/HTTPS;
- deep link `fiip://clip`;
- fallback Supabase et rejet des URLs source non HTTP;
- cohérence du `manifest.json` et absence de permissions hôtes globales;
- exclusion des tests et README des ZIP Store.

## Packaging

Depuis la racine du repo:

```bash
npm run package:extensions
```

Les artefacts sont générés dans `dist/extensions/`:

- `Fiip-Web-Clipper-Chrome.zip`
- `Fiip-Web-Clipper-Edge.zip` pour installation manuelle Edge.

Le job GitHub Actions `browser-extensions` exécute `npm run test:extensions`, puis publie ces deux ZIP comme assets de release. Seul le ZIP Chrome est destiné au Chrome Web Store.

## Installation utilisateur

### Google Chrome

Méthode recommandée:

1. Ouvrir la page Fiip sur le Chrome Web Store.
2. Cliquer sur `Ajouter à Chrome`.
3. Confirmer l'installation.
4. Épingler Fiip Web Clipper dans la barre d'outils Chrome.
5. Ouvrir une page web, cliquer sur l'icône Fiip, puis choisir la capture.

Si le lien Chrome Web Store n'est pas encore disponible, utiliser temporairement l'installation manuelle:

1. Télécharger `Fiip-Web-Clipper-Chrome.zip` depuis la release GitHub.
2. Décompresser le fichier ZIP.
3. Ouvrir `chrome://extensions`.
4. Activer `Mode développeur`.
5. Cliquer sur `Charger l'extension non empaquetée`.
6. Sélectionner le dossier décompressé contenant `manifest.json`.

### Microsoft Edge

Fiip Web Clipper n'est pas publié sur Microsoft Edge Add-ons. L'installation Edge se fait manuellement:

1. Télécharger `Fiip-Web-Clipper-Edge.zip` depuis la release GitHub.
2. Décompresser le fichier ZIP dans un dossier que vous garderez en place.
3. Ouvrir `edge://extensions`.
4. Activer `Mode développeur`.
5. Cliquer sur `Charger l'extension décompressée`.
6. Sélectionner le dossier décompressé contenant `manifest.json`.
7. Épingler Fiip Web Clipper dans la barre d'outils Edge.

Pour mettre à jour l'extension Edge manuelle, remplacer le dossier décompressé par la nouvelle version, puis cliquer sur `Actualiser` dans `edge://extensions`.

## Configuration des liens Store

Une fois l'extension publiée sur le Chrome Web Store, renseigner cette variable:

- `VITE_CHROME_EXTENSION_URL`: lien Chrome Web Store public.

Dans GitHub Actions, utiliser cette repository variable:

- `VITE_CHROME_EXTENSION_URL`

En local, copier `.env.example` vers `.env` et remplir la même variable.

Les variables Expo/mobile ne sont pas nécessaires pour l'instant: l'application mobile ne publie pas et n'installe pas d'extension Chrome ou Edge. Il faudra les réintroduire uniquement si un écran mobile affiche explicitement des liens vers les stores d'extensions.

## Publication Chrome Web Store

Documentation officielle: https://developer.chrome.com/docs/webstore/publish

1. Créer ou ouvrir le compte développeur Chrome Web Store.
2. Lancer `npm run test:extensions`.
3. Lancer `npm run package:extensions`.
4. Aller sur https://chrome.google.com/webstore/devconsole/.
5. Cliquer sur `Add new item`.
6. Uploader `dist/extensions/Fiip-Web-Clipper-Chrome.zip`.
7. Remplir la fiche:
   - name: `Fiip Web Clipper`;
   - category: `Productivity`;
   - language principale: français ou anglais selon la fiche Store;
   - description courte: capture rapide de pages, sélections et sources vers Fiip;
   - description longue: préciser deep link local, fallback Supabase optionnel et permissions;
   - icône: `BrowserExtension/icons/icon128.png`;
   - captures d'écran: popup ouverte, capture page, note créée dans Fiip.
8. Onglet privacy practices:
   - déclarer que le contenu de page peut être traité pour créer une note;
   - préciser que l'envoi cloud ne se fait que si le fallback Supabase est configuré;
   - fournir l'URL de politique de confidentialité Fiip.
   - utiliser les réponses prêtes à copier dans `docs/CHROME_WEB_STORE_FIIP_CLIPPER.md`.
9. Justifier les permissions:
   - `activeTab`: lire uniquement l'onglet actif au moment de la capture;
   - `scripting`: injecter à la demande les scripts de capture empaquetés;
   - `storage`: stocker la configuration fallback;
   - aucune permission hôte globale n'est demandée dans le manifeste.
10. Soumettre en review.
11. Après publication, copier l'URL publique dans `VITE_CHROME_EXTENSION_URL`.

## Installation manuelle sur Microsoft Edge

Fiip ne publie pas l'extension sur Microsoft Edge Add-ons pour l'instant. Les utilisateurs Edge peuvent l'installer manuellement depuis le ZIP de release.

1. Télécharger `Fiip-Web-Clipper-Edge.zip` depuis la release GitHub.
2. Décompresser le ZIP dans un dossier stable, par exemple `Documents/Fiip Web Clipper`.
3. Ouvrir Edge puis aller sur `edge://extensions`.
4. Activer `Mode développeur`.
5. Cliquer sur `Charger l'extension décompressée`.
6. Sélectionner le dossier décompressé qui contient `manifest.json`.
7. Épingler Fiip Web Clipper dans la barre d'outils Edge.
8. Lors d'une mise à jour, télécharger le nouveau ZIP, remplacer le dossier décompressé, puis cliquer sur `Actualiser` dans `edge://extensions`.

## Checklist avant soumission

- `npm run test:extensions` passe.
- `npm run package:extensions` produit le ZIP Chrome Store et le ZIP Edge manuel.
- Les ZIP contiennent `manifest.json` à la racine.
- Les ZIP ne contiennent pas `*.test.js` ni `README.md`.
- Les icônes `16`, `32`, `48`, `128` existent.
- La politique de confidentialité est publique.
- Les captures Store montrent l'UI réelle de l'extension.
