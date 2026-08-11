import Image from "next/image";

import { VideoPlatformIcon, videoPlatformIdentities } from "@/components/video/video-platform-identity";
import type { PublicVideoPlatform } from "@/lib/public-bunny-video/model";
import { getVideoThumbnailUrl } from "@/lib/cms/video-links";

type CmsVideoPreviewProps = {
  title: string;
  platform: PublicVideoPlatform;
  videoUrl: string;
  priority?: boolean;
  compact?: boolean;
  editorial?: boolean;
  sizes: string;
};

export function CmsVideoPreview({ title, platform, videoUrl, priority = false, compact = false, editorial = false, sizes }: CmsVideoPreviewProps) {
  const thumbnailUrl = getVideoThumbnailUrl(platform, videoUrl);
  const identity = videoPlatformIdentities[platform];

  return <div className={`relative aspect-video overflow-hidden ${editorial ? "bg-[var(--public-surface)]" : `bg-gradient-to-br ${identity.previewClass}`}`}>
    {thumbnailUrl ? <Image src={thumbnailUrl} alt={`${identity.label} thumbnail for ${title}`} fill priority={priority} sizes={sizes} className="object-cover transition-transform duration-500 group-hover:scale-[1.025]" unoptimized={platform === "bunny"} /> : <div role="img" aria-label={`${identity.label} preview for ${title}`} className="absolute inset-0">
      {!editorial ? <><div className="absolute -right-[8%] -top-[30%] size-[70%] rotate-12 rounded-[28%] border-[clamp(1rem,3vw,2rem)] border-white/10" aria-hidden="true" /><div className="absolute -bottom-[45%] left-[5%] size-[75%] rounded-full bg-white/[0.08] blur-2xl" aria-hidden="true" /></> : null}
      <div className={`absolute inset-0 flex flex-col items-center justify-center px-5 text-center text-white/90 ${compact ? "gap-1" : "gap-3"}`}>
        <VideoPlatformIcon platform={platform} className={compact ? "size-8" : "size-12 sm:size-16"} />
        <span className={`font-display font-bold tracking-[-0.05em] ${compact ? "text-base" : "text-xl sm:text-3xl"}`}>{identity.label}</span>
      </div>
    </div>}
    {!editorial ? <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/10" aria-hidden="true" /> : null}
  </div>;
}
