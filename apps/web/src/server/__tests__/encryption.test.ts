import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("encryption", () => {
  const TEST_KEY = "a".repeat(64); // 32-byte hex key

  beforeEach(() => {
    vi.stubEnv("ENCRYPTION_KEY", TEST_KEY);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("should encrypt and decrypt a string", async () => {
    // Re-import to pick up env change
    const { encrypt, decrypt } = await import("../encryption");
    const plaintext = "sk_test_supersecrettoken123";
    const encrypted = encrypt(plaintext);

    expect(encrypted).not.toBe(plaintext);
    expect(encrypted.startsWith("enc:")).toBe(true);

    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(plaintext);
  });

  it("should produce different ciphertexts for same input (random IV)", async () => {
    const { encrypt } = await import("../encryption");
    const plaintext = "same-token";
    const a = encrypt(plaintext);
    const b = encrypt(plaintext);
    expect(a).not.toBe(b);
  });

  it("should pass through plaintext when decrypting unencrypted strings", async () => {
    const { decrypt } = await import("../encryption");
    const plaintext = "not-encrypted-token";
    expect(decrypt(plaintext)).toBe(plaintext);
  });

  it("should pass through when ENCRYPTION_KEY is not set", async () => {
    vi.stubEnv("ENCRYPTION_KEY", "");
    // Need fresh import
    const mod = await import("../encryption");
    const plaintext = "unprotected-token";
    expect(mod.encrypt(plaintext)).toBe(plaintext);
    expect(mod.decrypt(plaintext)).toBe(plaintext);
  });
});
