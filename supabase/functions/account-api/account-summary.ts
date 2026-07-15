export function resolveAiUsageScope(familyState: any, userId: string) {
  const familyGroupId = familyState?.family_group?.id;
  return familyGroupId
    ? { column: "family_group_id", value: familyGroupId }
    : { column: "user_id", value: userId };
}
