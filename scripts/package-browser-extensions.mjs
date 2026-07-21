import 'dotenv/config';

import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { platform } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const sourceDir = join(root, 'BrowserExtension');
const outputDir = join(root, 'dist', 'extensions');
const workDir = join(outputDir, 'work');
const CHROME_EXTENSION_VERSION_PATTERN = /^\d+(\.\d+){0,3}$/;
const FIIP_SUPABASE_HOST = 'fqouvzkovppyqocfxanl.supabase.co';
const DEFAULT_CLERK_SYNC_HOST = 'https://clerk.fiip.fr';
const DEFAULT_CLERK_SIGN_IN_URL = 'https://portail.fiip.fr/sign-in';

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

function quoteJavaScriptString(value) {
  return `'${String(value).replaceAll('\\', '\\\\').replaceAll("'", "\\'").replaceAll('\r', '\\r').replaceAll('\n', '\\n')}'`;
}

export function buildBrowserExtensionConfigSource({
  supabaseUrl,
  supabaseAnonKey,
  clerkPublishableKey,
  clerkSyncHost = DEFAULT_CLERK_SYNC_HOST,
  clerkSignInUrl = DEFAULT_CLERK_SIGN_IN_URL,
}) {
  const normalizedUrl = String(supabaseUrl || '').trim().replace(/\/$/, '');
  const normalizedKey = String(supabaseAnonKey || '').trim();
  const normalizedClerkKey = String(clerkPublishableKey || '').trim();
  const normalizedClerkSyncHost = String(clerkSyncHost || DEFAULT_CLERK_SYNC_HOST).trim().replace(/\/$/, '');
  const normalizedClerkSignInUrl = String(clerkSignInUrl || DEFAULT_CLERK_SIGN_IN_URL).trim();
  let parsedUrl;
  try {
    parsedUrl = new URL(normalizedUrl);
  } catch {
    throw new Error('A valid Supabase URL is required to package the browser extension.');
  }
  if (
    parsedUrl.protocol !== 'https:'
    || parsedUrl.hostname !== FIIP_SUPABASE_HOST
    || parsedUrl.pathname !== '/'
    || !normalizedKey
    || normalizedKey.includes('__FIIP_')
  ) {
    throw new Error('Valid Fiip Supabase public configuration is required to package the browser extension.');
  }
  const parsedClerkHost = new URL(normalizedClerkSyncHost);
  const parsedClerkSignInUrl = new URL(normalizedClerkSignInUrl);
  if (
    parsedClerkHost.protocol !== 'https:'
    || parsedClerkHost.pathname !== '/'
    || !normalizedClerkKey
    || normalizedClerkKey.includes('__FIIP_')
    || parsedClerkSignInUrl.protocol !== 'https:'
    || parsedClerkSignInUrl.username
    || parsedClerkSignInUrl.password
  ) {
    throw new Error('Valid Fiip Clerk public configuration is required to package the browser extension.');
  }

  return [
    'export const FIIP_EXTENSION_CONFIG = Object.freeze({',
    `  supabaseUrl: ${quoteJavaScriptString(normalizedUrl)},`,
    `  supabaseAnonKey: ${quoteJavaScriptString(normalizedKey)},`,
    `  clerkPublishableKey: ${quoteJavaScriptString(normalizedClerkKey)},`,
    `  clerkSyncHost: ${quoteJavaScriptString(normalizedClerkSyncHost)},`,
    `  clerkSignInUrl: ${quoteJavaScriptString(normalizedClerkSignInUrl)},`,
    '});',
    '',
  ].join('\n');
}

function writeRuntimeConfig(targetDir) {
  const source = buildBrowserExtensionConfigSource({
    supabaseUrl: process.env.VITE_SUPABASE_URL || `https://${FIIP_SUPABASE_HOST}`,
    supabaseAnonKey: process.env.VITE_SUPABASE_ANON_KEY,
    clerkPublishableKey: process.env.VITE_CLERK_PUBLISHABLE_KEY,
    clerkSyncHost: process.env.VITE_CLERK_SYNC_HOST || DEFAULT_CLERK_SYNC_HOST,
    clerkSignInUrl: process.env.VITE_CLERK_SIGN_IN_URL || DEFAULT_CLERK_SIGN_IN_URL,
  });
  writeFileSync(join(targetDir, 'extension-config.js'), source);
}

function bundleBackgroundWorker(targetDir) {
  const { buildSync } = require('esbuild');
  const bundledWorker = join(targetDir, 'background.bundle.js');
  buildSync({
    entryPoints: [join(targetDir, 'background.js')],
    outfile: bundledWorker,
    bundle: true,
    format: 'esm',
    platform: 'browser',
    target: 'chrome102',
    logLevel: 'silent',
  });
  rmSync(join(targetDir, 'background.js'), { force: true });
  writeFileSync(join(targetDir, 'background.js'), readFileSync(bundledWorker, 'utf8'));
  rmSync(bundledWorker, { force: true });
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
    writeRuntimeConfig(target);
    setManifestVersion(target, getRequestedVersion());
    bundleBackgroundWorker(target);
    zipDirectory(target, join(outputDir, `Fiip-Web-Clipper-${store}.zip`));
  }

  rmSync(workDir, { recursive: true, force: true });
  console.log(`Browser extension packages created in ${outputDir}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  packageBrowserExtensions();
}
