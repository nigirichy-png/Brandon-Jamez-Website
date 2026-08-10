"use client";

import { useEffect, useRef, useState } from "react";
import type HlsType from "hls.js";

type PlaybackDescriptor = { manifestUrl: string; expiresAt: number };

function validDescriptor(value: unknown): value is PlaybackDescriptor {
  if (!value || typeof value !== "object") return false;
  const descriptor = value as Record<string, unknown>;
  if (typeof descriptor.manifestUrl !== "string" || typeof descriptor.expiresAt !== "number") return false;
  try { return new URL(descriptor.manifestUrl).protocol === "https:" && Number.isInteger(descriptor.expiresAt); } catch { return false; }
}

export function BunnyHlsPlayer({ playbackEndpoint, title, className }: { playbackEndpoint: string; title: string; className?: string }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<HlsType | null>(null);
  const selectedQualityRef = useRef("auto");
  const [error, setError] = useState("");
  const [qualityOptions, setQualityOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [selectedQuality, setSelectedQuality] = useState("auto");

  function selectQuality(value: string) {
    selectedQualityRef.current = value;
    setSelectedQuality(value);
    const hls = hlsRef.current;
    if (!hls) return;
    if (value === "auto") { hls.currentLevel = -1; return; }
    const levelIndex = hls.levels.findIndex((level) => String(level.height) === value);
    if (levelIndex >= 0) hls.currentLevel = levelIndex;
  }

  useEffect(() => {
    const video = videoRef.current as HTMLVideoElement;
    if (!video) return;
    let cancelled = false;
    let refreshTimer: ReturnType<typeof setTimeout> | undefined;
    let hls: HlsType | null = null;

    async function loadPlayback(preservePosition: boolean) {
      const position = preservePosition && Number.isFinite(video.currentTime) ? video.currentTime : 0;
      try {
        const response = await fetch(playbackEndpoint, { cache: "no-store", credentials: "same-origin" });
        const payload: unknown = response.ok ? await response.json() : null;
        if (cancelled || !validDescriptor(payload)) throw new Error("playback_unavailable");
        hls?.destroy(); hls = null; hlsRef.current = null;
        setQualityOptions([]);
        video.removeAttribute("src"); video.load();

        const restorePosition = () => { if (position > 0 && Number.isFinite(video.duration)) video.currentTime = Math.min(position, Math.max(0, video.duration - 0.1)); };
        const { default: Hls } = await import("hls.js");
        if (cancelled) return;
        if (Hls.isSupported()) {
          hls = new Hls({ enableWorker: true });
          hlsRef.current = hls;
          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            const heights = [...new Set(hls?.levels.map((level) => level.height).filter((height) => height > 0) ?? [])]
              .sort((left, right) => right - left);
            setQualityOptions([
              { value: "auto", label: "Auto" },
              ...heights.map((height) => ({ value: String(height), label: `${height}p` })),
            ]);
            const requested = selectedQualityRef.current;
            if (requested === "auto") hls!.currentLevel = -1;
            else {
              const levelIndex = hls!.levels.findIndex((level) => String(level.height) === requested);
              hls!.currentLevel = levelIndex >= 0 ? levelIndex : -1;
            }
            restorePosition();
          });
          hls.on(Hls.Events.ERROR, (_event, data) => { if (data.fatal && !cancelled) setError("Video playback is temporarily unavailable."); });
          hls.loadSource(payload.manifestUrl);
          hls.attachMedia(video);
        } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
          video.src = payload.manifestUrl;
          setQualityOptions([{ value: "auto", label: "Auto (device)" }]);
          video.addEventListener("loadedmetadata", restorePosition, { once: true });
        } else {
          throw new Error("hls_not_supported");
        }
        setError("");
        const refreshDelay = Math.max(30_000, payload.expiresAt * 1000 - Date.now() - 60_000);
        refreshTimer = setTimeout(() => { void loadPlayback(true); }, refreshDelay);
      } catch { if (!cancelled) setError("Video playback is temporarily unavailable."); }
    }

    void loadPlayback(false);
    return () => { cancelled = true; if (refreshTimer) clearTimeout(refreshTimer); hls?.destroy(); hlsRef.current = null; video.removeAttribute("src"); video.load(); };
  }, [playbackEndpoint]);

  return <div><video ref={videoRef} controls playsInline preload="metadata" className={className} aria-label={title}>Your browser does not support HLS video playback.</video>
    {qualityOptions.length ? <label className="mt-2 flex items-center justify-end gap-2 text-sm text-zinc-300">Quality<select aria-label="Video quality" value={selectedQuality} onChange={(event) => selectQuality(event.target.value)} className="min-h-9 rounded border border-white/15 bg-black px-2 text-white">{qualityOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label> : null}
    {error ? <p role="alert" className="mt-2 text-sm text-rose-200">{error}</p> : null}</div>;
}
