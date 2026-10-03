import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function context(cookie = ""): TrpcContext {
  return {
    user: null,
    req: { protocol: "http", headers: { cookie } } as TrpcContext["req"],
    res: { cookie: () => undefined } as TrpcContext["res"],
  };
}

describe("store activity API", () => {
  it("does not expose customer activity to non-admins", async () => {
    await expect(appRouter.createCaller(context()).activity.recent()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});