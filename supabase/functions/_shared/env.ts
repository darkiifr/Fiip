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

export function getFirstEnv(names: string[], required = true) {
  for (const name of names) {
    const value = Deno.env.get(name) || '';
    if (value) return value;
  }
  if (required) {
    throw new Error(`${names.join(' or ')} is not configured`);
  }
  return '';
}
