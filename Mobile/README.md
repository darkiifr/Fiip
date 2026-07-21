# Fiip Mobile

Application mobile Fiip basée sur Expo SDK 56, React Native 0.85 et Clerk Expo.

## Prérequis

- Node.js 22.11 ou plus récent
- npm
- Android Studio pour Android
- Xcode et CocoaPods pour iOS

## Installation

```sh
npm install
```

## Configuration

Créer un fichier `.env` local à partir de `.env.example`.

Variables publiques attendues côté Expo :

- `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

Les secrets serveur Clerk, Supabase, R2 et B2 ne doivent jamais être ajoutés à l'application mobile.

## Développement

```sh
npm start
```

Android :

```sh
npm run android
```

iOS :

```sh
npm run ios
```

Les scripts Android et iOS utilisent `expo run:*`. L'entrée JavaScript passe par `registerRootComponent` et les hôtes natifs Android/iOS enregistrent le composant Expo `main`.

## Qualité

```sh
npm run lint
npm test -- --runInBand
```

Compilation Kotlin Android :

```sh
cd android
.\gradlew.bat :app:compileDebugKotlin
```

## Notes d'architecture

- `app.json` contient la configuration Expo source de vérité.
- Le nom affiché de l'application est `Fiip`.
- L'identifiant Android est `com.fiipmobile`.
- Le bundle identifier iOS est `com.fiipmobile`.
- `expo-secure-store` et `@clerk/expo` sont déclarés comme plugins Expo.
- Les noms internes `FiipMobile` du projet natif Xcode/Gradle peuvent rester tels quels ; ils ne changent pas le nom affiché par Expo.
