import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { platform } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sourceDir = join(root, 'BrowserExtension');
const outputDir = join(root, 'dist', 'extensions');
const workDir = join(outputDir, 'work');
const CHROME_EXTENSION_VERSION_PATTERN = /^\d+(\.\d+){0,3}$/;

function resetDir(path) {
  rmSync(path, { recursive: true, force: true });
  mkdirSync(path, { recursive: true });
}

export function shouldIncludeBrowserExtensionFile(src) {
  const normalized = src.replaceAll('\\', '/');
  return !normalized.endsWith('/README.md') && !normalized.endsWith('.test.js');
}

function copyPayload(targetDir) {
  cpSync(sourceDir, targetDir, {
    recursive: true,
    filter: shouldIncludeBrowserExtensionFile,
  });
}

export function normalizeBrowserExtensionVersion(value) {
  const raw = String(value || '').trim().replace(/^v\.?/, '');
  if (!CHROME_EXTENSION_VERSION_PATTERN.test(raw)) {
    throw new Error(`Browser extension version "${value}" must be 1 to 4 numeric dot-separated segments.`);
  }
  return raw;
}

function getRequestedVersion() {
  const versionArgIndex = process.argv.findIndex((arg) => arg === '--version');
  if (versionArgIndex >= 0) {
    return process.argv[versionArgIndex + 1] || '';
  }
  const inlineArg = process.argv.find((arg) => arg.startsWith('--version='));
  if (inlineArg) {
    return inlineArg.slice('--version='.length);
  }
  return process.env.EXTENSION_VERSION || process.env.APP_VERSION || '';
}

function setManifestVersion(targetDir, version) {
  if (!version) return;
  const manifestPath = join(targetDir, 'manifest.json');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  manifest.version = normalizeBrowserExtensionVersion(version);
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
}

function zipDirectory(source, destination) {
  if (platform() === 'win32') {
    const command = [
      '-NoProfile',
      '-Command',
      `Compress-Archive -Path '${source.replaceAll("'", "''")}\\*' -DestinationPath '${destination.replaceAll("'", "''")}' -Force`,
    ];
    const result = spawnSync('powershell', command, { stdio: 'inherit' });
    if (result.status !== 0) process.exit(result.status ?? 1);
    return;
  }

  const result = spawnSync('zip', ['-qr', destination, '.'], { cwd: source, stdio: 'inherit' });
  if (result.status !== 0) {
    console.error('zip command failed. Install zip on the runner or package locally on Windows.');
    process.exit(result.status ?? 1);
  }
}

export function packageBrowserExtensions() {
  if (!existsSync(sourceDir)) {
    console.error(`BrowserExtension folder not found at ${sourceDir}`);
    process.exit(1);
  }

  resetDir(outputDir);
  mkdirSync(workDir, { recursive: true });

  for (const store of ['Chrome', 'Edge']) {
    const target = join(workDir, store.toLowerCase());
    resetDir(target);
    copyPayload(target);
    setManifestVersion(target, getRequestedVersion());
    zipDirectory(target, join(outputDir, `Fiip-Web-Clipper-${store}.zip`));
  }

  rmSync(workDir, { recursive: true, force: true });
  console.log(`Browser extension packages created in ${outputDir}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  packageBrowserExtensions();
}
