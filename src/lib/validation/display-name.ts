export function normalizeDisplayName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().replace(/[’ʼ]/gu, "'");
  if (normalized.length < 2 || normalized.length > 50) return null;
  if (/[\p{Cc}\p{Cf}]/u.test(normalized)) return null;
  return /^[\p{L}\p{N} '-]+$/u.test(normalized) ? normalized : null;
}
