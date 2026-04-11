import { keyAuthService } from './keyauth';

const DEFAULT_OPENROUTER_KEY = import.meta.env.VITE_OPENROUTER_KEY || '';
const DEFAULT_OPENROUTER_MODEL = 'openai/gpt-oss-20b:free';

export const generateText = async ({ apiKey, model, messages, signal, jsonMode }) => {
    // Vérification de la licence (Abonnement requis pour l'IA)
    if (!keyAuthService.hasAIAccess()) {
        throw new Error("Cette fonctionnalité nécessite un abonnement actif. Veuillez activer votre licence.");
    }

    const finalKey = apiKey && apiKey.trim() ? apiKey : DEFAULT_OPENROUTER_KEY;

    const finalModel = model || DEFAULT_OPENROUTER_MODEL;

    if (!finalKey && finalModel !== DEFAULT_OPENROUTER_MODEL) {
        throw new Error("Modèle payant sélectionné sans clé API. Configurez votre clé API ou choisissez un modèle gratuit.");
    }

    const maxRetries = 3;
    let attempt = 0;

    while (attempt < maxRetries) {
        try {
            const body = {
                model: finalModel,
                messages: messages,
                temperature: 0.7,
            };

            if (jsonMode) {
                body.response_format = { type: "json_object" };
            }

            const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${finalKey}`,
                    "Content-Type": "application/json",
                    // "HTTP-Referer": "https://fiip-notes.app", // Optional
                    // "X-Title": "Fiip Notes" // Optional
                },
                body: JSON.stringify(body),
                signal: signal
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                
                // Retry on 503 (Service Unavailable) or 429 (Rate Limit)
                if ((response.status === 503 || response.status === 429) && attempt < maxRetries - 1) {
                    console.warn(`API Error ${response.status}. Retrying... (${attempt + 1}/${maxRetries})`);
                    attempt++;
                    await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1))); // Exponential backoff
                    continue;
                }

                throw new Error(`Erreur API (${response.status}): ${errorData.error?.message || response.statusText}`);
            }

            const data = await response.json();
            return data.choices[0]?.message?.content || "";
        } catch (error) {
            if (error.name === 'AbortError') {
                console.log('Generation aborted');
                throw error;
            }
            
            // If it's the last attempt or not a retryable error, throw it
            if (attempt === maxRetries - 1) {
                console.error("AI Generation Error:", error);
                throw error;
            }
            
            // If it was a network error (fetch failed), retry
            console.warn(`Network Error. Retrying... (${attempt + 1}/${maxRetries})`, error);
            attempt++;
            await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
        }
    }
};
