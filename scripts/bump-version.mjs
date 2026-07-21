import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const VERSION_PATTERN = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/;
const SUPPORTED_BUMPS = new Set([
  'patch',
  'minor',
  'major',
  'prepatch',
  'preminor',
  'premajor',
  'prerelease',
]);

export function bumpVersion(currentVersion, bumpType = 'patch') {
  const match = VERSION_PATTERN.exec(String(currentVersion));
  if (!match) throw new Error(`Version invalide: ${currentVersion}`);
  if (!SUPPORTED_BUMPS.has(bumpType)) throw new Error(`Type de version invalide: ${bumpType}`);

  let major = Number(match[1]);
  let minor = Number(match[2]);
  let patch = Number(match[3]);
  const prerelease = match[4] || '';

  if (bumpType === 'major' || bumpType === 'premajor') {
    major += 1;
    minor = 0;
    patch = 0;
  } else if (bumpType === 'minor' || bumpType === 'preminor') {
    minor += 1;
    patch = 0;
  } else if (bumpType === 'patch' || bumpType === 'prepatch') {
    patch += 1;
  }

  if (bumpType === 'prerelease') {
    const identifiers = prerelease ? prerelease.split('.') : ['rc', '0'];
    const last = identifiers.at(-1);
    if (/^\d+$/.test(last || '')) identifiers[identifiers.length - 1] = String(Number(last) + 1);
    else identifiers.push('0');
    return `${major}.${minor}.${patch}-${identifiers.join('.')}`;
  }
  if (bumpType.startsWith('pre')) return `${major}.${minor}.${patch}-rc.0`;

  return `${major}.${minor}.${patch}`;
}

function updateJsonVersion(filePath, version) {
  const document = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  document.version = version;
  fs.writeFileSync(filePath, `${JSON.stringify(document, null, 2)}\n`);
}

export function updateProjectVersion(rootDirectory, bumpType = 'patch') {
  const packageJsonPath = path.join(rootDirectory, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const version = bumpVersion(packageJson.version, bumpType);

  updateJsonVersion(packageJsonPath, version);
  updateJsonVersion(path.join(rootDirectory, 'src-tauri', 'tauri.conf.json'), version);
  updateJsonVersion(path.join(rootDirectory, 'public', 'version.json'), version);

  const packageLockPath = path.join(rootDirectory, 'package-lock.json');
  try {
    const packageLock = JSON.parse(fs.readFileSync(packageLockPath, 'utf8'));
    packageLock.version = version;
    if (packageLock.packages?.['']) packageLock.packages[''].version = version;
    fs.writeFileSync(packageLockPath, `${JSON.stringify(packageLock, null, 2)}\n`);
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }

  return { previousVersion: packageJson.version, version };
}

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isDirectRun) {
  const typeArgument = process.argv.slice(2).find((argument) => argument.startsWith('--type='));
  const bumpType = typeArgument?.split('=', 2)[1] || 'patch';
  const result = updateProjectVersion(process.cwd(), bumpType);
  console.log(`Version ${result.previousVersion} -> ${result.version} (${bumpType})`);
}
