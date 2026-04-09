
import { BaseDirectory, writeTextFile, readTextFile, exists, mkdir, readDir, remove } from '@tauri-apps/plugin-fs';

// 1. Fetch available fonts from Fontsource
export async function searchFonts(query) {
    try {
        const response = await fetch(`https://api.fontsource.org/v1/fonts`);
        const allFonts = await response.json();
        
        let filtered = Object.values(allFonts);
        
        if (query) {
            filtered = filtered.filter(f => f.family.toLowerCase().includes(query.toLowerCase()) || f.id.includes(query.toLowerCase()));
        }
        
        return filtered.map(f => ({
            id: f.id,
            family: f.family,
            category: f.category,
            weights: f.weights,
            styles: f.styles
        }));
    } catch (e) {
        console.error("Erreur recherche de police:", e);
        return [];
    }
}

// 2. Install a Font (Download WOFF2, Convert to Base64, Save as .fiif)
export async function installFont(fontData) {
    try {
        // Ensure fonts directory exists
        const fontsDir = 'fonts';
        const hasFontsDir = await exists(fontsDir, { baseDir: BaseDirectory.AppData });
        if (!hasFontsDir) {
            await mkdir(fontsDir, { baseDir: BaseDirectory.AppData, recursive: true });
        }
        
        const filePath = `${fontsDir}/${fontData.id}.fiif`;
        const alreadyInstalled = await exists(filePath, { baseDir: BaseDirectory.AppData });
        if (alreadyInstalled) {
            return { success: true, message: "Police déjà installée" };
        }
        
        // Fetch woff2 binary from Fontsource
        // Using regular weight normally, checking available weight array
        const weight = fontData.weights.includes(400) ? 400 : fontData.weights[0];
        const style = fontData.styles.includes("normal") ? "normal" : fontData.styles[0];
        
        // Fontsource CDN typical URL structure (assuming latin subset)
        const fontUrl = `https://cdn.jsdelivr.net/fontsource/fonts/${fontData.id}@latest/latin-${weight}-${style}.woff2`;
        
        const response = await fetch(fontUrl);
        if (!response.ok) throw new Error("Impossible de télécharger le fichier WOFF2");
        
        const buffer = await response.arrayBuffer();
        
        // Convert to Base64
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        const base64String = window.btoa(binary);
        const dataUri = `data:font/woff2;charset=utf-8;base64,${base64String}`;
        
        // Create the .fiif Object
        const fiifContent = {
            id: fontData.id,
            family: fontData.family,
            category: fontData.category,
            data: dataUri,
            installedAt: new Date().toISOString()
        };
        
        // Save .fiif
        await writeTextFile(filePath, JSON.stringify(fiifContent), { baseDir: BaseDirectory.AppData });
        
        // Inject so it is immediately usable
        injectFont(fiifContent);
        
        return { success: true };
    } catch (e) {
        console.error("Installation échouée:", e);
        return { success: false, error: e.message };
    }
}

// 3. Inject @font-face dynamically in the document
export function injectFont(fontObj) {
    const styleId = `fiif-font-${fontObj.id}`;
    if (document.getElementById(styleId)) return; // Already injected
    
    const styleEl = document.createElement("style");
    styleEl.id = styleId;
    styleEl.textContent = `
        @font-face {
            font-family: "${fontObj.family} (Fiip)";
            src: url("${fontObj.data}") format("woff2");
            font-weight: normal;
            font-style: normal;
            font-display: swap;
        }
    `;
    document.head.appendChild(styleEl);
}

// 4. Get all installed .fiif fonts
export async function getInstalledFonts() {
    try {
        const fontsDir = 'fonts';
        const hasFontsDir = await exists(fontsDir, { baseDir: BaseDirectory.AppData });
        if (!hasFontsDir) {
            console.log("hasFontsDir is false");
            return [];
        }
        
        console.log("hasFontsDir is true, reading dir");
        const entries = await readDir(fontsDir, { baseDir: BaseDirectory.AppData });
        const installedFonts = [];
        
        for (const entry of entries) {
            if (entry.name && entry.name.endsWith('.fiif')) {
                const contentStr = await readTextFile(`${fontsDir}/${entry.name}`, { baseDir: BaseDirectory.AppData });
                try {
                    const fiif = JSON.parse(contentStr);
                    installedFonts.push(fiif);
                } catch (pe) {
                    console.error(`Invalid JSON in ${entry.name}`, pe);
                }
            }
        }
        
        console.log("Found fonts:", installedFonts.length);
        return installedFonts;
    } catch (e) {
        console.error("Erreur lecture polices installées:", e);
        return [];
    }
}

// 5. App Startup Initialization
export async function initializeFonts() {
    const fonts = await getInstalledFonts();
    fonts.forEach(fiif => injectFont(fiif));
    console.log(`${fonts.length} polices personnalisées chargées`);
}

// 6. Uninstall Font
export async function uninstallFont(id) {
    try {
        const fontsDir = 'fonts';
        const filePath = `${fontsDir}/${id}.fiif`;
        await remove(filePath, { baseDir: BaseDirectory.AppData });
        
        const styleEl = document.getElementById(`fiif-font-${id}`);
        if (styleEl) {
            styleEl.remove();
        }
        
        return { success: true };
    } catch (err) {
        console.error("Failed to uninstall font", err);
        return { success: false, error: err.message };
    }
}

