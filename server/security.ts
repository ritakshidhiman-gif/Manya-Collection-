import { ENV } from "./_core/env";
import { normalizePhone } from "../shared/admin";

export const ADMIN_COOKIE_NAME = "manya_admin_session";
export const ADMIN_SESSION_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

export function verifyAdminCredentials(input: {
  email?: string;
  phone?: string;
  passphrase?: string;
  pin?: string;
}): boolean {
  if (!input.email || !input.phone || !input.passphrase || !input.pin) {
    return false;
  }

  const email = input.email.trim().toLowerCase();
  const phone = normalizePhone(input.phone);
  const passphrase = input.passphrase.trim();
  const pin = input.pin.trim();

  const isRita =
    email === "ritakshidhiman@gmail.com" &&
    phone === "8219951821" &&
    Boolean(ENV.adminRitaPassphrase && ENV.adminRitaPin) &&
    passphrase === ENV.adminRitaPassphrase.trim() &&
    pin === ENV.adminRitaPin.trim();

  const isAmit =
    email === "amit1988rajput@gmail.com" &&
    phone === "9871047488" &&
    Boolean(ENV.adminAmitPassphrase && ENV.adminAmitPin) &&
    passphrase === ENV.adminAmitPassphrase.trim() &&
    pin === ENV.adminAmitPin.trim();

  return isRita || isAmit;
}

export function createAdminSession(email: string, now: number = Date.now()): string {
  const expiresAt = now + ADMIN_SESSION_MAX_AGE_MS;
  const payload = `${email}:${expiresAt}`;
  return Buffer.from(payload).toString("base64");
}

export function readAdminSession(token?: string, now: number = Date.now()): string | null {
  if (!token) return null;
  try {
    const decoded = Buffer.from(token, "base64").toString("utf-8");
    const [email, expiresAtStr] = decoded.split(":");
    const expiresAt = Number(expiresAtStr);
    if (!email || isNaN(expiresAt) || now > expiresAt) {
      return null;
    }
    return email;
  } catch {
    return null;
  }
}