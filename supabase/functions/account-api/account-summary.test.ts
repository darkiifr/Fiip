import { deepStrictEqual } from "node:assert/strict";

import { buildFamilyMemberLicense, resolveAiUsageScope } from "./account-summary.ts";

Deno.test("account AI usage follows the shared family group budget", () => {
  deepStrictEqual(
    resolveAiUsageScope({ family_group: { id: "family-1" } }, "user-1"),
    { column: "family_group_id", value: "family-1" },
  );
  deepStrictEqual(
    resolveAiUsageScope({ family_group: null }, "user-1"),
    { column: "user_id", value: "user-1" },
  );
});

Deno.test("family member licenses use the owner subscription expiry", () => {
  const license = buildFamilyMemberLicense({
    family_group: { id: "family-1" },
    family_membership: {
      id: "member-1",
      user_id: "user-1",
      status: "active",
      expires_at: "2026-07-20T00:00:00.000Z",
    },
    family_license: {
      id: "license-1",
      tier: "family_pro",
      status: "active",
      renews_at: "2026-08-15T00:00:00.000Z",
      expires_at: "2026-08-15T00:00:00.000Z",
      family_slots: 8,
      billing_interval: "monthly",
    },
  });

  deepStrictEqual(license, {
    id: "family-membership:member-1",
    user_id: "user-1",
    tier: "family_pro",
    status: "active",
    keyauth_level: 4,
    keyauth_license_key: null,
    device_limit: null,
    sharing_enabled: true,
    ai_enabled: true,
    ocr_limit: null,
    family_slots: 8,
    family_group_id: "family-1",
    billing_interval: "monthly",
    expires_at: "2026-08-15T00:00:00.000Z",
    renews_at: "2026-08-15T00:00:00.000Z",
    is_family_member_license: true,
  });
});
