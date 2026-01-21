
// Configuration KeyAuth - À REMPLACER PAR VOS INFORMATIONS
// Les informations sont chargées depuis les variables d'environnement (.env) pour la sécurité
import { invoke } from '@tauri-apps/api/core';

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

export const STORAGE_LIMITS = {
    BASIC: 15 * 1024 * 1024 * 1024, // 15 GB
    PRO: 50 * 1024 * 1024 * 1024,   // 50 GB
    DEV: 500 * 1024 * 1024 * 1024   // 500 GB
};

class KeyAuthService {
    constructor() {
        this.sessionid = null;
        this.isAuthenticated = false;
        this.userData = null;
        this.currentPassword = null; // Store password in memory for re-auth
        this.initialized = false;
        this.currentLevel = 0;
        this.hwid = null;
        
        // Trial State
        this.isTrialActive = false;
        this.trialExpiry = null;
    }

    async _fetchHWID() {
        if (this.hwid) return;
        try {
            this.hwid = await invoke('get_hwid');
            console.log("HWID:", this.hwid);
        } catch (e) {
            console.error("Failed to get HWID:", e);
            this.hwid = "UNKNOWN";
        }
    }

    /**
     * Initialise la connexion avec KeyAuth
     */
    async init() {
        // Restore trial first
        this._restoreTrial();

        // Fetch HWID
        await this._fetchHWID(); // Ensure HWID is available

        if (this.initialized && this.sessionid) return { success: true };
        
        if (this.initPromise) return this.initPromise;

        this.initPromise = (async () => {
            // Reset flag since we are attempting to init
            this.initialized = false;

            try {
                const data = await this._request({
                    type: 'init',
                    name: KA_CONFIG.name,
                    ownerid: KA_CONFIG.ownerid,
                    ver: KA_CONFIG.version,
                    hash: "null"
                });

                if (data.success) {
                    this.sessionid = data.sessionid;
                    this.initialized = true;
                    await this._restoreSession();
                    return { success: true, message: data.message };
                } else {
                    console.error("KeyAuth Init Failed:", data.message);
                    // En mode dev, pour ne pas bloquer si pas configuré
                    if (KA_CONFIG.ownerid === "YOUR_OWNER_ID") {
                        console.warn("KeyAuth non configuré. Mode développement actif.");
                    }
                    return { success: false, message: data.message };
                }
            } catch (error) {
                console.error("KeyAuth Init Error:", error);
                return { success: false, message: error.message };
            } finally {
                this.initPromise = null;
            }
        })();

        return this.initPromise;
    }

    /**
     * Connexion avec nom d'utilisateur et mot de passe
     * @param {string} username 
     * @param {string} password 
     */
    async loginByUser(username, password) {
        let initError = null;
        if (!this.initialized || !this.sessionid) {
            const initRes = await this.init();
            if (!initRes.success) initError = initRes.message;
        }
        
        // Check again if init succeeded
        if (!this.sessionid) {
            return { success: false, message: initError || "Erreur d'initialisation: Impossible de contacter le serveur d'authentification." };
        }

        try {
            const data = await this._request({
                type: 'login',
                username: username,
                pass: password,
                hwid: this.hwid,
                sessionid: this.sessionid,
                name: KA_CONFIG.name,
                ownerid: KA_CONFIG.ownerid
            });

            if (data.success) {
                this.isAuthenticated = true;
                this.userData = this._processUserData(data.info);
                this.currentPassword = password; // Remember password
                this.currentLevel = this._calculateLevel(this.userData);
                
                // Disable trial visual overrides if we are logged in with a real account
                this.isTrialActive = false;
                
                // Save credentials for auto-login
                this._saveUserCredentials(username, password);

                // Sync Trial
                this.syncTrialStatus();

                return { success: true, message: data.message, info: data.info };
            } else {
                return { success: false, message: data.message };
            }
        } catch (error) {
            return { success: false, message: "Erreur de connexion serveur: " + error.message };
        }
    }

