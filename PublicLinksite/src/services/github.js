/**
 * GitHub API Service for PublicLinkSite
 */

const GITHUB_REPO = 'darkiifr/Fiip';
const API_URL = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;

export const getLatestRelease = async () => {
  try {
    const res = await fetch(API_URL);
    if (!res.ok) return null;
    const data = await res.json();
    
    // Extraction des assets pertinents
    const assets = data.assets || [];
    
    // Windows (.exe ou .msi)
    const windowsAsset = assets.find(a => a.name.endsWith('.exe') && !a.name.includes('Portable'));
    
    // macOS (.dmg ou .app.tar.gz)
    const macAsset = assets.find(a => a.name.endsWith('.dmg') || a.name.endsWith('.app.tar.gz'));
    
    // Linux (.AppImage ou .deb)
    const linuxAsset = assets.find(a => a.name.endsWith('.AppImage') || a.name.endsWith('.deb'));
    
    return {
      version: data.tag_name,
      windows: windowsAsset?.browser_download_url || `https://github.com/${GITHUB_REPO}/releases/latest`,
      mac: macAsset?.browser_download_url || `https://github.com/${GITHUB_REPO}/releases/latest`,
      linux: linuxAsset?.browser_download_url || `https://github.com/${GITHUB_REPO}/releases/latest`,
      iosAltStore: `altstore://source?url=https://github.com/${GITHUB_REPO}/releases/latest/download/altstore.json`,
      releaseUrl: data.html_url
    };
  } catch (error) {
    console.error('[GitHubService] Error fetching latest release:', error);
    return null;
  }
};
