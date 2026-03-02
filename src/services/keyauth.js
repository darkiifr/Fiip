
// Configuration KeyAuth - À REMPLACER PAR VOS INFORMATIONS
// Les informations sont chargées depuis les variables d'environnement (.env) pour la sécurité
import { invoke } from '@tauri-apps/api/core';
import { fetch } from '@tauri-apps/plugin-http';
// import { encryptData, decryptData } from '../utils/crypto';

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

// These should now be checked against Supabase limits, but kept here for reference/fallback
export const STORAGE_LIMITS = {
    BASIC: 15 * 1024 * 1024 * 1024, // 15 GB
    PRO: 50 * 1024 * 1024 * 1024,   // 50 GB
    DEV: 500 * 1024 * 1024 * 1024   // 500 GB
};

class KeyAuthService {
    constructor() {
        this.sessionid = null;
        this.isAuthenticated = false; // Means "License Validated" or "Supabase Subscription Active"
        this.userData = null;
        this.initialized = false;
        this.currentLevel = 0;
        this.hwid = null;
        this.licenseKey = null; 
        
        // Trial State
        this.isTrialActive = false;
        this.trialExpiry = null;
        
        this._restoreTrial();
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

    async init() {
        await this._fetchHWID();
        
        if (this.initialized && this.sessionid) return { success: true };
        
        if (this.initPromise) return this.initPromise;

        this.initPromise = (async () => {
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
                    return { success: true, message: data.message };
                } else {
                    return { success: false, message: data.message };
                }
            } catch (error) {
                return { success: false, message: error.message };
            } finally {
                this.initPromise = null;
            }
        })();

        return this.initPromise;
    }

    async _request(data) {
        try {
            const formData = new FormData();
            for (const key in data) {
                formData.append(key, data[key]);
            }

            const response = await fetch(KA_CONFIG.apiUrl || "https://keyauth.win/api/1.2/", {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error(`HTTP Error: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error("KeyAuth Request Error:", error);
            return { success: false, message: "Connection error" };
        }
    }

    /**
     * Valide une licence KeyAuth
     * @param {string} key 
     */
    async validateLicense(key) {
        let initError = null;
        if (!this.initialized || !this.sessionid) {
            const initRes = await this.init();
            if (!initRes.success) initError = initRes.message;
        }

        if (!this.sessionid) {
            return { success: false, message: initError || "Erreur d'initialisation KeyAuth." };
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
                this.licenseKey = key;
                return { success: true, message: data.message, info: data.info, level: this.currentLevel };
            } else {
                return { success: false, message: data.message };
            }
        } catch (error) {
            return { success: false, message: "Erreur serveur: " + error.message };
        }
    }

    /**
     * Allow app to set level from Supabase data
     */
    setLocalLevel(level) {
        this.currentLevel = Number(level) || 0;
        if (this.currentLevel > 0) {
            this.isAuthenticated = true;
            // Mock userData for UI compatibility if missing
            if (!this.userData) {
                this.userData = {
                    username: "Utilisateur",
                    subscriptions: [
                        {
                            subscription: this.getCurrentSubscriptionName(),
                            level: this.currentLevel.toString(),
                            expiry: "Never"
                        }
                    ]
                };
            }
        }
    }

    _processUserData(info) {
        if (!info) return info;
        if (info.subscriptions && Array.isArray(info.subscriptions)) {
            info.subscriptions = info.subscriptions.map(sub => {
                let subName = (sub.subscription || "").toLowerCase();
                if (subName.includes("dev") || subName.includes("admin")) {
                    sub.level = "4"; 
                } else if (subName.includes("pro") || subName.includes("premium")) {
                    if (!sub.level || sub.level < 2) sub.level = "2";
                } else if (subName.includes("ai") || subName.includes("plus")) {
                     if (!sub.level || sub.level < 1.5) sub.level = "1.5";
                }
                if (!sub.level || sub.level === "0") sub.level = "1"; 
                return sub;
            });
        }
        return info;
    }

    _calculateLevel(info) {
        if (!info) return 0;
        let maxLevel = 0;
        if (info.subscriptions && Array.isArray(info.subscriptions)) {
            for (const sub of info.subscriptions) {
                let lvl = parseFloat(sub.level);
                if (lvl > 1000) lvl = 1; 
                if (!isNaN(lvl) && lvl > maxLevel) maxLevel = lvl;
            }
        }
        if (info.level !== undefined) {
             let lvl = parseFloat(info.level);
             if (lvl > 1000) lvl = 1; 
             if (!isNaN(lvl) && lvl > maxLevel) maxLevel = lvl;
        }
        return maxLevel;
    }

    hasAIAccess() {
        return (this.isAuthenticated && this.currentLevel >= SUBSCRIPTION_LEVELS.AI) || this.isTrialActive;
    }

    hasProAccess() {
        return (this.isAuthenticated && this.currentLevel >= SUBSCRIPTION_LEVELS.PRO) || this.isTrialActive;
    }

    getCurrentSubscriptionName() {
        if (this.isTrialActive) return "Essai Gratuit";
        if (this.currentLevel >= 4) return "Developer";
        if (this.currentLevel >= 2) return "Pro";
        if (this.currentLevel >= 1.5) return "AI Plus";
        if (this.currentLevel >= 1) return "Basic";
        return "Free";
    }

    // --- Trial Management ---
    canStartTrial() {
        const trialUsed = localStorage.getItem('fiip-trial-used') === 'true';
        return !this.isAuthenticated && !trialUsed;
    }

    startTrial() {
        if (!this.canStartTrial()) return false;
        const now = Date.now();
        const duration = 15 * 24 * 60 * 60 * 1000; 
        const expiry = now + duration;
        localStorage.setItem('fiip-trial-used', 'true');
        localStorage.setItem('fiip-trial-expiry', expiry.toString());
        this.isTrialActive = true;
        this.trialExpiry = new Date(expiry).toISOString().split('T')[0];
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
                this.isTrialActive = false;
                this.trialExpiry = null;
            }
        }
    }
}

export const keyAuthService = new KeyAuthService();
