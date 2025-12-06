import { platform as getPlatformName, type as getOSTypeName } from '@tauri-apps/plugin-os';

let cachedPlatform = null;
let cachedOSType = null;

// Get platform info (cached)
export async function getPlatform() {
    if (!cachedPlatform) {
        cachedPlatform = await getPlatformName();
    }
    return cachedPlatform;
}

// Get OS type (cached)
export async function getOSType() {
    if (!cachedOSType) {
        cachedOSType = await getOSTypeName();
    }
    return cachedOSType;
}

// Get the appropriate modifier key for the platform
export async function getModifierKey() {
    const platformName = await getPlatform();
    return platformName === 'macos' || platformName === 'darwin' ? 'Cmd' : 'Ctrl';
}

// Check if current platform is macOS
export async function isMacOS() {
    const platformName = await getPlatform();
    return platformName === 'macos' || platformName === 'darwin';
}

// Check if current platform is Windows
export async function isWindows() {
    const platformName = await getPlatform();
    return platformName === 'windows';
}

// Check if current platform is Linux
export async function isLinux() {
    const platformName = await getPlatform();
    return platformName === 'linux';
}

// Get platform display name
export async function getPlatformDisplayName() {
    const platformName = await getPlatform();
    const osType = await getOSType();

    const platformMap = {
        'windows': 'Windows',
        'macos': 'macOS',
        'darwin': 'macOS',
        'linux': 'Linux'
    };

    return platformMap[platformName] || osType || 'Unknown';
}
