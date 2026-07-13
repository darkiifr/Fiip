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

function findGoogleErrorInfo(value) {
  const details = Array.isArray(value?.error?.details) ? value.error.details : [];
  return details.find((detail) => detail?.['@type'] === 'type.googleapis.com/google.rpc.ErrorInfo') || null;
}

export function getChromeWebStoreSetupHint(body) {
  const errorInfo = findGoogleErrorInfo(body);
  const reason = String(errorInfo?.reason || '').trim();
  const activationUrl = String(errorInfo?.metadata?.activationUrl || '').trim();
  const service = String(errorInfo?.metadata?.service || '').trim();

  if (reason === 'SERVICE_DISABLED' && service === 'chromewebstore.googleapis.com') {
    return [
      'Chrome Web Store API is disabled for the configured Google Cloud project.',
      activationUrl ? `Enable it here: ${activationUrl}` : 'Enable chromewebstore.googleapis.com in Google Cloud Console.',
      'The extension ZIP was already attached to the GitHub release; rerun this job after enabling the API to submit it to Chrome Web Store.',
    ].join(' ');
  }

  return '';
}

export function shouldTreatChromeWebStorePublishAsWarning(body) {
  return Boolean(getChromeWebStoreSetupHint(body));
}

async function assertOk(response, action) {
  const body = await readJsonResponse(response);
  if (!response.ok) {
    const setupHint = getChromeWebStoreSetupHint(body);
    if (setupHint) {
      const error = new Error(`${action} requires Chrome Web Store setup: ${setupHint}`);
      error.chromeWebStoreSetupHint = setupHint;
      error.chromeWebStoreStatus = response.status;
      throw error;
    }
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
    if (error?.chromeWebStoreSetupHint && process.env.CHROME_WEBSTORE_STRICT_PUBLISH !== 'true') {
      const message = error.chromeWebStoreSetupHint;
      console.warn(`::warning title=Chrome Web Store publication skipped::${message}`);
      console.warn(message);
      process.exit(0);
    }
    console.error(error);
    process.exit(1);
  });
}
