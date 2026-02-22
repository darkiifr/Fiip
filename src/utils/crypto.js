
// Generate a key from a password using PBKDF2
export async function deriveKey(password, salt) {
    const enc = new TextEncoder();
    const keyMaterial = await window.crypto.subtle.importKey(
        "raw",
        enc.encode(password),
        { name: "PBKDF2" },
        false,
        ["deriveKey"]
    );

    return window.crypto.subtle.deriveKey(
        {
            name: "PBKDF2",
            salt: salt, // BufferSource
            iterations: 100000,
            hash: "SHA-256"
        },
        keyMaterial,
        { name: "AES-GCM", length: 256 },
        true,
        ["encrypt", "decrypt"]
    );
}

// Encrypt data
export async function encryptData(data, password) {
    try {
        const enc = new TextEncoder();
        const salt = window.crypto.getRandomValues(new Uint8Array(16));
        const iv = window.crypto.getRandomValues(new Uint8Array(12));
        const key = await deriveKey(password, salt);
        
        const jsonStr = JSON.stringify(data);
        const encodedData = enc.encode(jsonStr);

        const encryptedContent = await window.crypto.subtle.encrypt(
            {
                name: "AES-GCM",
                iv: iv
            },
            key,
            encodedData
        );

        // Pack salt + iv + encryptedContent
        // Format: Base64(salt) : Base64(iv) : Base64(encrypted)
        const saltB64 = arrayBufferToBase64(salt);
        const ivB64 = arrayBufferToBase64(iv);
        const contentB64 = arrayBufferToBase64(encryptedContent);

        return `ENC:${saltB64}:${ivB64}:${contentB64}`;
    } catch (e) {
        console.error("Encryption error:", e);
        throw e;
    }
}

// Decrypt data
export async function decryptData(encryptedStr, password) {
    try {
        if (!encryptedStr || typeof encryptedStr !== 'string') return encryptedStr;

        if (!encryptedStr.startsWith('ENC:')) {
            // Assume plain JSON if not prefixed (Migration path)
            // If it's an object, it's already parsed? No, this function expects string.
            try {
                return JSON.parse(encryptedStr);
            } catch {
                return encryptedStr;
            }
        }

        const parts = encryptedStr.split(':');
        if (parts.length !== 4) throw new Error("Invalid encrypted format");

        const salt = base64ToArrayBuffer(parts[1]);
        const iv = base64ToArrayBuffer(parts[2]);
        const content = base64ToArrayBuffer(parts[3]);

        const key = await deriveKey(password, salt);

        const decryptedContent = await window.crypto.subtle.decrypt(
            {
                name: "AES-GCM",
                iv: iv
            },
            key,
            content
        );

        const dec = new TextDecoder();
        const jsonStr = dec.decode(decryptedContent);
        return JSON.parse(jsonStr);
    } catch (e) {
        console.error("Decryption error:", e);
        throw new Error("Impossible de déchiffrer les données (Mot de passe incorrect ?)");
    }
}

function arrayBufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
}

function base64ToArrayBuffer(base64) {
    const binary_string = window.atob(base64);
    const len = binary_string.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binary_string.charCodeAt(i);
    }
    return bytes.buffer;
}
