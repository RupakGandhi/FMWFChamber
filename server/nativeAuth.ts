import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const PASSWORD_FORMAT = "scrypt:v1";
const KEY_LENGTH = 64;

export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

export function validateUsername(username: string): string | null {
  const normalized = normalizeUsername(username);
  if (!/^[a-z0-9][a-z0-9._-]{2,63}$/.test(normalized)) {
    return "Username must be 3-64 characters and use only letters, numbers, periods, underscores, or hyphens.";
  }
  return null;
}

export function validatePasswordPolicy(password: string): string | null {
  if (password.length < 12 || password.length > 128) {
    return "Password must be between 12 and 128 characters.";
  }
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/[0-9]/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
    return "Password must include uppercase, lowercase, number, and special characters.";
  }
  return null;
}

export async function hashPassword(password: string): Promise<string> {
  const policyError = validatePasswordPolicy(password);
  if (policyError) throw new Error(policyError);
  const salt = randomBytes(16);
  const derivedKey = (await scrypt(password, salt, KEY_LENGTH)) as Buffer;
  return `${PASSWORD_FORMAT}:${salt.toString("base64")}:${derivedKey.toString("base64")}`;
}

export async function verifyPassword(password: string, encodedHash: string): Promise<boolean> {
  const [algorithm, version, saltValue, hashValue] = encodedHash.split(":");
  if (`${algorithm}:${version}` !== PASSWORD_FORMAT || !saltValue || !hashValue) return false;
  try {
    const expected = Buffer.from(hashValue, "base64");
    if (expected.length !== KEY_LENGTH) return false;
    const actual = (await scrypt(password, Buffer.from(saltValue, "base64"), expected.length)) as Buffer;
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

export function generateTemporaryPassword(): string {
  return `Tmp!${randomBytes(18).toString("base64url")}9aA`;
}
