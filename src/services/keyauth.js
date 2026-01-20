
// Configuration KeyAuth - À REMPLACER PAR VOS INFORMATIONS
// Les informations sont chargées depuis les variables d'environnement (.env) pour la sécurité
const KA_CONFIG = {
    name: import.meta.env.VITE_KEYAUTH_NAME, // Nom de votre application
    ownerid: import.meta.env.VITE_KEYAUTH_OWNERID, // Owner ID
    secret: import.meta.env.VITE_KEYAUTH_SECRET, // Application Secret
    version: import.meta.env.VITE_KEYAUTH_VERSION, // Version de votre application
    apiUrl: import.meta.env.VITE_KEYAUTH_APIURL // URL de l'API
};

export const SUBSCRIPTION_LEVELS = {
    BASIC: 1,
    AI: 1.5,
    PRO: 2,
    DEV: 4
};

class KeyAuthService {
    constructor() {
        this.sessionid = null;
        this.isAuthenticated = false;
        this.userData = null;
        this.initialized = false;
        this.currentLevel = 0;
        
        // Trial State
        this.isTrialActive = false;
        this.trialExpiry = null;
    }

    /**
     * Initialise la connexion avec KeyAuth
     */
    async init() {
        // Restore trial first
        this._restoreTrial();

        if (this.initialized) return;

        try {
            const data = await this._request({
                type: 'init',
                name: KA_CONFIG.name,
                ownerid: KA_CONFIG.ownerid,
                ver: KA_CONFIG.version
            });

            if (data.success) {
                this.sessionid = data.sessionid;
                this.initialized = true;
                this._restoreSession();
            } else {
                console.error("KeyAuth Init Failed:", data.message);
                // En mode dev, pour ne pas bloquer si pas configuré
                if (KA_CONFIG.ownerid === "YOUR_OWNER_ID") {
                    console.warn("KeyAuth non configuré. Mode développement actif.");
                }
            }
        } catch (error) {
            console.error("KeyAuth Init Error:", error);
        }
    }

    /**
     * Login avec une clé de licence
     * @param {string} key 
     */
    async login(key) {
        if (!this.initialized) await this.init();

        // Si mode démo/dev sans config
        if (KA_CONFIG.ownerid === "YOUR_OWNER_ID") {
            this.isAuthenticated = true;
            this.userData = {
                username: "DevUser",
                subscriptions: [{ subscription: "developer", level: 4, expiry: "2099-01-01" }],
                subscription: "developer",
                expiry: "2099-01-01"
            };
            this.currentLevel = 4;
            this._saveSession(key);
            return { success: true, message: "Mode Dev: Connecté avec succès" };
        }

        try {
            const data = await this._request({
                type: 'license',
                key: key,
                sessionid: this.sessionid,
                name: KA_CONFIG.name,
                ownerid: KA_CONFIG.ownerid
            });

            if (data.success) {
                this.isAuthenticated = true;
                this.userData = data.info;
                this.currentLevel = this._calculateLevel(data.info);
                this._saveSession(key);
                return { success: true, message: data.message, info: data.info };
            } else {
                return { success: false, message: data.message };
            }
        } catch (error) {
            return { success: false, message: "Erreur de connexion serveur: " + error.message };
        }
    }

    _calculateLevel(info) {
        if (!info) return 0;
        let maxLevel = 0;
        
        // Debug
        console.log("Analyzing KeyAuth Info:", info);

        // Handle subscriptions array
        if (info.subscriptions && Array.isArray(info.subscriptions)) {
            for (const sub of info.subscriptions) {
                const lvl = parseFloat(sub.level);
                if (!isNaN(lvl) && lvl > maxLevel) maxLevel = lvl;
            }
        }
        
        // Fallback: check direct level property
        if (info.level !== undefined) {
             const lvl = parseFloat(info.level);
             if (!isNaN(lvl) && lvl > maxLevel) maxLevel = lvl;
        }

        this.currentLevel = maxLevel; // Force update instance property
        console.log("Calculated Level:", maxLevel);
        return maxLevel;
    }

