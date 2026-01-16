import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

/**
 * Gets and validates the encryption key from environment variables
 * @returns The encryption key as a Buffer
 * @throws Error if key is not set or has invalid length
 */
function getEncryptionKey(): Buffer {
  const key = process.env.TOKEN_ENCRYPTION_KEY;
  if (!key) {
    throw new Error("TOKEN_ENCRYPTION_KEY environment variable is not set");
  }
  // Key should be base64 encoded 32-byte key
  const keyBuffer = Buffer.from(key, "base64");
  if (keyBuffer.length !== 32) {
    throw new Error("TOKEN_ENCRYPTION_KEY must be a 32-byte base64 encoded key");
  }
  return keyBuffer;
}

/**
 * Encrypts a token using AES-256-GCM encryption
 * @param plaintext - The plaintext token to encrypt
 * @returns The encrypted token in format "iv:authTag:encryptedData" (all base64)
 */
export function encryptToken(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);

  const cipher = createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, "utf8", "base64");
  encrypted += cipher.final("base64");

  const authTag = cipher.getAuthTag();

  // Format: iv:authTag:encryptedData (all base64)
  return `${iv.toString("base64")}:${authTag.toString("base64")}:${encrypted}`;
}

/**
 * Decrypts a token that was encrypted with encryptToken
 * @param encryptedData - The encrypted token string in format "iv:authTag:encryptedData"
 * @returns The decrypted plaintext token
 * @throws Error if data format is invalid or decryption fails
 */
export function decryptToken(encryptedData: string): string {
  const key = getEncryptionKey();

  const parts = encryptedData.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted data format");
  }

  const [ivBase64, authTagBase64, encrypted] = parts;
  const iv = Buffer.from(ivBase64, "base64");
  const authTag = Buffer.from(authTagBase64, "base64");

  if (iv.length !== IV_LENGTH) {
    throw new Error("Invalid IV length");
  }
  if (authTag.length !== AUTH_TAG_LENGTH) {
    throw new Error("Invalid auth tag length");
  }

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, "base64", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

/**
 * Utility to generate a new encryption key (run once to generate)
 * @returns A new 32-byte encryption key encoded as base64
 */
export function generateEncryptionKey(): string {
  return randomBytes(32).toString("base64");
}
