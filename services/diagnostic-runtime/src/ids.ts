const globalCrypto = (globalThis as unknown as { crypto?: { randomUUID?: () => string } })
  .crypto;

/**
 * UUID v4. Uses Web Crypto (present in Node 20+ and browsers); falls back to a
 * non-cryptographic generator only if it is somehow unavailable. Kept local so
 * this package needs no `@types/node`.
 */
export function randomUuid(): string {
  if (globalCrypto?.randomUUID) {
    return globalCrypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const random = (Math.random() * 16) | 0;
    const value = char === "x" ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}
