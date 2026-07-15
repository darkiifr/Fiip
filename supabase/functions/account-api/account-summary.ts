export function resolveAiUsageScope(familyState: any, userId: string) {
  const familyGroupId = familyState?.family_group?.id;
  return familyGroupId
    ? { column: "family_group_id", value: familyGroupId }
    : { column: "user_id", value: userId };
}

export function buildFamilyMemberLicense(family: any) {
  const membership = family?.family_membership;
  const familyGroup = family?.family_group;
  if (!membership || membership.status !== "active" || !familyGroup?.id) return null;

  const ownerLicense = family?.family_license || {};
  const renewalDate = ownerLicense.renews_at || ownerLicense.expires_at || null;

  return {
    id: `family-membership:${membership.id || familyGroup.id}`,
    user_id: membership.user_id,
    tier: "family_pro",
    status: "active",
    keyauth_level: Number(ownerLicense.keyauth_level || 4),
    keyauth_license_key: null,
    device_limit: ownerLicense.device_limit ?? null,
    sharing_enabled: ownerLicense.sharing_enabled ?? true,
    ai_enabled: ownerLicense.ai_enabled ?? true,
    ocr_limit: ownerLicense.ocr_limit ?? null,
    family_slots: Number(ownerLicense.family_slots || 5),
    family_group_id: familyGroup.id,
    billing_interval: ownerLicense.billing_interval || null,
    expires_at: renewalDate,
    renews_at: ownerLicense.renews_at || renewalDate,
    is_family_member_license: true,
  };
}
