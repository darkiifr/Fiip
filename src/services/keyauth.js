
// Configuration KeyAuth - À REMPLACER PAR VOS INFORMATIONS
// Les informations sont chargées depuis les variables d'environnement (.env) pour la sécurité
const KA_CONFIG = {
    name: import.meta.env.VITE_KEYAUTH_NAME, // Nom de votre application
    ownerid: import.meta.env.VITE_KEYAUTH_OWNERID, // Owner ID
    secret: import.meta.env.VITE_KEYAUTH_SECRET, // Application Secret
    version: import.meta.env.VITE_KEYAUTH_VERSION, // Version de votre application
    apiUrl: import.meta.env.VITE_KEYAUTH_APIURL // URL de l'API
};

class KeyAuthService {
    constructor() {
        this.sessionid = null;
        this.isAuthenticated = false;
        this.userData = null;
        this.initialized = false;
    }

    /**
     * Initialise la connexion avec KeyAuth
     */
    async init() {
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
                subscription: "developer",
                expiry: "2099-01-01"
            };
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
                this.userData = data.info; // Adaptez selon la structure de réponse réelle
                this._saveSession(key);
                return { success: true, message: data.message, info: data.info };
            } else {
                return { success: false, message: data.message };
            }
        } catch (error) {
            return { success: false, message: "Erreur de connexion serveur: " + error.message };
        }
    }

    /**
     * Vérifie si l'utilisateur a un abonnement actif
     */
    checkSubscription() {
        // Logique personnalisée selon les données retournées par KeyAuth
        // Par exemple vérifier si userData.subscriptions contient un niveau spécifique
        if (!this.isAuthenticated || !this.userData) return false;
        
        // Exemple simple : on considère valide si authentifié
        // Vous pouvez ajouter une vérification de date d'expiration ici
        return true; 
    }

    /**
     * Vérifie si l'accès aux fonctionnalités AI est autorisé
     */
    hasAIAccess() {
        if (!this.checkSubscription()) return false;
        
        // Vérifier le niveau d'abonnement si nécessaire
        // if (this.userData.subscription !== "premium") return false;
        
        return true;
    }

    logout() {
        this.isAuthenticated = false;
        this.userData = null;
        this.sessionid = null;
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

        return await response.json();
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
