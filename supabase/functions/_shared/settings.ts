export type SettingEnvelope = Record<string, {
  ciphertext?: string;
  value?: unknown;
  updatedAt: string;
}>;

export function mergeSettings(remote: SettingEnvelope = {}, incoming: SettingEnvelope = {}) {
  const merged: SettingEnvelope = { ...remote };
  for (const [key, next] of Object.entries(incoming || {})) {
    const previous = merged[key];
    if (!previous || new Date(next?.updatedAt || 0).getTime() >= new Date(previous?.updatedAt || 0).getTime()) {
      merged[key] = next;
    }
  }
  return merged;
}
