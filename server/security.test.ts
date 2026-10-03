import { afterEach, describe, expect, it } from "vitest";
import { ENV } from "./_core/env";
import { ADMIN_SESSION_MAX_AGE_MS, createAdminSession, readAdminSession, verifyAdminCredentials } from "./security";

const original = {
  cookieSecret: ENV.cookieSecret,
  ritaPassphrase: ENV.adminRitaPassphrase,
  ritaPin: ENV.adminRitaPin,
  amitPassphrase: ENV.adminAmitPassphrase,
  amitPin: ENV.adminAmitPin,
};

afterEach(() => {
  ENV.cookieSecret = original.cookieSecret;
  ENV.adminRitaPassphrase = original.ritaPassphrase;
  ENV.adminRitaPin = original.ritaPin;
  ENV.adminAmitPassphrase = original.amitPassphrase;
  ENV.adminAmitPin = original.amitPin;
});

describe("server-side admin verification", () => {
  it("requires a matching approved email, phone, fresh passphrase, and 8-digit PIN", () => {
    ENV.adminRitaPassphrase = "unit-test-fresh-rita-passphrase";
    ENV.adminRitaPin = "12345678";
    expect(verifyAdminCredentials({ email: "RITAKSHIDHIMAN@gmail.com", phone: "+91 82199 51821", passphrase: ENV.adminRitaPassphrase, pin: ENV.adminRitaPin })).toBe(true);
    expect(verifyAdminCredentials({ email: "ritakshidhiman@gmail.com", phone: "9871047488", passphrase: ENV.adminRitaPassphrase, pin: ENV.adminRitaPin })).toBe(false);
    expect(verifyAdminCredentials({ email: "ritakshidhiman@gmail.com", phone: "8219951821", passphrase: ENV.adminRitaPassphrase, pin: "1234567" })).toBe(false);
    expect(verifyAdminCredentials({ email: "customer@example.com", phone: "8219951821", passphrase: ENV.adminRitaPassphrase, pin: ENV.adminRitaPin })).toBe(false);
  });

  it("returns a signed, expiring admin session and rejects tampering", () => {
    ENV.cookieSecret = "unit-test-session-signing-secret";
    const now = 1_800_000_000_000;
    const token = createAdminSession("ritakshidhiman@gmail.com", now);
    expect(readAdminSession(token, now + 1000)).toBe("ritakshidhiman@gmail.com");
    expect(readAdminSession(`${token}x`, now + 1000)).toBeNull();
    expect(readAdminSession(token, now + ADMIN_SESSION_MAX_AGE_MS + 1)).toBeNull();
  });
});
