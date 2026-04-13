import RNFS from 'react-native-fs';

const FONTS_DIR = `${RNFS.DocumentDirectoryPath}/fonts`;

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
        const hasFontsDir = await RNFS.exists(FONTS_DIR);
        if (!hasFontsDir) {
            await RNFS.mkdir(FONTS_DIR);
        }
        
        const filePath = `${FONTS_DIR}/${fontData.id}.fiif`;
        const alreadyInstalled = await RNFS.exists(filePath);
        if (alreadyInstalled) {
            return { success: true, message: "Police déjà installée" };
        }
        
        const weight = fontData.weights.includes(400) ? 400 : fontData.weights[0];
        const style = fontData.styles.includes("normal") ? "normal" : fontData.styles[0];
        
        const fontUrl = `https://cdn.jsdelivr.net/fontsource/fonts/${fontData.id}@latest/latin-${weight}-${style}.woff2`;
        
        // Fetch file to temp cache before reading as base64
        const tempPath = `${RNFS.CachesDirectoryPath}/temp_${fontData.id}.woff2`;
        await RNFS.downloadFile({
            fromUrl: fontUrl,
            toFile: tempPath
        }).promise;
        
        const base64String = await RNFS.readFile(tempPath, 'base64');
        await RNFS.unlink(tempPath);

        const dataUri = `data:font/woff2;charset=utf-8;base64,${base64String}`;
        
        const fiifContent = {
            id: fontData.id,
            family: fontData.family,
            category: fontData.category,
            data: dataUri,
            installedAt: new Date().toISOString()
        };
        
        await RNFS.writeFile(filePath, JSON.stringify(fiifContent), 'utf8');
        
        injectFont(fiifContent);
        
        return { success: true };
    } catch (e) {
        console.error("Installation échouée:", e);
        return { success: false, error: e.message };
    }
}

// 3. Inject Font (Mocked for RN as dynamic injection requires extra setup/modules)
export function injectFont(fontObj) {
    // Note: React Native does not support injecting @font-face into a document.
    // To implement dynamic fonts in RN, packages like `react-native-dynamic-fonts` or `expo-font`
    // would be used to load the font from the file system or base64.
    console.log(`Font ${fontObj.family} registered. Custom implementation required to link font across RN views.`);
}

// 4. Get all installed .fiif fonts
export async function getInstalledFonts() {
    try {
        const hasFontsDir = await RNFS.exists(FONTS_DIR);
        if (!hasFontsDir) {
            return [];
        }
        
        const entries = await RNFS.readDir(FONTS_DIR);
        const installedFonts = [];
        
        for (const entry of entries) {
            if (entry.name && entry.name.endsWith('.fiif')) {
                const contentStr = await RNFS.readFile(entry.path, 'utf8');
                try {
                    const fiif = JSON.parse(contentStr);
                    installedFonts.push(fiif);
                } catch (pe) {
                    console.error(`Invalid JSON in ${entry.name}`, pe);
                }
            }
        }
        
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
        const filePath = `${FONTS_DIR}/${id}.fiif`;
        const fontExists = await RNFS.exists(filePath);
        if (fontExists) {
            await RNFS.unlink(filePath);
        }
        return { success: true };
    } catch (err) {
        console.error("Failed to uninstall font", err);
        return { success: false, error: err.message };
    }
}
