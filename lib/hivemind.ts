export function hasHivemindCredentials(): boolean {
  return Boolean(process.env.HIVEMIND_API_KEY);
}
