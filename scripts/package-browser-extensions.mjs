import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { platform } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sourceDir = join(root, 'BrowserExtension');
const outputDir = join(root, 'dist', 'extensions');
const workDir = join(outputDir, 'work');

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
    zipDirectory(target, join(outputDir, `Fiip-Web-Clipper-${store}.zip`));
  }

  rmSync(workDir, { recursive: true, force: true });
  console.log(`Browser extension packages created in ${outputDir}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  packageBrowserExtensions();
}
