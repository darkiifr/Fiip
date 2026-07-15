import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';

import { getManagedOpenRouterApiKey, openRouterLimitUsd } from './openrouter-keys.ts';

function rpcClient(
  responses: Record<string, { data: unknown; error?: unknown }>,
) {
  const calls: Array<{ name: string; args: unknown }> = [];
  return {
    calls,
    client: {
      rpc(name: string, args: unknown) {
        calls.push({ name, args });
        return Promise.resolve(responses[name] || { data: null, error: null });
      },
    },
  };
}

Deno.test('openRouterLimitUsd converts the Fiip EUR budget into a bounded USD monthly limit', () => {
  assertEquals(openRouterLimitUsd(2), 2.17);
  assertEquals(openRouterLimitUsd(1.35), 1.46);
});

Deno.test('getManagedOpenRouterApiKey reuses the encrypted family key for every family member', async () => {
  const rpc = rpcClient({
    fiip_get_openrouter_managed_key: {
      data: [{
        api_key: 'sk-family',
        key_hash: 'family-hash',
        key_name: 'Fiip family family-1',
        limit_usd: 2.17,
        limit_reset: 'monthly',
      }],
    },
  });
  let fetchCalled = false;

  const apiKey = await getManagedOpenRouterApiKey({
    supabaseAdmin: rpc.client,
    userId: 'user-1',
    familyGroupId: 'family-1',
    budgetLimitEur: 2,
    managementKey: 'management-secret',
    fetchImpl: () => {
      fetchCalled = true;
      throw new Error('unexpected provider call');
    },
  });

  assertEquals(apiKey, 'sk-family');
  assertEquals(fetchCalled, false);
  assertEquals(rpc.calls[0], {
    name: 'fiip_get_openrouter_managed_key',
    args: { p_user_id: null, p_family_group_id: 'family-1' },
  });
});

Deno.test('getManagedOpenRouterApiKey creates and stores a monthly individual child key', async () => {
  const rpc = rpcClient({
    fiip_get_openrouter_managed_key: { data: [] },
    fiip_store_openrouter_managed_key: {
      data: [{ api_key: 'sk-created', key_hash: 'created-hash' }],
    },
  });
  const requests: Array<{ url: string; init?: RequestInit }> = [];

  const apiKey = await getManagedOpenRouterApiKey({
    supabaseAdmin: rpc.client,
    userId: 'user-12345678',
    familyGroupId: null,
    budgetLimitEur: 1.35,
    managementKey: 'management-secret',
    fetchImpl: (url, init) => {
      requests.push({ url: String(url), init });
      return Promise.resolve(
        new Response(
          JSON.stringify({
            key: 'sk-created',
            data: { hash: 'created-hash' },
          }),
          { status: 201, headers: { 'Content-Type': 'application/json' } },
        ),
      );
    },
  });

  assertEquals(apiKey, 'sk-created');
  assertEquals(requests.length, 1);
  assertEquals(requests[0].url, 'https://openrouter.ai/api/v1/keys');
  assertEquals(requests[0].init?.method, 'POST');
  assertEquals(requests[0].init?.headers, {
    Authorization: 'Bearer management-secret',
    'Content-Type': 'application/json',
  });
  assertEquals(JSON.parse(String(requests[0].init?.body)), {
    name: 'Fiip user user-123',
    limit: 1.46,
    limit_reset: 'monthly',
    include_byok_in_limit: true,
  });
  assertEquals(rpc.calls[1], {
    name: 'fiip_store_openrouter_managed_key',
    args: {
      p_user_id: 'user-12345678',
      p_family_group_id: null,
      p_key_hash: 'created-hash',
      p_plaintext_key: 'sk-created',
      p_key_name: 'Fiip user user-123',
      p_limit_usd: 1.46,
    },
  });
});
