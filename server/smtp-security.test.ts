import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { decryptSmtpPassword, encryptSmtpPassword } from "./smtpService";

describe("SMTP credential encryption", () => {
  const originalSecret = process.env.JWT_SECRET;

  beforeEach(() => {
    process.env.JWT_SECRET = "smtp-security-test-secret-that-is-not-production";
  });

  afterEach(() => {
    if (originalSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = originalSecret;
  });

  it("encrypts a password with authenticated encryption and decrypts it exactly", () => {
    const encrypted = encryptSmtpPassword("correct horse battery staple");

    expect(encrypted).toMatch(/^enc:v1:/);
    expect(encrypted).not.toContain("correct horse battery staple");
    expect(decryptSmtpPassword(encrypted)).toBe("correct horse battery staple");
  });

  it("produces different ciphertext for the same password because each IV is random", () => {
    const first = encryptSmtpPassword("same-password");
    const second = encryptSmtpPassword("same-password");

    expect(first).not.toBe(second);
    expect(decryptSmtpPassword(first)).toBe("same-password");
    expect(decryptSmtpPassword(second)).toBe("same-password");
  });

  it("reads legacy plaintext values so an administrator can resave and migrate them", () => {
    expect(decryptSmtpPassword("legacy-plaintext-password")).toBe("legacy-plaintext-password");
  });

  it("rejects tampered ciphertext", () => {
    const encrypted = encryptSmtpPassword("sensitive");
    expect(() => decryptSmtpPassword(`${encrypted}tampered`)).toThrow();
  });
});