    /**
     * Vérifie si l'utilisateur a un abonnement actif OU un essai valide
     */
    checkSubscription() {
        // Access granted if licensed OR in active trial
        return (this.isAuthenticated && this.currentLevel >= SUBSCRIPTION_LEVELS.BASIC) || this.isTrialActive;
    }

    /**
     * Vérifie si l'accès aux fonctionnalités AI est autorisé (Niveau 1.5+)
     * Trial ne donne pas accès à l'AI (Basic = 1)
     */
    hasAIAccess() {
        return this.isAuthenticated && this.currentLevel >= 1.5;
    }

    /**
     * Vérifie si l'accès aux fonctionnalités Pro est autorisé (Niveau 2+)
     * Trial ne donne pas accès Pro (Basic = 1)
     */
    hasProAccess() {
        return this.isAuthenticated && this.currentLevel >= 2;
    }

    getCurrentSubscriptionName() {
        if (this.isTrialActive) return "Essai Gratuit (15 jours)";
        
        if (!this.isAuthenticated || !this.userData) return null;
        
        // Default to the main subscription field
        let subName = this.userData.subscription || 'Inconnu';
        if (subName === 'default') subName = 'Standard'; // Cosmetic fix for unassigned keys

        if (this.userData.subscriptions && this.userData.subscriptions.length > 0) {
            const highest = this.userData.subscriptions.reduce((prev, current) => {
                const prevLvl = parseFloat(prev.level) || 0;
                const currLvl = parseFloat(current.level) || 0;
                return (prevLvl > currLvl) ? prev : current;
            });
            if (highest.subscription) subName = highest.subscription;
        }
        
        return subName;
    }

    // --- Trial Management ---

    canStartTrial() {
        // Can start trial only if never used
        const trialUsed = localStorage.getItem('fiip-trial-used') === 'true';
        return !this.isAuthenticated && !trialUsed;
    }

    startTrial() {
        if (!this.canStartTrial()) return false;

        const now = Date.now();
        const duration = 15 * 24 * 60 * 60 * 1000; // 15 days
        const expiry = now + duration;

        localStorage.setItem('fiip-trial-used', 'true');
        localStorage.setItem('fiip-trial-expiry', expiry.toString());

        this.isTrialActive = true;
        this.trialExpiry = new Date(expiry).toISOString().split('T')[0];
        
        // Trial mimics Basic level temporarily for checking logic, 
        // but currentLevel remains 0 to distinguish from real license if needed.
        // Actually, let's set currentLevel to 1 for easier logic, but remember it's trial.
        // Or keep logic in checkSubscription using OR. I kept OR.
        
        return true;
    }
    
    _restoreTrial() {
        const expiryStr = localStorage.getItem('fiip-trial-expiry');
        if (expiryStr) {
            const expiry = parseInt(expiryStr, 10);
            if (Date.now() < expiry) {
                this.isTrialActive = true;
                this.trialExpiry = new Date(expiry).toISOString().split('T')[0];
            } else {
                this.isTrialActive = false; // Expired
                this.trialExpiry = null;
            }
        }
    }

    logout() {
        this.isAuthenticated = false;
        this.userData = null;
        this.sessionid = null;
        this.currentLevel = 0;
        localStorage.removeItem('fiip-license-key');
    }

    async _request(params) {
        // Encodage des paramètres en URL encoded form data
        const formData = new URLSearchParams();
        for (const key in params) {
            formData.append(key, params[key]);
        }

        const response = await fetch(KA_CONFIG.apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: formData
        });

        if (!response.ok) {
            throw new Error(`HTTP Error: ${response.status}`);
        }

        const text = await response.text();
        
        try {
            return JSON.parse(text);
        } catch (e) {
            if (text.trim().startsWith('<')) {
                console.error("KeyAuth HTML Error:", text);
                throw new Error("Erreur serveur inattendue (HTML retourné). Vérifiez l'URL ou la configuration.");
            }
            throw new Error("Réponse serveur invalide (JSON malformé).");
        }
    }

    async _restoreSession() {
        const savedKey = localStorage.getItem('fiip-license-key');
        if (savedKey) {
            await this.login(savedKey);
        }
    }

    _saveSession(key) {
        localStorage.setItem('fiip-license-key', key);
    }
}

export const keyAuthService = new KeyAuthService();
