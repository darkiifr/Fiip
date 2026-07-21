const FIIP_CLIP_DEEP_LINK = 'fiip://clip';
const SESSION_KEY = 'fiipSupabaseSession';
const SESSION_EXPIRY_MARGIN_MS = 60_000;

function createExtensionError(message, code) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function getConfig(config = {}) {
  const supabaseUrl = String(config.supabaseUrl || '').trim().replace(/\/$/, '');
  const supabaseAnonKey = String(config.supabaseAnonKey || '').trim();
  const clerkPublishableKey = String(config.clerkPublishableKey || '').trim();
  const clerkSyncHost = String(config.clerkSyncHost || '').trim().replace(/\/$/, '');
  const clerkSignInUrl = String(config.clerkSignInUrl || '').trim();
  let parsedUrl;
  try {
    parsedUrl = new URL(supabaseUrl);
  } catch {
    throw createExtensionError('Fiip Cloud is not configured.', 'SUPABASE_CONFIG_MISSING');
  }
  if (parsedUrl.protocol !== 'https:' || parsedUrl.pathname !== '/' || !supabaseAnonKey) {
    throw createExtensionError('Fiip Cloud is not configured.', 'SUPABASE_CONFIG_MISSING');
  }
  if (clerkSyncHost) {
    const parsedSyncHost = new URL(clerkSyncHost);
    if (parsedSyncHost.protocol !== 'https:' || parsedSyncHost.pathname !== '/') {
      throw createExtensionError('Fiip Clerk is not configured.', 'CLERK_CONFIG_MISSING');
    }
  }
  if (clerkSignInUrl) {
    const parsedSignInUrl = new URL(clerkSignInUrl);
    if (parsedSignInUrl.protocol !== 'https:' || parsedSignInUrl.username || parsedSignInUrl.password) {
      throw createExtensionError('Fiip Clerk is not configured.', 'CLERK_CONFIG_MISSING');
    }
  }
  return { supabaseUrl, supabaseAnonKey, clerkPublishableKey, clerkSyncHost, clerkSignInUrl };
}

function nowMs(now = Date.now) {
  const value = now();
  return value instanceof Date ? value.getTime() : Number(value);
}

async function readResponseJson(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function normalizeSession(data, now = Date.now) {
  if (!data?.access_token || !data?.refresh_token || !data?.user?.id) {
    throw createExtensionError('Supabase returned an incomplete session.', 'AUTH_SESSION_INVALID');
  }
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: nowMs(now) + Math.max(1, Number(data.expires_in) || 3600) * 1000,
    user: {
      id: data.user.id,
      email: String(data.user.email || ''),
    },
  };
}

