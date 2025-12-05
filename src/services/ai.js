export const generateText = async ({ apiKey, model, prompt, context = "" }) => {
    if (!apiKey) {
        throw new Error("Clé API manquante. Veuillez la configurer dans les paramètres.");
    }

    const messages = [
        {
            role: "system",
            content: `Tu es un assistant d'écriture intelligent intégré à une application de prise de notes. 
      Ton but est d'aider l'utilisateur à rédiger, corriger ou compléter ses notes.
      Réponds directement avec le texte demandé, sans blabla inutile (pas de "Voici le texte", etc.).
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
