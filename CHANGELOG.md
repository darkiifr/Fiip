# Changelog

## [3.0.1] - 2025-12-16

### 🤖 Dexter (AI Assistant)
- **Stabilité accrue** : Implémentation d'un système de "Retry" automatique pour gérer les erreurs API (503 Service Unavailable, 429 Rate Limit).
- **Intelligence améliorée** : Correction des "hallucinations" où Dexter inventait des actions ou échouait à répondre en JSON valide.
- **Expérience Utilisateur** : Ajout d'un message d'erreur explicite dans le chat si la clé API est manquante, au lieu d'ignorer l'action de l'utilisateur.

### ✨ Éditeur & Outils IA
- **Outil "Étoile" (Amélioration)** : 
  - Correction d'un bug où l'IA ignorait le contenu existant de la note.
  - Suppression stricte des phrases de conversation (ex: "Voici le texte amélioré...") pour ne fournir que le résultat utile.
  - Interdiction formelle à l'IA d'utiliser des blocs de code Markdown pour le texte simple.

### 🐛 Correctifs Techniques
- Amélioration du parsing des réponses JSON de l'IA.
- Nettoyage automatique des artefacts Markdown dans les réponses d'actions.
