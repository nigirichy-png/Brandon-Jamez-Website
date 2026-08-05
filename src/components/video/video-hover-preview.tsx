"use client";

import { useState } from "react";

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
  const previewUrl = platform === "youtube" ? getYouTubeHoverPreviewUrl(videoUrl) : null;
  const startPreview = () => {
    if (!previewUrl || !window.matchMedia("(hover: hover) and (pointer: fine)").matches || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setActive(true);
  };

  return <a href={videoUrl} target="_blank" rel="noopener noreferrer" aria-label={`Watch ${title} (opens in a new tab)`} className="platform-video-preview-link group" onMouseEnter={startPreview} onMouseLeave={() => setActive(false)} onFocus={startPreview} onBlur={() => setActive(false)}>
    <CmsVideoPreview title={title} platform={platform} videoUrl={videoUrl} priority={priority} sizes={sizes} editorial />
    {active && previewUrl ? <iframe className="platform-video-hover-frame" src={previewUrl} title={`Muted preview of ${title}`} allow="autoplay; encrypted-media; picture-in-picture" tabIndex={-1} /> : null}
  </a>;
}
