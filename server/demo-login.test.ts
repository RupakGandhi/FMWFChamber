import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type CookieCall = {
  name: string;
  value: string;
  options: Record<string, unknown>;
};

function createPublicContext(): { ctx: TrpcContext; setCookies: CookieCall[] } {
  const setCookies: CookieCall[] = [];

  const ctx: TrpcContext = {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      cookie: (name: string, value: string, options: Record<string, unknown>) => {
        setCookies.push({ name, value, options });
      },
      clearCookie: () => {},
    } as unknown as TrpcContext["res"],
  };

  return { ctx, setCookies };
}

describe("auth.demoLogin", () => {
  const originalDemoFlag = process.env.ENABLE_DEMO_LOGIN;

  beforeEach(() => {
    process.env.ENABLE_DEMO_LOGIN = 'true';
    process.env.DEMO_USERNAME = 'test-demo-admin';
    process.env.DEMO_PASSWORD = 'Test-Only-Demo-Password-123!';
  });

  afterEach(() => {
    if (originalDemoFlag === undefined) delete process.env.ENABLE_DEMO_LOGIN;
    else process.env.ENABLE_DEMO_LOGIN = originalDemoFlag;
    delete process.env.DEMO_USERNAME;
    delete process.env.DEMO_PASSWORD;
  });

  it("is unavailable when the explicit demo-mode flag is not enabled", async () => {
    delete process.env.ENABLE_DEMO_LOGIN;
    const { ctx } = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.auth.demoLogin({ username: "test-demo-admin", password: "Test-Only-Demo-Password-123!" })
    ).rejects.toThrow("Demo login is not enabled.");
  });

  it("rejects invalid credentials", async () => {
    const { ctx } = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.auth.demoLogin({ username: "wrong", password: "wrong" })
    ).rejects.toThrow("Invalid demo credentials");
  });

  it("rejects wrong password with correct username", async () => {
    const { ctx } = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.auth.demoLogin({ username: "test-demo-admin", password: "wrongpassword" })
    ).rejects.toThrow("Invalid demo credentials");
  });

  it("accepts valid demo credentials and sets session cookie", async () => {
    const { ctx, setCookies } = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.demoLogin({
      username: "test-demo-admin",
      password: "Test-Only-Demo-Password-123!",
    });

    expect(result).toEqual({ success: true });
    expect(setCookies).toHaveLength(1);
    expect(setCookies[0]?.name).toBe("app_session_id");
    expect(setCookies[0]?.value).toBeTruthy();
    expect(setCookies[0]?.options).toMatchObject({
      httpOnly: true,
      path: "/",
    });
  });
});
