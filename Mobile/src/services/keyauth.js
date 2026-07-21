import DeviceInfo from 'react-native-device-info';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { VITE_KEYAUTH_NAME, VITE_KEYAUTH_OWNERID, VITE_KEYAUTH_SECRET, VITE_KEYAUTH_VERSION } from '@env';

// Configuration KeyAuth - À REMPLACER PAR VOS INFORMATIONS
const KA_CONFIG = {
    name: VITE_KEYAUTH_NAME || process.env.EXPO_PUBLIC_KEYAUTH_NAME,
    ownerid: VITE_KEYAUTH_OWNERID || process.env.EXPO_PUBLIC_KEYAUTH_OWNERID,
    secret: VITE_KEYAUTH_SECRET || process.env.EXPO_PUBLIC_KEYAUTH_SECRET,
    version: VITE_KEYAUTH_VERSION || process.env.EXPO_PUBLIC_KEYAUTH_VERSION || "1.0",
    apiUrl: "https://keyauth.win/api/1.2/"
};

export const SUBSCRIPTION_LEVELS = {
    BASIC: 1,
    PRO: 2,
    AI: 3,
    FAMILY_PRO: 4,
};

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
    }

    async _fetchHWID() {
        if (this.hwid) return;
        try {
            this.hwid = await DeviceInfo.getUniqueId();
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
                return { success: false, message: "Service de licence indisponible pour le moment." };
            }
        } catch {
                return { success: false, message: "Service de licence indisponible pour le moment." };
            } finally {
                this.initPromise = null;
            }
        })();

        return this.initPromise;
    }

    async _request(data) {
        try {
            const params = new URLSearchParams();
            for (const key in data) {
                params.append(key, data[key]);
            }

            // Using React Native's global fetch API
            const response = await fetch(KA_CONFIG.apiUrl || "https://keyauth.win/api/1.2/", {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: params.toString()
            });

            if (!response.ok) {
                throw new Error(`HTTP Error: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error("KeyAuth Request Error:", error);
            return { success: false, message: "Connexion au service de licence impossible pour le moment." };
        }
    }

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
        } catch {
            return { success: false, message: "Validation de licence impossible pour le moment." };
        }
    }

    setLocalLevel(level, overrideUsername, licenseKey = null) {
        this.currentLevel = Number(level) || 0;
        if (this.currentLevel <= 0) {
            this.isAuthenticated = false;
            this.userData = null;
            this.currentLevel = 0;
            this.licenseKey = null;
            return;
        }

        if (licenseKey) {
            this.licenseKey = licenseKey;
        }

        if (this.currentLevel > 0) {
            this.isAuthenticated = true;
            if (!this.userData) {
                this.userData = {
                    username: overrideUsername || "Utilisateur",
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

    async verifyLicense(key) {
        return this.validateLicense(key);
    }

    async logout() {
        this.sessionid = null;
        this.isAuthenticated = false;
        this.userData = null;
        this.initialized = false;
        this.currentLevel = 0;
        this.licenseKey = null;
        this.isTrialActive = false;
        this.trialExpiry = null;
        await AsyncStorage.removeItem('saved_license_key');
        await AsyncStorage.removeItem('fiip-trial-expiry');
    }

    _processUserData(info) {
        if (!info) return info;
        
        if (info.username === this.licenseKey) {
            delete info.username;
        }
        
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
        return this.isAuthenticated && this.currentLevel >= SUBSCRIPTION_LEVELS.AI;
    }

    hasProAccess() {
        return this.isAuthenticated && this.currentLevel >= SUBSCRIPTION_LEVELS.PRO;
    }

    getCurrentSubscriptionName() {
        if (this.isAuthenticated && this.currentLevel >= 4) return "Family Pro";
        if (this.isAuthenticated && this.currentLevel >= 3) return "AI";
        if (this.isAuthenticated && this.currentLevel >= 2) return "Pro";
        if (this.isAuthenticated && this.currentLevel >= 1) return "Basic";
        return "Free";
    }
}

export const keyAuthService = new KeyAuthService();
