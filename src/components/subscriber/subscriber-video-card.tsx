"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type HlsType from "hls.js";

import type { SubscriberVideoSummary } from "@/lib/subscriber-content/model";

type PlaybackDescriptor = { manifestUrl: string; expiresAt: number };

function validDescriptor(value: unknown): value is PlaybackDescriptor {
  if (!value || typeof value !== "object") return false;
  const descriptor = value as Record<string, unknown>;
  if (typeof descriptor.manifestUrl !== "string" || typeof descriptor.expiresAt !== "number") return false;
  try { return new URL(descriptor.manifestUrl).protocol === "https:"; } catch { return false; }
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

  return <article onMouseEnter={() => void startPreview()} onMouseLeave={stopPreview} onFocus={() => void startPreview()} onBlur={stopPreview} className="group overflow-hidden rounded-lg border border-cyan-300/20 bg-black/20 transition-colors hover:border-cyan-300/45">
    <Link href={`/subscriber/videos/${video.slug}`} prefetch={false} className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">
      <div className="relative aspect-video overflow-hidden bg-black">
        <video ref={videoRef} poster={`/api/subscriber/bunny/${video.slug}?asset=poster`} muted loop playsInline preload="none" aria-hidden="true" className={`h-full w-full object-cover transition-opacity duration-200 ${previewing ? "opacity-100" : "opacity-70"}`} />
        <span className="absolute inset-0 grid place-items-center bg-black/20 text-sm font-extrabold uppercase tracking-wider text-white transition-opacity group-hover:opacity-0 group-focus-within:opacity-0">Preview</span>
      </div>
      <div className="p-4"><h3 className="font-display text-xl font-bold text-white">{video.title}</h3>{video.description ? <p className="mt-1.5 line-clamp-2 text-sm text-zinc-300">{video.description}</p> : null}<span className="mt-3 inline-block text-xs font-extrabold uppercase tracking-wider text-cyan-200">Open video →</span></div>
    </Link>
  </article>;
}
