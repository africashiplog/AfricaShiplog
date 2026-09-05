import { describe, it, expect, beforeAll } from "vitest";

beforeAll(() => {
  process.env.SECRETS_ENCRYPTION_KEY = "0".repeat(64);
});

describe("crypto secret encryption", () => {
  it("round-trips a plaintext secret through encrypt/decrypt", async () => {
    const { encryptSecret, decryptSecret } = await import("./crypto");
    const plain = "super-secret-whatsapp-token-12345";
    const encrypted = encryptSecret(plain);
    expect(encrypted).not.toContain(plain);
    expect(decryptSecret(encrypted)).toBe(plain);
  });

  it("produces a different ciphertext each time (random IV)", async () => {
    const { encryptSecret } = await import("./crypto");
    const a = encryptSecret("same-value");
    const b = encryptSecret("same-value");
    expect(a).not.toBe(b);
  });

  it("masks a secret to only its last 4 characters", async () => {
    const { maskSecret } = await import("./crypto");
    expect(maskSecret("EAAGm0abc123XYZ9")).toBe("••••XYZ9");
  });
});
