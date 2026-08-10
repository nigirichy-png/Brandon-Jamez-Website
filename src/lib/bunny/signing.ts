import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export function createBunnyTusSignature(libraryId: string, apiKey: string, authorizationExpire: number, videoId: string): string {
  return createHash("sha256").update(`${libraryId}${apiKey}${authorizationExpire}${videoId}`).digest("hex");
}

export function verifyBunnyWebhookSignature(rawBody: string, received: string, readOnlyApiKey: string): boolean {
  const expected = createHmac("sha256", readOnlyApiKey).update(rawBody, "utf8").digest("hex");
  if (!/^[0-9a-f]{64}$/.test(received) || received.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(received, "utf8"), Buffer.from(expected, "utf8"));
}

export function createBunnyHlsTokenUrl(cdnHostname: string, cdnTokenKey: string, videoId: string, expiresAt: number): string {
  const tokenPath = `/${videoId}/`;
  const manifestPath = `${tokenPath}playlist.m3u8`;
  const signingData = `token_path=${tokenPath}`;
  const digest = createHmac("sha256", cdnTokenKey)
    .update(tokenPath)
    .update(String(expiresAt))
    .update(signingData)
    .digest("base64url");
  return `https://${cdnHostname}/bcdn_token=HS256-${digest}&token_path=${encodeURIComponent(tokenPath)}&expires=${expiresAt}${manifestPath}`;
}
