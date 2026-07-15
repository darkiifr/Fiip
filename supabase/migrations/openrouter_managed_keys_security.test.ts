import { assert, assertStringIncludes } from 'https://deno.land/std@0.224.0/assert/mod.ts';

const sql = await Deno.readTextFile(
  new URL('./20260715170000_openrouter_managed_keys.sql', import.meta.url),
);

Deno.test('managed OpenRouter keys use Vault and remain service-role only', () => {
  assertStringIncludes(sql, 'vault.create_secret');
  assertStringIncludes(sql, 'join vault.decrypted_secrets');
  assertStringIncludes(
    sql,
    'alter table public.openrouter_managed_keys enable row level security',
  );
  assertStringIncludes(
    sql,
    'revoke all on public.openrouter_managed_keys from authenticated',
  );
  assertStringIncludes(
    sql,
    'grant execute on function public.fiip_get_openrouter_managed_key(uuid, uuid) to service_role',
  );
  assert(
    !sql.includes(
      'grant execute on function public.fiip_get_openrouter_managed_key(uuid, uuid) to authenticated',
    ),
  );
});
