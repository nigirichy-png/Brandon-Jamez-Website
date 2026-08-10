import "server-only";

import { createHmac } from "node:crypto";

import type { YouTubeChatSnapshot, YouTubeModerationInput } from "./model";
import { loadOrCreateLocalServiceSecret } from "./local-secret";

async function configuration() {
  const rawUrl = process.env.LIVE_MODERATION_SERVICE_URL?.trim() || "http://127.0.0.1:3011";
  const explicitSecret = process.env.LIVE_MODERATION_SERVICE_SECRET?.trim() || "";
  const secret = explicitSecret && !explicitSecret.includes("placeholder") ? explicitSecret : await loadOrCreateLocalServiceSecret();
  const url = new URL(rawUrl);
  if (!(["127.0.0.1", "localhost", "::1"].includes(url.hostname) && url.protocol === "http:") && url.protocol !== "https:") throw new Error("invalid_live_moderation_service_url");
  if (secret.length < 32 || secret === "server-only-placeholder-at-least-32-characters") throw new Error("live_moderation_service_not_configured");
  return { url, secret };
}

async function request<T>(actorId: string, requestPath: string, init: { method?: "GET" | "POST" | "DELETE"; body?: string } = {}): Promise<T> {
  const { url, secret } = await configuration(); const method = init.method ?? "GET"; const body = init.body ?? ""; const timestamp = String(Date.now());
  const signature = createHmac("sha256", secret).update(`${timestamp}.${method}.${requestPath}.${body}`).digest("hex");
  const response = await fetch(new URL(requestPath, url), { method, body: body || undefined, headers: { "x-live-timestamp": timestamp, "x-live-signature": signature, "x-live-actor": actorId, ...(body ? { "content-type": "application/json" } : {}) }, cache: "no-store", signal: AbortSignal.timeout(15_000) });
  if (!response.ok) { const result = await response.json().catch(() => ({})) as { error?: string }; throw new Error(result.error ?? `youtube_service_${response.status}`); }
  return response.status === 204 ? undefined as T : await response.json() as T;
}

export function getYouTubeChat(actorId: string, videoId: string, manualRetry = false): Promise<YouTubeChatSnapshot> {
  const query = new URLSearchParams({ videoId }); if (manualRetry) query.set("manualRetry", "true"); return request(actorId, `/chat?${query}`);
}

export function moderateYouTubeChat(actorId: string, input: YouTubeModerationInput): Promise<{ ok: true; liveChatId: string; title: string }> {
  return request(actorId, "/action", { method: "POST", body: JSON.stringify(input) });
}

export function releaseYouTubeChat(actorId: string, liveChatId: string): Promise<void> {
  return request(actorId, `/client?${new URLSearchParams({ liveChatId })}`, { method: "DELETE" });
}
