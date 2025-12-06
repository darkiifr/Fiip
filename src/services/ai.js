export const generateText = async ({ apiKey, model, prompt, context = "" }) => {
    if (!apiKey) {
        throw new Error("Clé API manquante. Veuillez la configurer dans les paramètres.");
    }

    const messages = [
        {
            role: "system",
            content: `Tu es un assistant d'écriture intelligent intégré à une application de prise de notes. 
      Ton but est d'aider l'utilisateur à rédiger, corriger, compléter ou restructurer ses notes.
      Tu as la permission de modifier, supprimer ou réécrire le texte existant pour l'améliorer.
      Adopte un ton légèrement humoristique, spirituel et décontracté. Tu comprends et utilises les expressions idiomatiques avec aisance.
      Reste concis et évite les longueurs inutiles. Ne génère pas de contenu excessivement long sauf si explicitement demandé.
      N'hésite pas à inclure des liens pertinents (URL complètes commençant par http) vers des sources ou des références si le sujet s'y prête.
      IMPORTANT : Ne génère JAMAIS de tableaux Markdown, de séparateurs visuels (comme "|---|", ":---"), ni de titres Markdown (comme "### Titre"). Utilise uniquement des paragraphes simples et des listes à puces.
      Réponds directement avec le contenu final de la note, sans blabla inutile (pas de "Voici la note modifiée", etc.).
      Le contexte actuel de la note est : "${context}"`
        },
        {
            role: "user",
            content: prompt
        }
    ];

    try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json",
                // "HTTP-Referer": "https://fiip-notes.app", // Optional
                // "X-Title": "Fiip Notes" // Optional
            },
            body: JSON.stringify({
                model: model || "openai/gpt-4o-mini",
                messages: messages,
                temperature: 0.7,
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`Erreur API (${response.status}): ${errorData.error?.message || response.statusText}`);
        }

        const data = await response.json();
        return data.choices[0]?.message?.content || "";
    } catch (error) {
        console.error("AI Generation Error:", error);
        throw error;
    }
};
