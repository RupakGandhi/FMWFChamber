// Creates the first native Chamber administrator in a clean production database.
// Required environment values: DATABASE_URL, ADMIN_USERNAME, ADMIN_PASSWORD, ADMIN_NAME, ADMIN_EMAIL

import mysql from "mysql2/promise";
import { promisify } from "node:util";
import { randomBytes, scrypt as scryptCallback } from "node:crypto";

const scrypt = promisify(scryptCallback);
const required = ["DATABASE_URL", "ADMIN_USERNAME", "ADMIN_PASSWORD", "ADMIN_NAME", "ADMIN_EMAIL"];
const missing = required.filter(key => !process.env[key]);

if (missing.length > 0) {
  console.error(`Missing required environment values: ${missing.join(", ")}`);
  process.exit(1);
}

const username = process.env.ADMIN_USERNAME.trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD;
const name = process.env.ADMIN_NAME.trim();
const email = process.env.ADMIN_EMAIL.trim().toLowerCase();

if (!/^[a-z0-9][a-z0-9._-]{2,63}$/.test(username)) {
  console.error("ADMIN_USERNAME must be 3-64 characters and use only letters, numbers, periods, underscores, or hyphens.");
  process.exit(1);
}
if (password.length < 12 || password.length > 128 || !/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/[0-9]/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
  console.error("ADMIN_PASSWORD must be 12-128 characters and include uppercase, lowercase, number, and special characters.");
  process.exit(1);
}
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  console.error("ADMIN_EMAIL must be a valid email address.");
  process.exit(1);
}

const salt = randomBytes(16);
const derivedKey = await scrypt(password, salt, 64);
const passwordHash = `scrypt:v1:${salt.toString("base64")}:${Buffer.from(derivedKey).toString("base64")}`;
const openId = `native:${randomBytes(24).toString("base64url")}`;
const connection = await mysql.createConnection(process.env.DATABASE_URL);

try {
  const [existing] = await connection.execute("SELECT id FROM users WHERE username = ? LIMIT 1", [username]);
  if (existing.length > 0) {
    console.error(`A staff account with username '${username}' already exists.`);
    process.exitCode = 1;
  } else {
    await connection.execute(
      `INSERT INTO users
        (openId, username, passwordHash, name, email, loginMethod, role, isActive, mustChangePassword,
         failedLoginAttempts, lockedUntil, passwordUpdatedAt, createdAt, updatedAt, lastSignedIn)
       VALUES (?, ?, ?, ?, ?, 'native', 'admin', true, true, 0, NULL, NOW(), NOW(), NOW(), '2000-01-01 00:00:00')`,
      [openId, username, passwordHash, name, email],
    );
    console.log(`Native Chamber administrator '${username}' created successfully.`);
    console.log("The administrator must replace the bootstrap password after first sign-in.");
  }
} finally {
  await connection.end();
}
