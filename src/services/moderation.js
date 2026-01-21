
// Liste de domaines autorisés (Whitelist) - Optionnel, pour un mode strict
const ALLOWED_DOMAINS = [
    'youtube.com',
    'youtu.be',
    'github.com',
    'stackoverflow.com',
    'google.com',
    'wikipedia.org'
];

// Liste de mots-clés ou regex pour la propagande et contenus dangereux
// Ceci est une liste basique et doit être enrichie.
const BLOCKED_TERMS = [
    /isis/i,
    /daesh/i,
    /al-qaida/i,
    /boko haram/i,
    /jihad/i, // Contextuel, mais souvent bloqué dans ces filtres simples
    /terror/i,
    /bomb/i,
    /kill all/i,
    /death to/i,
    /white power/i,
    /supremacy/i
];

// Regex pour détecter les URLs
const URL_REGEX = /(https?:\/\/[^\s]+)/g;

export const moderationService = {
    /**
     * Analyse un message pour déterminer s'il est sûr.
     * @param {string} message Le message à analyser.
     * @returns {object} { safe: boolean, reason: string|null, sanitized: string }
     */
    analyzeMessage: (message) => {
        if (!message) return { safe: true, reason: null, sanitized: "" };

        // 1. Check Keywords (Propaganda/Terrorism)
        for (const term of BLOCKED_TERMS) {
            if (term.test(message)) {
                return { 
                    safe: false, 
                    reason: "Contenu inapproprié détecté (Mots-clés interdits).", 
                    sanitized: "***" 
                };
            }
        }

        // 2. Check Links
        const matches = message.match(URL_REGEX);
        if (matches) {
            for (const url of matches) {
                try {
                    const urlObj = new URL(url);
                    // Vérification basique des TLDs suspects ou IPs directes
                    if (isSuspiciousLink(urlObj)) {
                        return {
                            safe: false,
                            reason: "Lien suspect ou non autorisé détecté.",
                            sanitized: message.replace(url, "[LIEN SUPPRIMÉ]")
                        };
                    }
                } catch (e) {
                    // URL malformée, on laisse passer ou on bloque selon la politique. 
                    // Ici on bloque si ça ressemble à une URL mais que c'est invalide.
                    return {
                        safe: false,
                        reason: "Lien malformé détecté.",
                        sanitized: message.replace(url, "[LIEN INVALIDE]")
                    };
                }
            }
        }

        return { safe: true, reason: null, sanitized: message };
    },

    /**
     * Nettoie le message pour l'affichage (échappement XSS basique si besoin, 
     * bien que React gère ça par défaut)
     */
    sanitize: (message) => {
        // React protège déjà du XSS, mais on peut vouloir masquer des parties ici
        return message; 
    }
};

/**
 * Vérifie si une URL est suspecte
 * @param {URL} urlObj 
 */
function isSuspiciousLink(urlObj) {
    const hostname = urlObj.hostname;

    // Bloquer les adresses IP directes
    if (/^(\d{1,3}\.){3}\d{1,3}$/.test(hostname)) {
        return true;
    }

    // Bloquer les TLDs souvent associés au spam/malware
    const suspiciousTLDs = ['.xyz', '.top', '.club', '.win', '.gq', '.cn', '.ru'];
    if (suspiciousTLDs.some(tld => hostname.endsWith(tld))) {
        return true;
    }

    // Si on voulait être très strict, on vérifierait la whitelist
    // if (!ALLOWED_DOMAINS.some(domain => hostname.endsWith(domain))) {
    //    return true;
    // }

    return false;
}
