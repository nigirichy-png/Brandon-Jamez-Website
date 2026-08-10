import "server-only";

export type BunnyStreamConfig = Readonly<{
  libraryId: string;
  apiKey: string;
  readOnlyApiKey: string;
  cdnHostname: string;
  cdnTokenKey: string;
  collectionId: string | null;
  tusAuthorizationSeconds: number;
  playbackTokenSeconds: number;
}>;

const placeholders = new Set(["", "server-only-placeholder", "your-library-id", "your-cdn-hostname"]);

function required(name: string): string {
  const value = process.env[name]?.trim() ?? "";
  if (placeholders.has(value) || value.includes("placeholder")) throw new Error(`bunny_config_missing:${name}`);
  return value;
}

function boundedSeconds(name: string, fallback: number, minimum: number, maximum: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < minimum || value > maximum) throw new Error(`bunny_config_invalid:${name}`);
  return value;
}

export function requireBunnyStreamConfig(): BunnyStreamConfig {
  const libraryId = required("BUNNY_STREAM_LIBRARY_ID");
  const cdnHostname = required("BUNNY_STREAM_CDN_HOSTNAME").toLowerCase();
  if (!/^\d+$/.test(libraryId)) throw new Error("bunny_config_invalid:BUNNY_STREAM_LIBRARY_ID");
  if (!/^[a-z0-9](?:[a-z0-9.-]{0,251}[a-z0-9])?$/.test(cdnHostname) || cdnHostname.includes("..")) throw new Error("bunny_config_invalid:BUNNY_STREAM_CDN_HOSTNAME");

  const collectionId = process.env.BUNNY_STREAM_COLLECTION_ID?.trim() || null;
  if (collectionId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(collectionId)) {
    throw new Error("bunny_config_invalid:BUNNY_STREAM_COLLECTION_ID");
  }

  return {
    libraryId,
    apiKey: required("BUNNY_STREAM_API_KEY"),
    readOnlyApiKey: required("BUNNY_STREAM_READ_ONLY_API_KEY"),
    cdnHostname,
    cdnTokenKey: required("BUNNY_STREAM_CDN_TOKEN_KEY"),
    collectionId,
    tusAuthorizationSeconds: boundedSeconds("BUNNY_STREAM_TUS_AUTH_TTL_SECONDS", 86_400, 3_600, 172_800),
    playbackTokenSeconds: boundedSeconds("BUNNY_STREAM_PLAYBACK_TOKEN_TTL_SECONDS", 7_200, 300, 43_200),
  };
}

export function bunnyStreamConfigured(): boolean {
  try { requireBunnyStreamConfig(); return true; } catch { return false; }
}
