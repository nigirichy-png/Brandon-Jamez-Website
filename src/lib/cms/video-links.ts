import type { CmsVideoPlatform } from "@/lib/cms/video-model";

const platformHosts: Record<CmsVideoPlatform, readonly string[]> = {
  youtube: ["youtube.com", "youtu.be"],
  rumble: ["rumble.com"],
  kick: ["kick.com"],
};

const youtubeVideoIdPattern = /^[A-Za-z0-9_-]{11}$/;

function hasAllowedHost(hostname: string, allowedHosts: readonly string[]): boolean {
  return allowedHosts.some((host) => hostname === host || hostname.endsWith(`.${host}`));
}

function parseHttpsUrl(input: string): URL | null {
  try {
    const url = new URL(input);
    return url.protocol === "https:" && !url.username && !url.password ? url : null;
  } catch {
    return null;
  }
}

export function isSupportedVideoUrl(platform: CmsVideoPlatform, input: string): boolean {
  const url = parseHttpsUrl(input);
  return Boolean(url && hasAllowedHost(url.hostname.toLowerCase(), platformHosts[platform]));
}

export function getYouTubeVideoId(input: string): string | null {
  const url = parseHttpsUrl(input);
  if (!url) return null;

  const hostname = url.hostname.toLowerCase();
  if (!hasAllowedHost(hostname, platformHosts.youtube)) return null;

  const pathSegments = url.pathname.split("/").filter(Boolean);
  let candidate: string | null = null;

  if (hostname === "youtu.be" || hostname.endsWith(".youtu.be")) {
    candidate = pathSegments.length === 1 ? pathSegments[0] : null;
  } else if (url.pathname === "/watch" || url.pathname === "/watch/") {
    candidate = url.searchParams.get("v");
  } else if (pathSegments.length === 2 && ["shorts", "live", "embed"].includes(pathSegments[0])) {
    candidate = pathSegments[1];
  }

  return candidate && youtubeVideoIdPattern.test(candidate) ? candidate : null;
}

export function getVideoThumbnailUrl(platform: CmsVideoPlatform, input: string): string | null {
  if (platform !== "youtube") return null;
  const videoId = getYouTubeVideoId(input);
  return videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : null;
}
