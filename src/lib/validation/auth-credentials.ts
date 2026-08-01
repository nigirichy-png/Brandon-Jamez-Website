export const passwordRequirements = "Use 12–128 characters with uppercase, lowercase, number, and symbol.";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const strongPassword = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{12,128}$/;

export function normalizeEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  return email.length <= 254 && emailPattern.test(email) ? email : null;
}

export function isStrongPassword(value: unknown): value is string {
  return typeof value === "string" && strongPassword.test(value);
}
