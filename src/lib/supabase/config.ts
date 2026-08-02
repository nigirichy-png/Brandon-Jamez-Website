export type ApplicationMode = "mock" | "supabase";

export type PublicSupabaseConfig = Readonly<{
  url: string;
  anonKey: string;
}>;

const PUBLIC_URL_PLACEHOLDER = "https://your-project.supabase.co";
const PUBLIC_KEY_PLACEHOLDER = "your-public-anon-key";

const isUsableUrl = (value: string | undefined): value is string => {
  if (!value || value === PUBLIC_URL_PLACEHOLDER) return false;

  try {
    const url = new URL(value);
    return url.protocol === "https:"
      || (url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname));
  } catch {
    return false;
  }
};

const isUsablePublicKey = (value: string | undefined): value is string =>
  Boolean(value && value !== PUBLIC_KEY_PLACEHOLDER && !value.includes("placeholder"));

/** Safe in browser bundles: this module reads public variables only. */
export function getPublicSupabaseConfig(): PublicSupabaseConfig | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!isUsableUrl(url) || !isUsablePublicKey(anonKey)) return null;

  return { url, anonKey };
}

export function isSupabaseConfigured(): boolean {
  return getPublicSupabaseConfig() !== null;
}

export function getApplicationMode(): ApplicationMode {
  return isSupabaseConfigured() ? "supabase" : "mock";
}

export function requirePublicSupabaseConfig(context: string): PublicSupabaseConfig {
  const config = getPublicSupabaseConfig();

  if (!config) {
    throw new Error(
      `Supabase is not configured for ${context}. Add valid public values to .env.local or the deployment environment before calling this function.`,
    );
  }

  return config;
}
