import { deepStrictEqual } from "node:assert/strict";

import { resolveAiUsageScope } from "./account-summary.ts";

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
