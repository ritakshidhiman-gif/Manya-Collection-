export const ADMIN_ACCOUNTS = [
  { email: "ritakshidhiman@gmail.com", phone: "8219951821", secretKey: "RITA" },
  { email: "amit1988rajput@gmail.com", phone: "9871047488", secretKey: "AMIT" },
] as const;

export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.length === 12 && digits.startsWith("91") ? digits.slice(2) : digits;
}

export function isAllowedAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return ADMIN_ACCOUNTS.some((account) => account.email === email.trim().toLowerCase());
}

export function isAllowedAdminIdentity(email: string | null | undefined, phone: string | null | undefined): boolean {
  if (!email || !phone) return false;
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedPhone = normalizePhone(phone);
  return ADMIN_ACCOUNTS.some((account) => account.email === normalizedEmail && account.phone === normalizedPhone);
}

export function getRoleForAccountEmail(email: string | null | undefined): "admin" | "user" {
  // Customer profile sign-in never grants admin rights by itself.
  void email;
  return "user";
}
