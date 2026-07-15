import { getEnv } from './env.ts';

const OPENROUTER_KEYS_URL = 'https://openrouter.ai/api/v1/keys';
const EUR_PER_USD_BUDGET_RATE = 0.92;

interface ManagedKeyRow {
  api_key?: string;
  key_hash?: string;
  key_name?: string;
  limit_usd?: number | string;
  limit_reset?: string;
}

interface ManagedKeyInput {
  supabaseAdmin: any;
  userId: string;
  familyGroupId?: string | null;
  budgetLimitEur: number;
  managementKey?: string;
  fetchImpl?: typeof fetch;
}

function firstRow(data: unknown): ManagedKeyRow | null {
  if (Array.isArray(data)) {
    return (data[0] as ManagedKeyRow | undefined) || null;
  }
  return data && typeof data === 'object' ? data as ManagedKeyRow : null;
}

function principal(input: Pick<ManagedKeyInput, 'userId' | 'familyGroupId'>) {
  if (input.familyGroupId) {
    return {
      userId: null,
      familyGroupId: input.familyGroupId,
      keyName: `Fiip family ${input.familyGroupId.slice(0, 8)}`,
    };
  }
  return {
    userId: input.userId,
    familyGroupId: null,
    keyName: `Fiip user ${input.userId.slice(0, 8)}`,
  };
}

function providerError(payload: any, status: number) {
  return payload?.error?.message || payload?.message ||
    `OpenRouter key management failed (${status})`;
}

async function providerRequest(
  fetchImpl: typeof fetch,
  managementKey: string,
  url: string,
  init: RequestInit,
) {
  const response = await fetchImpl(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${managementKey}`,
      'Content-Type': 'application/json',
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(providerError(payload, response.status));
  return payload;
}

async function deleteProviderKey(
  fetchImpl: typeof fetch,
  managementKey: string,
  keyHash: string,
) {
  await providerRequest(
    fetchImpl,
    managementKey,
    `${OPENROUTER_KEYS_URL}/${encodeURIComponent(keyHash)}`,
    {
      method: 'DELETE',
    },
  ).catch(() => null);
}

export function openRouterLimitUsd(budgetLimitEur: number) {
  const budget = Math.max(0, Number(budgetLimitEur) || 0);
  return Math.floor((budget / EUR_PER_USD_BUDGET_RATE) * 100) / 100;
}

export async function getManagedOpenRouterApiKey(input: ManagedKeyInput) {
  const managementKey = input.managementKey ||
    getEnv('OPENROUTER_MANAGEMENT_KEY');
  const fetchImpl = input.fetchImpl || fetch;
  const owner = principal(input);
  const limitUsd = openRouterLimitUsd(input.budgetLimitEur);
  if (limitUsd <= 0) {
    throw new Error('OpenRouter budget limit must be positive');
  }

  const getArgs = {
    p_user_id: owner.userId,
    p_family_group_id: owner.familyGroupId,
  };
  const { data: existingData, error: existingError } = await input.supabaseAdmin
    .rpc('fiip_get_openrouter_managed_key', getArgs);
  if (existingError) throw existingError;

  const existing = firstRow(existingData);
  if (existing?.api_key && existing.key_hash) {
    const metadataMatches = existing.key_name === owner.keyName &&
      Number(existing.limit_usd) === limitUsd &&
      existing.limit_reset === 'monthly';
    if (!metadataMatches) {
      await providerRequest(
        fetchImpl,
        managementKey,
        `${OPENROUTER_KEYS_URL}/${encodeURIComponent(existing.key_hash)}`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            name: owner.keyName,
            disabled: false,
            limit: limitUsd,
            limit_reset: 'monthly',
            include_byok_in_limit: true,
          }),
        },
      );
      const { error } = await input.supabaseAdmin.rpc(
        'fiip_update_openrouter_managed_key',
        {
          p_key_hash: existing.key_hash,
          p_key_name: owner.keyName,
          p_limit_usd: limitUsd,
        },
      );
      if (error) throw error;
    }
    return existing.api_key;
  }

  const created = await providerRequest(
    fetchImpl,
    managementKey,
    OPENROUTER_KEYS_URL,
    {
      method: 'POST',
      body: JSON.stringify({
        name: owner.keyName,
        limit: limitUsd,
        limit_reset: 'monthly',
        include_byok_in_limit: true,
      }),
    },
  );
  const plaintextKey = String(created?.key || '');
  const keyHash = String(created?.data?.hash || '');
  if (!plaintextKey || !keyHash) {
    throw new Error('OpenRouter did not return the created child key');
  }

  let stored: ManagedKeyRow | null = null;
  try {
    const { data, error } = await input.supabaseAdmin.rpc(
      'fiip_store_openrouter_managed_key',
      {
        p_user_id: owner.userId,
        p_family_group_id: owner.familyGroupId,
        p_key_hash: keyHash,
        p_plaintext_key: plaintextKey,
        p_key_name: owner.keyName,
        p_limit_usd: limitUsd,
      },
    );
    if (error) throw error;
    stored = firstRow(data);
  } catch (error) {
    await deleteProviderKey(fetchImpl, managementKey, keyHash);
    throw error;
  }

  if (!stored?.api_key || !stored.key_hash) {
    await deleteProviderKey(fetchImpl, managementKey, keyHash);
    throw new Error('The managed OpenRouter key could not be stored');
  }
  if (stored.key_hash !== keyHash) {
    await deleteProviderKey(fetchImpl, managementKey, keyHash);
  }
  return stored.api_key;
}
