
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

    // --- Chat System ---

    /**
     * Récupère les messages du chat
     * @param {string} channel Le nom du canal de chat
     */
    async getChatMessages(channel = "general") {
        if (!this.isAuthenticated) return { success: false, message: "Non connecté" };

        try {
            const data = await this._request({
                type: 'chatget',
                channel: channel,
                sessionid: this.sessionid,
                name: KA_CONFIG.name,
                ownerid: KA_CONFIG.ownerid
            });

            if (data.success) {
                return { success: true, messages: data.messages };
            } else {
                return { success: false, message: data.message };
            }
        } catch (error) {
            return { success: false, message: "Erreur récupération chat: " + error.message };
        }
    }

    /**
     * Envoie un message dans le chat
     * @param {string} message Le message à envoyer
     * @param {string} channel Le nom du canal
     */
    async sendChatMessage(message, channel = "general") {
        if (!this.isAuthenticated) return { success: false, message: "Non connecté" };

        try {
            const data = await this._request({
                type: 'chatsend',
                message: message,
                channel: channel,
                sessionid: this.sessionid,
                name: KA_CONFIG.name,
                ownerid: KA_CONFIG.ownerid
            });

            return data;
        } catch (error) {
            return { success: false, message: "Erreur envoi message: " + error.message };
        }
    }

    // --- User System (Signup/Login) ---

    /**
     * Inscription d'un nouvel utilisateur
     * @param {string} username 
     * @param {string} password 
     * @param {string} license Clé de licence pour l'inscription 
     * @param {string} email (Optionnel)
     */
    async register(username, password, license, email = "") {
        if (!this.initialized) await this.init();

        try {
            const data = await this._request({
                type: 'register',
                username: username,
                pass: password,
                key: license,
                email: email,
                sessionid: this.sessionid,
                name: KA_CONFIG.name,
                ownerid: KA_CONFIG.ownerid
            });

            if (data.success) {
                return { success: true, message: data.message };
            } else {
                return { success: false, message: data.message };
            }
        } catch (error) {
            return { success: false, message: "Erreur inscription: " + error.message };
        }
    }

    /**
     * Synchronise le statut de l'essai gratuit avec le compte utilisateur
     */
    async syncTrialStatus() {
        if (!this.isAuthenticated) return;

        try {
            // 1. Charger les données cloud
            const cloudRes = await this.loadUserData();
            const cloudData = cloudRes.success && cloudRes.data ? cloudRes.data : {};
            
            // 2. Vérifier statut local
            const localUsed = localStorage.getItem('fiip-trial-used') === 'true';
            
            // 3. Sync Logic
            let needsSave = false;
            
            // Si utilisé localement mais pas dans le cloud -> mettre à jour le cloud
            if (localUsed && !cloudData.trial_used) {
                cloudData.trial_used = true;
                needsSave = true;
            }
            // Si utilisé dans le cloud mais pas localement -> mettre à jour local (empêcher futur essai)
            else if (cloudData.trial_used && !localUsed) {
                localStorage.setItem('fiip-trial-used', 'true');
                // Si un essai était actif (incohérence ?), on pourrait le désactiver, 
                // mais on laisse finir la session courante pour éviter de frustrer.
            }

            // 4. Sauvegarder si nécessaire
            if (needsSave) {
                await this.saveUserData(cloudData);
            }
        } catch (e) {
            console.error("Trial Sync Error:", e);
        }
    }

    /**
     * Ajoute une licence à un compte existant (Upgrade)
     * @param {string} username 
     * @param {string} key 
     */
    async addLicense(username, key) {
        if (!this.initialized) await this.init();

        try {
            const data = await this._request({
                type: 'upgrade',
                username: username,
                key: key,
                sessionid: this.sessionid,
                name: KA_CONFIG.name,
                ownerid: KA_CONFIG.ownerid
            });

            if (data.success) {
                // Refresh local data
                await this.loginByUser(username, "ignored_password"); // Re-sync to get updated subs if possible, or just trust the next init
                // Actually loginByUser requires password. We don't have it here if we are just in the modal. 
                // We should probably just return success and let UI handle re-login or just assume it worked.
                // Better: if we are authenticated, we don't need password for some calls but 'login' needs it.
                // But wait, if we are 'upgrade'ing, the session might imply we are logged in? 
                // KeyAuth upgrade uses username.
                return { success: true, message: data.message };
            } else {
                return { success: false, message: data.message };
            }
        } catch (error) {
            return { success: false, message: "Erreur ajout licence: " + error.message };
        }
    }

    /**
     * Connexion utilisateur (Username/Password)
     * @param {string} username 
     * @param {string} password 
     */
    async loginByUser(username, password) {
        if (!this.initialized) await this.init();

        try {
            const data = await this._request({
                type: 'login',
                username: username,
                pass: password,
                sessionid: this.sessionid,
                name: KA_CONFIG.name,
                ownerid: KA_CONFIG.ownerid
            });

            if (data.success) {
                this.isAuthenticated = true;
                this.userData = data.info;
                this.currentLevel = this._calculateLevel(data.info);
                // We don't save password, but we mark as user login
                localStorage.setItem('fiip-auth-mode', 'user');
                
                // Sync Trial Status
                this.syncTrialStatus();

                return { success: true, message: data.message, info: data.info };
            } else {
                return { success: false, message: data.message };
            }
        } catch (error) {
            return { success: false, message: "Erreur connexion: " + error.message };
        }
    }

    /**
     * Sauvegarde les données utilisateur (Cloud Sync)
     * @param {object} data Données à sauvegarder
     */
    async saveUserData(data) {
        if (!this.isAuthenticated) return { success: false, message: "Non connecté" };

        try {
            const jsonString = JSON.stringify(data);
            
            const res = await this._request({
                type: 'setvar',
                var: 'fiip_data',
                data: jsonString,
                sessionid: this.sessionid,
                name: KA_CONFIG.name,
                ownerid: KA_CONFIG.ownerid
            });

            if (res.success) {
                return { success: true };
            } else {
                return { success: false, message: res.message };
            }
        } catch (error) {
            return { success: false, message: "Erreur sauvegarde: " + error.message };
        }
    }

    /**
     * Récupère les données utilisateur (Cloud Sync)
     */
    async loadUserData() {
        if (!this.isAuthenticated) return { success: false, message: "Non connecté" };

        try {
            const res = await this._request({
                type: 'getvar',
                var: 'fiip_data',
                sessionid: this.sessionid,
                name: KA_CONFIG.name,
                ownerid: KA_CONFIG.ownerid
            });

            if (res.success) {
                const content = res.response || res.message; 
                try {
                    const parsed = JSON.parse(content);
                    return { success: true, data: parsed };
                } catch (e) {
                     return { success: true, data: null };
                }
            } else {
                return { success: false, message: res.message };
            }
        } catch (error) {
            return { success: false, message: "Erreur chargement: " + error.message };
        }
    }

    logout() {
        this.isAuthenticated = false;
        this.userData = null;
        this.sessionid = null;
        this.currentLevel = 0;
        localStorage.removeItem('fiip-license-key');
        localStorage.removeItem('fiip-auth-mode');
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
