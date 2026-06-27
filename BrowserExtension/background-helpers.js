const FIIP_CLIP_DEEP_LINK = 'fiip://clip';

export function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function assertHttpUrl(value) {
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('Unsupported source URL.');
  }
  return url.toString();
}

export function buildDeepLinkUrl(payload) {
  const encoded = encodeURIComponent(JSON.stringify(payload));
  return `${FIIP_CLIP_DEEP_LINK}?payload=${encoded}`;
}

export function buildSupabaseNotePayload(
  payload,
  {
    randomUUID = () => crypto.randomUUID(),
    now = () => new Date(),
  } = {},
) {
  const sourceUrl = assertHttpUrl(payload.url);

  return {
    title: payload.title,
    content: `${payload.html}<p><a href="${sourceUrl}" rel="noreferrer">Source: ${escapeHtml(sourceUrl)}</a></p>`,
    tags: [{ id: 'tag-web-clip', label: 'Web clip', icon: 'Tag', color: 4 }],
    attachments: (Array.isArray(payload.images) ? payload.images : []).map((url, index) => ({
      id: randomUUID(),
      name: `capture-${index + 1}`,
      type: 'image',
      url,
      previewable: true,
    })),
    updated_at: now().toISOString(),
  };
}

export async function sendToDeepLink(payload, { openTab }) {
  await openTab({ url: buildDeepLinkUrl(payload), active: false });
  return { mode: 'deep-link' };
}

export async function sendToSupabase(
  payload,
  {
    fetchImpl = fetch,
    storageGet,
    randomUUID,
    now,
  },
) {
  const { supabaseUrl, supabaseAnonKey, accessToken } = await storageGet([
    'supabaseUrl',
    'supabaseAnonKey',
    'accessToken',
  ]);

  if (!supabaseUrl || !supabaseAnonKey || !accessToken) {
    throw new Error('Supabase fallback is not configured.');
  }

  const response = await fetchImpl(`${supabaseUrl.replace(/\/$/, '')}/rest/v1/notes`, {
    method: 'POST',
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(buildSupabaseNotePayload(payload, { randomUUID, now })),
  });

  if (!response.ok) {
    throw new Error(`Supabase fallback failed (${response.status}).`);
  }

  return { mode: 'supabase', data: await response.json() };
}

export async function saveClip(
  payload,
  {
    openTab,
    fetchImpl,
    storageGet,
    randomUUID,
    now,
  },
) {
  try {
    return await sendToDeepLink(payload, { openTab });
  } catch {
    return sendToSupabase(payload, {
      fetchImpl,
      storageGet,
      randomUUID,
      now,
    });
  }
}
