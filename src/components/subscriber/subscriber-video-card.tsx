"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type HlsType from "hls.js";

import { VideoPlatformBadge, VideoPlatformIcon } from "@/components/video/video-platform-identity";
import type { SubscriberVideoSummary } from "@/lib/subscriber-content/model";

type PlaybackDescriptor = { manifestUrl: string; expiresAt: number };

function validDescriptor(value: unknown): value is PlaybackDescriptor {
  if (!value || typeof value !== "object") return false;
  const descriptor = value as Record<string, unknown>;
  if (typeof descriptor.manifestUrl !== "string" || typeof descriptor.expiresAt !== "number") return false;
  try { return new URL(descriptor.manifestUrl).protocol === "https:"; } catch { return false; }
}

function formatPublishedDate(value: string | null): string {
  if (!value) return "Recently published";
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(value));
}

export function SubscriberVideoCard({ video }: { video: SubscriberVideoSummary }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<HlsType | null>(null);
  const loadingRef = useRef(false);
  const initializedRef = useRef(false);
  const activeRef = useRef(false);
  const [previewing, setPreviewing] = useState(false);

  async function loadDescriptor(): Promise<PlaybackDescriptor | null> {
    const response = await fetch(`/api/subscriber/bunny/${video.slug}`, { cache: "no-store", credentials: "same-origin" });
    const payload: unknown = response.ok ? await response.json() : null;
    if (!validDescriptor(payload)) return null;
    return payload;
  }

  async function startPreview() {
    const element = videoRef.current;
    if (!element) return;
    activeRef.current = true;
    setPreviewing(true);
    if (initializedRef.current) { await element.play().catch(() => undefined); return; }
    if (loadingRef.current) return;
    loadingRef.current = true;
    try {
      const payload = await loadDescriptor();
      if (!payload || !videoRef.current) return;
      const { default: Hls } = await import("hls.js");
      if (!videoRef.current) return;
      if (Hls.isSupported()) {
        const hls = new Hls({ enableWorker: true, startLevel: 0, capLevelToPlayerSize: true, maxBufferLength: 10 });
        hlsRef.current = hls;
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          initializedRef.current = true;
          if (activeRef.current) void videoRef.current?.play().catch(() => undefined);
        });
        hls.loadSource(payload.manifestUrl);
        hls.attachMedia(videoRef.current);
      } else if (videoRef.current.canPlayType("application/vnd.apple.mpegurl")) {
        videoRef.current.src = payload.manifestUrl;
        initializedRef.current = true;
        if (activeRef.current) await videoRef.current.play().catch(() => undefined);
      }
    } catch { setPreviewing(false); } finally { loadingRef.current = false; }
  }

  function stopPreview() {
    activeRef.current = false;
    setPreviewing(false);
    videoRef.current?.pause();
  }

  useEffect(() => () => { hlsRef.current?.destroy(); }, []);

  const href = `/subscriber/videos/${video.slug}`;

  return <article onMouseEnter={() => void startPreview()} onMouseLeave={stopPreview} onFocus={() => void startPreview()} onBlur={stopPreview} className="platform-video-card group">
    <div className="platform-video-card-media">
      <Link href={href} prefetch={false} aria-label={`Watch ${video.title}`} className="platform-video-preview-link focus-visible:ring-2 focus-visible:ring-cyan-300">
        <div className="platform-subscriber-video-preview">
          <video ref={videoRef} poster={`/api/subscriber/bunny/${video.slug}?asset=poster`} muted loop playsInline preload="none" aria-hidden="true" className={`h-full w-full object-cover transition-opacity duration-200 ${previewing ? "opacity-100" : "opacity-70"}`} />
          <span className="platform-subscriber-preview-label">Preview</span>
        </div>
      </Link>
    </div>
    <div className="platform-video-card-body">
      <div className="platform-video-meta"><VideoPlatformBadge platform="bunny" /><span>Subscriber</span></div>
      <h2>{video.title}</h2>
      {video.description ? <p>{video.description}</p> : null}
      <div className="platform-video-card-footer">
        <time dateTime={video.published_at ?? undefined}>{formatPublishedDate(video.published_at)}</time>
        <Link href={href} prefetch={false} aria-label={`Watch video: ${video.title}`} className="platform-text-link"><VideoPlatformIcon platform="bunny" className="size-4" />Watch video</Link>
      </div>
    </div>
  </article>;
}
