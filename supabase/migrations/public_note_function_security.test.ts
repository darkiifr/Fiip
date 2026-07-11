import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';

const migrationPath = new URL('./20260707030000_selected_license_and_public_note_hardening.sql', import.meta.url);

Deno.test('public note RPC stays parameterized and does not use dynamic SQL', async () => {
  const sql = await Deno.readTextFile(migrationPath);
  const fnStart = sql.indexOf('create or replace function public.get_public_note_by_slug');
  const fnEnd = sql.indexOf('revoke all on function public.get_public_note_by_slug');
  assert(fnStart >= 0, 'get_public_note_by_slug function must exist');
  assert(fnEnd > fnStart, 'function grant block must follow function definition');

  const functionSql = sql.slice(fnStart, fnEnd).toLowerCase();
  assert(functionSql.includes('where n.public_slug = p_slug'), 'slug must be compared through the SQL parameter');
  assertEquals(/\bexecute\b/.test(functionSql), false, 'public note RPC must not use dynamic EXECUTE SQL');
  assertEquals(/\bformat\s*\(/.test(functionSql), false, 'public note RPC must not build SQL with format()');
  assertEquals(/\|\|/.test(functionSql), false, 'public note RPC must not concatenate SQL fragments');
});
