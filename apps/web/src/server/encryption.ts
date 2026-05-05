/**
 * AES-256-GCM encryption for sensitive data at rest (OAuth tokens, etc.).
 * Uses ENCRYPTION_KEY env var (32-byte hex string).
 * Falls back to no-op if key is not configured (dev mode).
 */

import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

function getKey(): Buffer | null {
  const hex = process.env.ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) return null;
  return Buffer.from(hex, "hex");
}

/**
 * Encrypt a plaintext string. Returns "enc:<iv>:<tag>:<ciphertext>" in hex.
 * Returns the original string unchanged if ENCRYPTION_KEY is not set.
 */
export function encrypt(plaintext: string): string {
  const key = getKey();
  if (!key) return plaintext;

  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `enc:${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
}

/**
 * Decrypt a previously encrypted string. Handles both encrypted and plaintext inputs.
 * Returns the original string if it wasn't encrypted or ENCRYPTION_KEY is not set.
 */
export function decrypt(ciphertext: string): string {
  if (!ciphertext.startsWith("enc:")) return ciphertext;

  const key = getKey();
  if (!key) return ciphertext;

  const parts = ciphertext.split(":");
  if (parts.length !== 4) return ciphertext;

  const iv = Buffer.from(parts[1]!, "hex");
  const tag = Buffer.from(parts[2]!, "hex");
  const encrypted = Buffer.from(parts[3]!, "hex");

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);

  return decrypted.toString("utf8");
}
