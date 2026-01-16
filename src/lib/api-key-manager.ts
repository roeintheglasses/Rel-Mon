import { createHash, randomBytes } from "crypto";

const API_KEY_PREFIX = "relmon_";
const API_KEY_LENGTH = 32; // bytes, will be base64 encoded
const HASH_ALGORITHM = "sha256";

/**
 * Generates a new API key with prefix
 * Returns the plaintext key which should be shown to the user once
 * The hashed version should be stored in the database using hashApiKey()
 */
export function generateApiKey(): string {
  const randomKey = randomBytes(API_KEY_LENGTH).toString("base64url");
  return `${API_KEY_PREFIX}${randomKey}`;
}

/**
 * Hashes an API key for secure storage in the database
 * Uses SHA-256 to create a one-way hash
 */
export function hashApiKey(plainKey: string): string {
  if (!plainKey || typeof plainKey !== "string") {
    throw new Error("Invalid API key: must be a non-empty string");
  }

  if (!plainKey.startsWith(API_KEY_PREFIX)) {
    throw new Error(`Invalid API key format: must start with ${API_KEY_PREFIX}`);
  }

  const hash = createHash(HASH_ALGORITHM);
  hash.update(plainKey);
  return hash.digest("hex");
}

/**
 * Verifies a plaintext API key against a hashed key
 * Returns true if the keys match, false otherwise
 */
export function verifyApiKey(plainKey: string, hashedKey: string): boolean {
  if (!plainKey || !hashedKey) {
    return false;
  }

  try {
    const computedHash = hashApiKey(plainKey);
    return computedHash === hashedKey;
  } catch (error) {
    // Invalid key format or hashing error
    return false;
  }
}
