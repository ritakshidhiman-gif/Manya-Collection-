import { describe, expect, it } from "vitest";
import { getRoleForAccountEmail, isAllowedAdminEmail, isAllowedAdminIdentity } from "../shared/admin";

describe("Manya admin email allowlist", () => {
  it("keeps all signed-in profiles non-admin until the separate challenge succeeds", () => {
    expect(getRoleForAccountEmail("ritakshidhiman@gmail.com")).toBe("user");
    expect(getRoleForAccountEmail("  AMIT1988RAJPUT@gmail.com ")).toBe("user");
  });

  it("does not grant admin to other accounts or malformed email values", () => {
    expect(getRoleForAccountEmail("sample@example.com")).toBe("user");
    expect(getRoleForAccountEmail("amit1988rajput+other@gmail.com")).toBe("user");
    expect(getRoleForAccountEmail(null)).toBe("user");
    expect(isAllowedAdminEmail(undefined)).toBe(false);
  });

  it("requires the email and phone to match as the same approved admin identity", () => {
    expect(isAllowedAdminIdentity("RitaKshiDhiman@gmail.com", "+91 82199 51821")).toBe(true);
    expect(isAllowedAdminIdentity("amit1988rajput@gmail.com", "9871047488")).toBe(true);
    expect(isAllowedAdminIdentity("ritakshidhiman@gmail.com", "9871047488")).toBe(false);
    expect(isAllowedAdminIdentity("sample@example.com", "8219951821")).toBe(false);
  });
});
