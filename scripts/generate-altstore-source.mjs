import { statSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const BUNDLE_IDENTIFIER = 'com.fiipmobile';
const REPOSITORY = 'darkiifr/Fiip';

export function normalizeTag(tag) {
  const normalized = String(tag || '').trim().replace(/^v\.?/, '');
  if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(normalized)) {
    throw new Error(`Invalid release tag: ${tag}`);
  }
  return normalized;
}

export function createAltStoreSource({ tag, version, buildVersion, date, ipaSize }) {
  const releaseVersion = normalizeTag(tag);
  const appVersion = String(version || '').trim();
  const appBuildVersion = String(buildVersion || '').trim();

  if (!/^\d+(?:\.\d+){0,2}$/.test(appVersion)) {
    throw new Error(`Invalid CFBundleShortVersionString: ${version}`);
  }
  if (!/^\d+$/.test(appBuildVersion)) {
    throw new Error(`Invalid CFBundleVersion: ${buildVersion}`);
  }
  if (!Number.isSafeInteger(ipaSize) || ipaSize <= 0) {
    throw new Error('IPA size must be a positive integer');
  }

  const tagName = String(tag).trim();
  const encodedTag = encodeURIComponent(tagName);
  const downloadURL = `https://github.com/${REPOSITORY}/releases/download/${encodedTag}/FiipMobile-Unsigned.ipa`;
  const iconURL = `https://raw.githubusercontent.com/${REPOSITORY}/${encodedTag}/src-tauri/icons/icon.png`;

  return {
    name: 'Fiip',
    subtitle: 'Notes privées, synchronisées et accessibles partout.',
    description: 'Source officielle de Fiip pour AltStore Classic.',
    iconURL,
    website: 'https://fiip.fr',
    tintColor: '#111111',
    apps: [
      {
        name: 'Fiip',
        bundleIdentifier: BUNDLE_IDENTIFIER,
        developerName: 'VinsSoftware',
        subtitle: 'Notes chiffrées sur mobile et ordinateur.',
        localizedDescription: 'Créez, organisez et synchronisez vos notes Fiip depuis votre iPhone ou iPad.',
        iconURL,
        tintColor: '#111111',
        versions: [
          {
            version: appVersion,
            buildVersion: appBuildVersion,
            marketingVersion: releaseVersion,
            date,
            localizedDescription: `Fiip ${releaseVersion}`,
            downloadURL,
            size: ipaSize,
            minOSVersion: '16.4',
          },
        ],
      },
    ],
  };
}

export function generateAltStoreSource(env = process.env) {
  const ipaPath = resolve(env.ALTSTORE_IPA_PATH || 'Mobile/ios/FiipMobile-Unsigned.ipa');
  const outputPath = resolve(env.ALTSTORE_OUTPUT || 'Mobile/ios/altstore.json');
  const source = createAltStoreSource({
    tag: env.ALTSTORE_TAG,
    version: env.ALTSTORE_VERSION,
    buildVersion: env.ALTSTORE_BUILD_VERSION,
    date: env.ALTSTORE_RELEASE_DATE || new Date().toISOString(),
    ipaSize: statSync(ipaPath).size,
  });

  writeFileSync(outputPath, `${JSON.stringify(source, null, 2)}\n`, 'utf8');
  return source;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  generateAltStoreSource();
}