    /**
     * Login avec une clé de licence
     * @param {string} key 
     */
    async login(key) {
        let initError = null;
        if (!this.initialized || !this.sessionid) {
            const initRes = await this.init();
            if (!initRes.success) initError = initRes.message;
        }

        // Check again if init succeeded
        if (!this.sessionid) {
            return { success: false, message: initError || "Erreur d'initialisation: Impossible de contacter le serveur d'authentification." };
        }

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
                hwid: this.hwid,
                sessionid: this.sessionid,
                name: KA_CONFIG.name,
                ownerid: KA_CONFIG.ownerid
            });

            if (data.success) {
                this.isAuthenticated = true;
                this.userData = this._processUserData(data.info);
                this.currentLevel = this._calculateLevel(this.userData);
                this._saveSession(key);
                
                // Clear user credentials if switching to license-only mode
                this._clearUserCredentials();
                
                // Disable trial visual overrides if we are logged in with a real license
                this.isTrialActive = false;
                
                return { success: true, message: data.message, info: data.info };
            } else {
                return { success: false, message: data.message };
            }
        } catch (error) {
            return { success: false, message: "Erreur de connexion serveur: " + error.message };
        }
    }

    _processUserData(info) {
        if (!info) return info;
        
        // Fix Username if it's a raw key (too long)
        // KeyAuth often returns the license key as username for pure license logins
        // We verify if username looks like a key (long, often capitalized)
        if (info.username && info.username.length > 20 && info.username.includes('-')) {
             // We can rename it for UI purposes, but keeping unique ID is good.
             // Let's just create a displayName property we can use? 
             // Or we just rely on UI to format it. 
             // But actually, let's fix the subscriptions first.
        }

        if (info.subscriptions && Array.isArray(info.subscriptions)) {
            info.subscriptions = info.subscriptions.map(sub => {
                // Fix Level
                if (sub.level === undefined || sub.level === null || sub.level === "") {
                    // Start default fallback
                    if (sub.subscription === "default" || sub.subscription === "Default") {
                        sub.level = "1";
                    }
                }
                
                // Fix large int levels (timestamps)
                const lvl = parseFloat(sub.level);
                if (!isNaN(lvl) && lvl > 1000) {
                     sub.level = "1";
                }
                
                return sub;
            });
        }
        
        return info;
    }

    _calculateLevel(info) {
        if (!info) return 0;
        let maxLevel = 0;
        
        // Debug
        console.log("Analyzing KeyAuth Info:", info);

        // Handle subscriptions array
        if (info.subscriptions && Array.isArray(info.subscriptions)) {
            for (const sub of info.subscriptions) {
                let lvl = parseFloat(sub.level);
                // Fix for weird timestamps appearing as level
                if (lvl > 1000) lvl = 1; // Default fallback if level is obviously wrong

                if (!isNaN(lvl) && lvl > maxLevel) maxLevel = lvl;
            }
        }
        
        // Fallback: check direct level property
        if (info.level !== undefined) {
             let lvl = parseFloat(info.level);
             if (lvl > 1000) lvl = 1; 

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
        return this.isAuthenticated && this.currentLevel >= SUBSCRIPTION_LEVELS.AI;
    }

    /**
     * Vérifie si l'accès aux fonctionnalités Pro est autorisé (Niveau 2+)
     * Trial ne donne pas accès Pro (Basic = 1)
     */
    hasProAccess() {
        return this.isAuthenticated && this.currentLevel >= SUBSCRIPTION_LEVELS.PRO;
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

    /**
     * Retourne la limite de stockage en octets selon l'abonnement
     */
    getStorageLimit() {
        // En cas d'essai ou pas connecté (mais essai actif), on peut donner le niveau BASIC
        if (this.isTrialActive) return STORAGE_LIMITS.BASIC;

        if (!this.isAuthenticated) return 0; // Pas de compte, pas de stockage cloud/persistant garanti hors local

        const level = this.currentLevel;

        if (level >= SUBSCRIPTION_LEVELS.DEV) return STORAGE_LIMITS.DEV;
        if (level >= SUBSCRIPTION_LEVELS.PRO) return STORAGE_LIMITS.PRO;
        if (level >= SUBSCRIPTION_LEVELS.BASIC) return STORAGE_LIMITS.BASIC;

        return 0; // Fallback
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
        let initError = null;
        if (!this.initialized || !this.sessionid) {
            const initRes = await this.init();
            if (!initRes.success) initError = initRes.message;
        }

        if (!this.sessionid) {
            return { success: false, message: initError || "Erreur d'initialisation: Impossible de contacter le serveur d'authentification." };
        }

        try {
            const data = await this._request({
                type: 'register',
                username: username,
                pass: password,
                key: license,
                email: email,
                hwid: this.hwid,
                sessionid: this.sessionid,
                name: KA_CONFIG.name,
                ownerid: KA_CONFIG.ownerid
            });

            if (data.success) {
                // Auto-login after registration to link chat and license immediately
                console.log("Registration successful, attempting auto-login...");
                const loginRes = await this.loginByUser(username, password);
                if (loginRes.success) {
                     return { success: true, message: "Inscription et connexion réussies !", info: loginRes.info };
                }
                return { success: true, message: "Inscription réussie, mais la connexion automatique a échoué: " + loginRes.message };
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
        let initError = null;
        if (!this.initialized || !this.sessionid) {
            const initRes = await this.init();
            if (!initRes.success) initError = initRes.message;
        }

        if (!this.sessionid) {
            return { success: false, message: initError || "Erreur d'initialisation..." };
        }

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
                // Refresh local data using stored password
                if (this.currentPassword) {
                    await this.loginByUser(username, this.currentPassword);
                } else {
                    // Try to fake a refresh or just warn
                     return { success: true, message: "Licence ajoutée. Veuillez vous reconnecter pour mettre à jour les droits." };
                }
                return { success: true, message: data.message };
            } else {
                return { success: false, message: data.message };
            }
        } catch (error) {
            return { success: false, message: "Erreur ajout licence: " + error.message };
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
        this.initialized = false;
        this.currentLevel = 0;
        this.isTrialActive = false; // Disable trial on explicit logout to allow key entry
        localStorage.removeItem('fiip-license-key');
        localStorage.removeItem('fiip-auth-mode');
        this._clearUserCredentials();
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
            return;
        }

        const creds = this._loadUserCredentials();
        if (creds) {
            await this.loginByUser(creds.username, creds.password);
        }
    }

    _saveSession(key) {
        localStorage.setItem('fiip-license-key', key);
    }

    _saveUserCredentials(username, password) {
        // Simple base64 encoding to avoid plain text staring at you
        // In production, consider encryption or secure storage
        const token = btoa(username + ":" + password);
        localStorage.setItem('fiip-user-creds', token);
    }

    _loadUserCredentials() {
        const token = localStorage.getItem('fiip-user-creds');
        if (!token) return null;
        try {
            const decoded = atob(token);
            const [username, ...passParts] = decoded.split(':');
            const password = passParts.join(':');
            return { username, password };
        } catch (e) {
            return null;
        }
    }

    _clearUserCredentials() {
        localStorage.removeItem('fiip-user-creds');
    }
}

export const keyAuthService = new KeyAuthService();