async function requestAuthSession(grantType, body, {
  config,
  fetchImpl = fetch,
  storageSet,
  now = Date.now,
}) {
  const { supabaseUrl, supabaseAnonKey } = getConfig(config);
  const response = await fetchImpl(`${supabaseUrl}/auth/v1/token?grant_type=${grantType}`, {
    method: 'POST',
    headers: {
      apikey: supabaseAnonKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const data = await readResponseJson(response);
  if (!response.ok) {
    throw createExtensionError(
      data?.error_description || data?.msg || data?.message || 'Connexion Fiip impossible.',
      'AUTH_FAILED',
    );
  }
  const session = normalizeSession(data, now);
  await storageSet({ [SESSION_KEY]: session });
  return session;
}

export async function signInWithPassword({ email, password }, dependencies) {
  const normalizedEmail = String(email || '').trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail) || !String(password || '')) {
    throw createExtensionError('Adresse e-mail ou mot de passe invalide.', 'AUTH_INPUT_INVALID');
  }
  const session = await requestAuthSession('password', {
    email: normalizedEmail,
    password: String(password),
  }, dependencies);
  return { user: session.user };
}

export function getClerkSignInUrl(config = {}) {
  const { clerkSignInUrl } = getConfig(config);
  if (!clerkSignInUrl) {
    throw createExtensionError('Fiip Clerk is not configured.', 'CLERK_CONFIG_MISSING');
  }
  const url = new URL(clerkSignInUrl);
  url.searchParams.set('redirect_url', 'https://accounts.fiip.fr/account');
  return url.toString();
}

async function refreshSession(session, dependencies) {
  if (!session?.refreshToken) {
    throw createExtensionError('Connectez-vous à Fiip Cloud.', 'AUTH_REQUIRED');
  }
  return requestAuthSession('refresh_token', {
    refresh_token: session.refreshToken,
  }, dependencies);
}

async function getValidSession({
  config,
  createClerkSession,
  fetchImpl = fetch,
  storageGet,
  storageSet,
  now = Date.now,
}) {
  const normalizedConfig = getConfig(config);
  if (normalizedConfig.clerkPublishableKey && typeof createClerkSession === 'function') {
    const clerkSession = await createClerkSession();
    if (!clerkSession?.token || !clerkSession?.user?.id) {
      throw createExtensionError('Connectez-vous à Fiip Cloud.', 'AUTH_REQUIRED');
    }
    const response = await fetchImpl(`${normalizedConfig.supabaseUrl}/functions/v1/identity-bootstrap`, {
      method: 'POST',
      headers: {
        apikey: normalizedConfig.supabaseAnonKey,
        Authorization: `Bearer ${clerkSession.token}`,
        'Content-Type': 'application/json',
      },
      body: '{}',
    });
    const data = await readResponseJson(response);
    if (!response.ok || !data?.userId) {
      throw createExtensionError('Connexion Fiip Cloud impossible.', 'AUTH_FAILED');
    }
    return {
      accessToken: clerkSession.token,
      refreshToken: '',
      expiresAt: nowMs(now) + 300_000,
      user: {
        id: data.userId,
        clerkSubject: clerkSession.user.id,
        email: String(clerkSession.user.email || ''),
      },
    };
  }
  const stored = await storageGet([SESSION_KEY]);
  const session = stored?.[SESSION_KEY];
  if (!session?.accessToken || !session?.user?.id) {
    throw createExtensionError('Connectez-vous à Fiip Cloud.', 'AUTH_REQUIRED');
  }
  if (Number(session.expiresAt) > nowMs(now) + SESSION_EXPIRY_MARGIN_MS) {
    return session;
  }
  return refreshSession(session, { config, fetchImpl, storageSet, now });
}

export async function getAuthState(dependencies) {
  try {
    const session = await getValidSession(dependencies);
    return { authenticated: true, user: session.user };
  } catch (error) {
    if (['AUTH_REQUIRED', 'AUTH_FAILED', 'SUPABASE_CONFIG_MISSING'].includes(error?.code)) {
      return { authenticated: false, error: error.message };
    }
    throw error;
  }
}

export async function signOut({
  config,
  clerkSignOut,
  fetchImpl = fetch,
  storageGet,
  storageRemove,
}) {
  const normalizedConfig = getConfig(config);
  if (normalizedConfig.clerkPublishableKey && typeof clerkSignOut === 'function') {
    await clerkSignOut();
    await storageRemove([SESSION_KEY]);
    return { authenticated: false };
  }
  const stored = await storageGet([SESSION_KEY]);
  const session = stored?.[SESSION_KEY];
  try {
    if (session?.accessToken) {
      const { supabaseUrl, supabaseAnonKey } = getConfig(config);
      await fetchImpl(`${supabaseUrl}/auth/v1/logout`, {
        method: 'POST',
        headers: {
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${session.accessToken}`,
        },
      });
    }
  } finally {
    await storageRemove([SESSION_KEY]);
  }
  return { authenticated: false };
}

function sanitizeHtml(value = '') {
  if (typeof document === 'undefined') {
    return escapeHtml(value);
  }

  const template = document.createElement('template');
  template.innerHTML = String(value);
  template.content.querySelectorAll('script, style, iframe, object, embed, noscript').forEach((item) => item.remove());
  template.content.querySelectorAll('*').forEach((item) => {
    [...item.attributes].forEach((attr) => {
      const attrName = attr.name.toLowerCase();
      const attrValue = String(attr.value || '').trim();
      if (attrName.startsWith('on') || /^(?:javascript|data):/i.test(attrValue)) {
        item.removeAttribute(attr.name);
      }
    });
  });
  return template.innerHTML;
}

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
    userId,
    randomUUID = () => crypto.randomUUID(),
    now = () => new Date(),
  } = {},
) {
  const sourceUrl = assertHttpUrl(payload.url);
  if (!userId) {
    throw createExtensionError('Connectez-vous à Fiip Cloud.', 'AUTH_REQUIRED');
  }
  const timestamp = now().toISOString();

  return {
    id: randomUUID(),
    user_id: userId,
    title: payload.title,
    content: `${sanitizeHtml(payload.html)}<p><a href="${sourceUrl}" rel="noreferrer">Source: ${escapeHtml(sourceUrl)}</a></p>`,
    tags: [{ id: 'tag-web-clip', label: 'Web clip', icon: 'Tag', color: 4 }],
    attachments: (Array.isArray(payload.images) ? payload.images : []).map((url, index) => ({
      id: randomUUID(),
      name: `capture-${index + 1}`,
      type: 'image',
      url,
      previewable: true,
    })),
    created_at: timestamp,
    updated_at: timestamp,
  };
}

export async function sendToDeepLink(payload, { openTab }) {
  await openTab({ url: buildDeepLinkUrl(payload), active: true });
  return { mode: 'deep-link' };
}

export async function sendToSupabase(
  payload,
  {
    config,
    createClerkSession,
    fetchImpl = fetch,
    storageGet,
    storageSet,
    randomUUID,
    now,
  },
) {
  const normalizedConfig = getConfig(config);
  let session = await getValidSession({ config, createClerkSession, fetchImpl, storageGet, storageSet, now });
  const notePayload = buildSupabaseNotePayload(payload, {
    userId: session.user.id,
    randomUUID,
    now,
  });
  const postNote = () => fetchImpl(`${normalizedConfig.supabaseUrl}/rest/v1/notes`, {
    method: 'POST',
    headers: {
      apikey: normalizedConfig.supabaseAnonKey,
      Authorization: `Bearer ${session.accessToken}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(notePayload),
  });

  let response = await postNote();
  if (response.status === 401 && session.refreshToken) {
    session = await refreshSession(session, { config, fetchImpl, storageSet, now });
    response = await postNote();
  }

  if (!response.ok) {
    throw new Error(`Supabase fallback failed (${response.status}).`);
  }

  const data = await response.json();
  const noteId = Array.isArray(data) ? data[0]?.id : data?.id;
  if (!noteId) {
    throw new Error('Supabase did not return the created note.');
  }
  return {
    mode: 'supabase',
    data,
    noteId,
    openUrl: `${FIIP_CLIP_DEEP_LINK}?noteId=${encodeURIComponent(noteId)}`,
  };
}

export async function saveClip(
  payload,
  {
    config,
    createClerkSession,
    fetchImpl,
    storageGet,
    storageSet,
    randomUUID,
    now,
  },
) {
  try {
    return await sendToSupabase(payload, {
      config,
      createClerkSession,
      fetchImpl,
      storageGet,
      storageSet,
      randomUUID,
      now,
    });
  } catch (error) {
    if (['AUTH_REQUIRED', 'SUPABASE_CONFIG_MISSING'].includes(error?.code)) {
      return { mode: 'deep-link', openUrl: buildDeepLinkUrl(payload) };
    }
    return {
      mode: 'deep-link',
      openUrl: buildDeepLinkUrl(payload),
      warning: 'La synchronisation cloud est indisponible. Ouvrez Fiip pour importer cette capture.',
    };
  }
}
