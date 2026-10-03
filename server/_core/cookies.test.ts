import { describe, expect, it } from "vitest";
import { getSessionCookieOptions } from "./cookies";
import type { Request } from "express";

describe("session cookie options", () => {
  it("uses browser-compatible same-site settings on local HTTP", () => {
    const options = getSessionCookieOptions({
      protocol: "http",
      headers: {},
    } as Request);

    expect(options).toMatchObject({ secure: false, sameSite: "lax" });
  });

  it("allows cross-site cookies on HTTPS requests", () => {
    const options = getSessionCookieOptions({
      protocol: "https",
      headers: {},
    } as Request);

    expect(options).toMatchObject({ secure: true, sameSite: "none" });
  });
});