import { assertStringIncludes } from 'jsr:@std/assert';

const sql = await Deno.readTextFile(new URL('./20260721233000_trial_and_shared_family_quotas.sql', import.meta.url));

Deno.test('trial is one-time, server-owned and expires into free access', () => {
  assertStringIncludes(sql, "profile.trial_consumed_at is null");
  assertStringIncludes(sql, "when profile.plan_source = 'trial' then 0");
  assertStringIncludes(sql, 'revoke update (trial_started_at, trial_ends_at, trial_consumed_at)');
});

Deno.test('Family Pro note and attachment usage is aggregated by family membership', () => {
  assertStringIncludes(sql, "limits.plan_key = 'family_pro'");
  assertStringIncludes(sql, 'fiip_private.is_family_quota_member(files.owner_id, quota_group)');
  assertStringIncludes(sql, 'fiip_private.is_family_quota_member(notes.user_id, quota_group)');
  assertStringIncludes(sql, 'pg_advisory_xact_lock');
});
