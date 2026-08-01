import "server-only";

const fallbackOrigin = "http://localhost:3000";

export function getSiteOrigin(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  try {
    const url = new URL(configured ?? fallbackOrigin);
    return url.origin;
  } catch {
    return fallbackOrigin;
  }
}

export function getSafeNextPath(value: FormDataEntryValue | string | null | undefined, fallback = "/account"): string {
  if (typeof value !== "string" || value.length > 2048 || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return fallback;
  try {
    const origin = getSiteOrigin();
    const candidate = new URL(value, origin);
    return candidate.origin === origin ? `${candidate.pathname}${candidate.search}${candidate.hash}` : fallback;
  } catch {
    return fallback;
  }
}
