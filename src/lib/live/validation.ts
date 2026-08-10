import type { LiveSession } from "./model";

const youtubeIdPattern = /^[A-Za-z0-9_-]{11}$/;
const providerPattern = /^[a-z0-9][a-z0-9_-]{0,39}$/;
const referencePattern = /^[A-Za-z0-9._-]{1,240}$/;

export function parseLiveConfiguration(formData: FormData): { ok: true; value: Pick<LiveSession, "title" | "source" | "youtubeVideoId" | "directPlaybackProvider" | "directPlaybackReference"> } | { ok: false; message: string } {
  const title = String(formData.get("title") ?? "").trim();
  const source = String(formData.get("source") ?? "");
  const youtubeVideoId = String(formData.get("youtubeVideoId") ?? "").trim() || null;
  const directPlaybackProvider = String(formData.get("directPlaybackProvider") ?? "").trim() || null;
  const directPlaybackReference = String(formData.get("directPlaybackReference") ?? "").trim() || null;
  if (!title || title.length > 160 || /[\u0000-\u001f\u007f]/.test(title)) return { ok: false, message: "Enter a valid title." };
  if (source === "youtube" && youtubeVideoId && youtubeIdPattern.test(youtubeVideoId)) return { ok: true, value: { title, source, youtubeVideoId, directPlaybackProvider: null, directPlaybackReference: null } };
  if (source === "direct" && directPlaybackProvider && directPlaybackReference && providerPattern.test(directPlaybackProvider) && referencePattern.test(directPlaybackReference)) return { ok: true, value: { title, source, youtubeVideoId: null, directPlaybackProvider, directPlaybackReference } };
  return { ok: false, message: source === "youtube" ? "Enter a valid 11-character YouTube video ID." : "Enter a safe provider key and opaque playback reference." };
}

export function isLiveStatus(value: string): value is LiveSession["status"] {
  return ["offline", "scheduled", "live", "ended"].includes(value);
}

