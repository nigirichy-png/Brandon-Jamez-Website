import "server-only";

import { requireBunnyStreamConfig } from "./config";
import type { BunnyUploadCredentials } from "./model";
import { createBunnyHlsTokenUrl, createBunnyTusSignature, verifyBunnyWebhookSignature } from "./signing";

const videoIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type BunnyVideoResponse = { guid?: unknown; thumbnailFileName?: unknown };

export async function createBunnyVideo(title: string): Promise<string> {
  const config = requireBunnyStreamConfig();
  const response = await fetch(`https://video.bunnycdn.com/library/${config.libraryId}/videos`, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json", AccessKey: config.apiKey },
    body: JSON.stringify({ title, ...(config.collectionId ? { collectionId: config.collectionId } : {}) }),
    cache: "no-store",
  });
  if (!response.ok) throw new Error("bunny_video_create_failed");
  const payload = await response.json() as BunnyVideoResponse;
  if (typeof payload.guid !== "string" || !videoIdPattern.test(payload.guid)) throw new Error("bunny_video_create_invalid_response");
  return payload.guid.toLowerCase();
}

export async function deleteBunnyVideo(videoId: string): Promise<boolean> {
  if (!videoIdPattern.test(videoId)) return false;
  const config = requireBunnyStreamConfig();
  const response = await fetch(`https://video.bunnycdn.com/library/${config.libraryId}/videos/${videoId}`, {
    method: "DELETE",
    headers: { Accept: "application/json", AccessKey: config.apiKey },
    cache: "no-store",
  });
  return response.ok || response.status === 404;
}

export function createBunnyTusCredentials(videoId: string): BunnyUploadCredentials {
  if (!videoIdPattern.test(videoId)) throw new Error("invalid_bunny_video_id");
  const config = requireBunnyStreamConfig();
  const authorizationExpire = Math.floor(Date.now() / 1000) + config.tusAuthorizationSeconds;
  const authorizationSignature = createBunnyTusSignature(config.libraryId, config.apiKey, authorizationExpire, videoId);
  return { endpoint: "https://video.bunnycdn.com/tusupload", videoId, libraryId: config.libraryId, authorizationExpire, authorizationSignature };
}

export function verifyBunnyWebhook(rawBody: string, headers: Headers): boolean {
  const config = requireBunnyStreamConfig();
  if (headers.get("x-bunnystream-signature-version") !== "v1" || headers.get("x-bunnystream-signature-algorithm") !== "hmac-sha256") return false;
  return verifyBunnyWebhookSignature(rawBody, headers.get("x-bunnystream-signature") ?? "", config.readOnlyApiKey);
}

export function createSignedBunnyHlsPlayback(videoId: string): { manifestUrl: string; expiresAt: number } {
  if (!videoIdPattern.test(videoId)) throw new Error("invalid_bunny_video_id");
  const config = requireBunnyStreamConfig();
  const expiresAt = Math.floor(Date.now() / 1000) + config.playbackTokenSeconds;
  const manifestUrl = createBunnyHlsTokenUrl(config.cdnHostname, config.cdnTokenKey, videoId, expiresAt);
  return { manifestUrl, expiresAt };
}

export async function createSignedBunnyPoster(videoId: string): Promise<string> {
  if (!videoIdPattern.test(videoId)) throw new Error("invalid_bunny_video_id");
  const config = requireBunnyStreamConfig();
  const response = await fetch(`https://video.bunnycdn.com/library/${config.libraryId}/videos/${videoId}`, {
    headers: { Accept: "application/json", AccessKey: config.readOnlyApiKey }, cache: "no-store",
  });
  if (!response.ok) throw new Error("bunny_video_lookup_failed");
  const payload = await response.json() as BunnyVideoResponse;
  if (typeof payload.thumbnailFileName !== "string" || !/^[a-zA-Z0-9._-]{1,255}$/.test(payload.thumbnailFileName)) throw new Error("bunny_thumbnail_unavailable");
  const expiresAt = Math.floor(Date.now() / 1000) + config.playbackTokenSeconds;
  return createBunnyHlsTokenUrl(config.cdnHostname, config.cdnTokenKey, videoId, expiresAt)
    .replace(/playlist\.m3u8$/, payload.thumbnailFileName);
}
