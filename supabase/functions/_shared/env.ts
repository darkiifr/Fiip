export function getEnv(name: string, required = true) {
  const value = Deno.env.get(name) || '';
  if (required && !value) {
    throw new Error(`${name} is not configured`);
  }
  return value;
}

export function getOptionalEnv(name: string) {
  return getEnv(name, false);
}
