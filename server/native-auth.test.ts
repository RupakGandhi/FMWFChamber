import { describe, expect, it } from "vitest";
import {
  generateTemporaryPassword,
  hashPassword,
  normalizeUsername,
  validatePasswordPolicy,
  validateUsername,
  verifyPassword,
} from "./nativeAuth";

describe("native Chamber staff authentication", () => {
  it("normalizes usernames consistently", () => {
    expect(normalizeUsername("  Setareh.Campion  ")).toBe("setareh.campion");
  });

  it("accepts supported usernames and rejects ambiguous or unsafe values", () => {
    expect(validateUsername("setareh.campion")).toBeNull();
    expect(validateUsername("ab")).toMatch(/3-64/);
    expect(validateUsername("staff@example.com")).toMatch(/letters, numbers/);
  });

  it("enforces the full password policy", () => {
    expect(validatePasswordPolicy("ValidNative!2027")).toBeNull();
    expect(validatePasswordPolicy("short")).toMatch(/12 and 128/);
    expect(validatePasswordPolicy("alllowercasepassword1")).toMatch(/uppercase/);
  });

  it("hashes and verifies a valid password without retaining plaintext", async () => {
    const password = "NativeAccount!2027";
    const encoded = await hashPassword(password);
    expect(encoded).toMatch(/^scrypt:v1:/);
    expect(encoded).not.toContain(password);
    await expect(verifyPassword(password, encoded)).resolves.toBe(true);
  });

  it("uses a random salt for every password hash", async () => {
    const first = await hashPassword("SamePassword!2027");
    const second = await hashPassword("SamePassword!2027");
    expect(first).not.toBe(second);
  });

  it("rejects wrong passwords and malformed hashes", async () => {
    const encoded = await hashPassword("CorrectPassword!2027");
    await expect(verifyPassword("WrongPassword!2027", encoded)).resolves.toBe(false);
    await expect(verifyPassword("anything", "not-a-valid-hash")).resolves.toBe(false);
  });

  it("generates policy-compliant temporary passwords", () => {
    const password = generateTemporaryPassword();
    expect(validatePasswordPolicy(password)).toBeNull();
  });
});
