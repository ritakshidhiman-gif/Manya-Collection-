import { describe, expect, it } from "vitest";
import { ADMIN_COOKIE_NAME, ADMIN_SESSION_MAX_AGE_MS, readAdminSession } from "./security";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type CookieCall = { name: string; value: string; options: Record<string, unknown> };

describe("secure admin login API with configured project secrets", () => {
  it("accepts Rita's configured fresh credentials and sets an admin session cookie", async () => {
    const passphrase = process.env.MNY_ADMIN_RITA_PASSPHRASE;
    const pin = process.env.MNY_ADMIN_RITA_PIN;
    expect(passphrase, "MNY_ADMIN_RITA_PASSPHRASE must be available to the project test runtime").toBeTruthy();
    expect(pin, "MNY_ADMIN_RITA_PIN must be available to the project test runtime").toMatch(/^\d{8}$/);

    const cookies: CookieCall[] = [];
    const ctx: TrpcContext = {
      user: null,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: {
        cookie: (name: string, value: string, options: Record<string, unknown>) => {
          cookies.push({ name, value, options });
        },
      } as TrpcContext["res"],
    };

    const result = await appRouter.createCaller(ctx).admin.login({
      email: "ritakshidhiman@gmail.com",
      phone: "8219951821",
      passphrase,
      pin,
    });

    expect(result).toEqual({ success: true });
    expect(cookies).toHaveLength(1);
    expect(cookies[0]?.name).toBe(ADMIN_COOKIE_NAME);
    expect(cookies[0]?.options).toMatchObject({ httpOnly: true, secure: true, maxAge: ADMIN_SESSION_MAX_AGE_MS });
    expect(readAdminSession(cookies[0]?.value)).toBe("ritakshidhiman@gmail.com");
  });

  it("accepts Amit's configured fresh credentials", async () => {
    const passphrase = process.env.MNY_ADMIN_AMIT_PASSPHRASE;
    const pin = process.env.MNY_ADMIN_AMIT_PIN;
    expect(passphrase, "MNY_ADMIN_AMIT_PASSPHRASE must be available to the project test runtime").toBeTruthy();
    expect(pin, "MNY_ADMIN_AMIT_PIN must be available to the project test runtime").toMatch(/^\d{8}$/);

    const ctx: TrpcContext = {
      user: null,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: { cookie: () => undefined } as TrpcContext["res"],
    };

    const result = await appRouter.createCaller(ctx).admin.login({
      email: "amit1988rajput@gmail.com",
      phone: "+91 98710 47488",
      passphrase,
      pin,
    });

    expect(result).toEqual({ success: true });
  });
});
