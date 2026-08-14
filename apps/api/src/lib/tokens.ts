import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

/** TTLs for the various single-use tokens (ms). */
export const TOKEN_TTLS = {
  EMAIL_VERIFICATION: 24 * 60 * 60 * 1000, // 24 hours
  PASSWORD_RESET: 60 * 60 * 1000, // 1 hour
  EMAIL_CHANGE: 60 * 60 * 1000, // 1 hour
  ACCOUNT_DELETION: 15 * 24 * 60 * 60 * 1000, // 15 days
} as const;

/** Generates a random, unpredictable token (32 bytes, hex). Never persisted in plaintext. */
export function generateToken(): string {
  return randomBytes(32).toString("hex");
}

/** SHA-256 hash of the token — the only form stored in the database. */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Timing-safe comparison of a provided token against a stored hash. */
export function tokenMatches(token: string, tokenHash: string): boolean {
  const a = Buffer.from(hashToken(token), "hex");
  const b = Buffer.from(tokenHash, "hex");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
