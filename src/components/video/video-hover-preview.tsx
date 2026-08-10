"use client";

import { useEffect, useRef, useState } from "react";

import { CmsVideoPreview } from "@/components/video/cms-video-preview";
import type { CmsVideoPlatform } from "@/lib/cms/video-model";
import { getYouTubeHoverPreviewUrl } from "@/lib/cms/video-links";

type VideoHoverPreviewProps = {
  title: string;
  platform: CmsVideoPlatform;
  videoUrl: string;
  priority?: boolean;
  sizes: string;
};

export function VideoHoverPreview({ title, platform, videoUrl, priority = false, sizes }: VideoHoverPreviewProps) {
  const [active, setActive] = useState(false);
  const [playing, setPlaying] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const previewUrl = platform === "youtube" ? getYouTubeHoverPreviewUrl(videoUrl) : null;

  useEffect(() => {
    if (!active) return;
    const handlePlayerMessage = (event: MessageEvent) => {
      if (event.origin !== "https://www.youtube-nocookie.com" || event.source !== iframeRef.current?.contentWindow) return;
      try {
        const payload = typeof event.data === "string" ? JSON.parse(event.data) as { info?: { playerState?: number } } : event.data as { info?: { playerState?: number } };
        if (payload?.info?.playerState === 1) setPlaying(true);
      } catch {
        // Ignore non-player messages from the embedded provider.
      }
    };
    window.addEventListener("message", handlePlayerMessage);
    return () => window.removeEventListener("message", handlePlayerMessage);
  }, [active]);

  const startPreview = () => {
    if (!previewUrl || !window.matchMedia("(hover: hover) and (pointer: fine)").matches || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setPlaying(false);
    setActive(true);
  };
  const stopPreview = () => {
    setActive(false);
    setPlaying(false);
  };
  const connectPlayer = () => {
    const target = iframeRef.current?.contentWindow;
    if (!target) return;
    target.postMessage(JSON.stringify({ event: "listening", id: "public-video-hover-preview" }), "https://www.youtube-nocookie.com");
    target.postMessage(JSON.stringify({ event: "command", func: "playVideo", args: [] }), "https://www.youtube-nocookie.com");
  };

  return <a href={videoUrl} target="_blank" rel="noopener noreferrer" aria-label={`Watch ${title} (opens in a new tab)`} className="platform-video-preview-link group" onMouseEnter={startPreview} onMouseLeave={stopPreview} onFocus={startPreview} onBlur={stopPreview}>
    <CmsVideoPreview title={title} platform={platform} videoUrl={videoUrl} priority={priority} sizes={sizes} editorial />
    {active && previewUrl ? <iframe ref={iframeRef} className={`platform-video-hover-frame${playing ? " is-ready" : ""}`} src={previewUrl} title={`Muted preview of ${title}`} allow="autoplay; encrypted-media; picture-in-picture" tabIndex={-1} onLoad={connectPlayer} /> : null}
  </a>;
}
