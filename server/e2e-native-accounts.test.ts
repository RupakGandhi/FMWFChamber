import { describe, expect, it } from "vitest";
import mysql from "mysql2/promise";
import { appRouter } from "./routers";
import * as db from "./db";
import { hashPassword, verifyPassword } from "./nativeAuth";
import type { TrpcContext } from "./_core/context";

const runDatabaseAcceptance = process.env.RUN_DB_E2E === "true";

function publicContext(cookieValues: string[] = []): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
      cookie: (_name: string, value: string) => cookieValues.push(value),
    } as unknown as TrpcContext["res"],
  };
}

describe.skipIf(!runDatabaseAcceptance)("database-backed native Chamber staff accounts", () => {
  it("executes the full native account lifecycle and deletes all temporary staff records", async () => {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) throw new Error("DATABASE_URL is required for RUN_DB_E2E=true");
    const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
    const adminUsername = `e2e.admin.${suffix}`;
    const staffUsername = `e2e.staff.${suffix}`;
    const originalPassword = "OriginalNative!2027";
    const replacementPassword = "ReplacementNative!2027";
    const connection = await mysql.createConnection(databaseUrl);

    try {
      const adminId = await db.createNativeStaffUser({
        username: adminUsername,
        passwordHash: await hashPassword(originalPassword),
        name: "E2E Native Admin",
        email: `e2e-admin-${suffix}@example.com`,
        role: "admin",
        mustChangePassword: true,
      });

      const cookies: string[] = [];
      const publicCaller = appRouter.createCaller(publicContext(cookies));
      const login = await publicCaller.auth.nativeLogin({ username: adminUsername.toUpperCase(), password: originalPassword });
      expect(login).toEqual({ success: true, mustChangePassword: true });
      expect(cookies).toHaveLength(1);

      const adminUser = await db.getUserById(adminId);
      expect(adminUser?.loginMethod).toBe("native");
      const passwordChangeContext = {
        ...publicContext(),
        user: adminUser!,
      } as TrpcContext;
      const passwordChangeCaller = appRouter.createCaller(passwordChangeContext);

      await passwordChangeCaller.auth.changePassword({ currentPassword: originalPassword, newPassword: replacementPassword });
      const updatedAdmin = await db.getUserById(adminId);
      expect(updatedAdmin?.mustChangePassword).toBe(false);
      expect(await verifyPassword(replacementPassword, updatedAdmin!.passwordHash!)).toBe(true);
      const admin = appRouter.createCaller({ ...publicContext(), user: updatedAdmin! } as TrpcContext);

      const created = await admin.staffAccounts.create({
        username: staffUsername,
        name: "E2E Staff Member",
        email: `e2e-staff-${suffix}@example.com`,
      });
      expect(created.temporaryPassword).toBeTruthy();
      const staffUser = await db.getUserById(created.id);
      expect(staffUser?.mustChangePassword).toBe(true);

      const listed = await admin.staffAccounts.list();
      expect(listed.some(account => account.username === staffUsername)).toBe(true);
      expect(JSON.stringify(listed)).not.toContain("passwordHash");

      const wrongCaller = appRouter.createCaller(publicContext());
      for (let attempt = 0; attempt < 5; attempt += 1) {
        await expect(wrongCaller.auth.nativeLogin({ username: staffUsername, password: "WrongPassword!2027" })).rejects.toThrow("Invalid username or password");
      }
      await expect(wrongCaller.auth.nativeLogin({ username: staffUsername, password: created.temporaryPassword })).rejects.toThrow("temporarily locked");
      await admin.staffAccounts.unlock({ id: created.id });
      await expect(wrongCaller.auth.nativeLogin({ username: staffUsername, password: created.temporaryPassword })).resolves.toMatchObject({ success: true });

      const reset = await admin.staffAccounts.resetPassword({ id: created.id });
      expect(reset.username).toBe(staffUsername);
      await expect(wrongCaller.auth.nativeLogin({ username: staffUsername, password: created.temporaryPassword })).rejects.toThrow("Invalid username or password");
      await expect(wrongCaller.auth.nativeLogin({ username: staffUsername, password: reset.temporaryPassword })).resolves.toMatchObject({ success: true, mustChangePassword: true });

      await admin.staffAccounts.update({
        id: created.id,
        name: "E2E Staff Updated",
        email: `e2e-staff-updated-${suffix}@example.com`,
        isActive: false,
      });
      await expect(wrongCaller.auth.nativeLogin({ username: staffUsername, password: reset.temporaryPassword })).rejects.toThrow("inactive");
    } finally {
      await connection.execute("DELETE FROM users WHERE username IN (?, ?)", [adminUsername, staffUsername]);
      await connection.end();
    }
  });
});
