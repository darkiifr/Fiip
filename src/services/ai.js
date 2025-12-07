export const generateText = async ({ apiKey, model, messages, signal }) => {
    if (!apiKey) {
        throw new Error("Clé API manquante. Veuillez la configurer dans les paramètres.");
    }

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
            }),
            signal: signal
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`Erreur API (${response.status}): ${errorData.error?.message || response.statusText}`);
        }

        const data = await response.json();
        return data.choices[0]?.message?.content || "";
    } catch (error) {
        if (error.name === 'AbortError') {
            console.log('Generation aborted');
            throw error;
        }
        console.error("AI Generation Error:", error);
        throw error;
    }
};
