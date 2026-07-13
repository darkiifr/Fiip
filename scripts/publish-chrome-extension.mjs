import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function requireEnv(name) {
  const value = String(process.env[name] || '').trim();
  if (!value) {
    throw new Error(`${name} is required to publish the Chrome Web Store extension.`);
  }
  return value;
}

async function readJsonResponse(response) {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

async function assertOk(response, action) {
  const body = await readJsonResponse(response);
  if (!response.ok) {
    throw new Error(`${action} failed (${response.status}): ${JSON.stringify(body)}`);
  }
  return body;
}

async function getAccessToken() {
  const body = new URLSearchParams({
    client_id: requireEnv('CHROME_WEBSTORE_CLIENT_ID'),
    client_secret: requireEnv('CHROME_WEBSTORE_CLIENT_SECRET'),
    refresh_token: requireEnv('CHROME_WEBSTORE_REFRESH_TOKEN'),
    grant_type: 'refresh_token',
  });

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const result = await assertOk(response, 'Chrome Web Store token refresh');
  if (!result.access_token) {
    throw new Error('Chrome Web Store token refresh did not return an access token.');
  }
  return result.access_token;
}

async function publishChromeExtension({
  publisherId,
  extensionId,
  zipPath,
  accessToken,
}) {
  const zipBuffer = readFileSync(zipPath);
  const baseUrl = `https://chromewebstore.googleapis.com/v2/publishers/${encodeURIComponent(publisherId)}/items/${encodeURIComponent(extensionId)}`;

  const uploadResponse = await fetch(`https://chromewebstore.googleapis.com/upload/v2/publishers/${encodeURIComponent(publisherId)}/items/${encodeURIComponent(extensionId)}:upload`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/zip',
    },
    body: zipBuffer,
  });
  const uploadResult = await assertOk(uploadResponse, 'Chrome Web Store upload');
  console.log(`Chrome Web Store upload accepted: ${JSON.stringify(uploadResult)}`);

  const publishResponse = await fetch(`${baseUrl}:publish`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const publishResult = await assertOk(publishResponse, 'Chrome Web Store publish');
  console.log(`Chrome Web Store publish submitted: ${JSON.stringify(publishResult)}`);
}

async function main() {
  const zipPath = resolve(root, process.env.CHROME_EXTENSION_ZIP || 'dist/extensions/Fiip-Web-Clipper-Chrome.zip');
  const accessToken = await getAccessToken();
  await publishChromeExtension({
    publisherId: requireEnv('CHROME_WEBSTORE_PUBLISHER_ID'),
    extensionId: requireEnv('CHROME_WEBSTORE_EXTENSION_ID'),
    zipPath,
    accessToken,
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
