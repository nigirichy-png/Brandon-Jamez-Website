import "server-only";

const fallbackOrigin = "http://localhost:3000";

export function getSiteOrigin(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  try {
    const url = new URL(configured ?? fallbackOrigin);
    const localHttp = url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname);
    const validOrigin = url.protocol === "https:" || localHttp;
    if (!validOrigin || url.username || url.password || url.pathname !== "/" || url.search || url.hash) return fallbackOrigin;
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
    return candidate.origin === origin ? `${candidate.pathname}${candidate.search}` : fallback;
  } catch {
    return fallback;
  }
}
