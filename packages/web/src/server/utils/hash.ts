/** Hash a key using SHA-256 */
export function hashKey(key: string): string {
  const h = new Bun.CryptoHasher("sha256");
  h.update(key);
  return h.digest("hex");
}
