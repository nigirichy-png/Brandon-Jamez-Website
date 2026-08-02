import Image from "next/image";

import { cmsPlatformLabels, type CmsVideoPlatform } from "@/lib/cms/video-model";
import { getVideoThumbnailUrl } from "@/lib/cms/video-links";

const platformStyles: Record<CmsVideoPlatform, string> = {
  youtube: "from-red-500/75 via-red-950 to-[#09090d]",
  rumble: "from-emerald-400/65 via-emerald-950 to-[#09090d]",
  kick: "from-lime-400/65 via-lime-950 to-[#09090d]",
};

type CmsVideoPreviewProps = {
  title: string;
  platform: CmsVideoPlatform;
  videoUrl: string;
  priority?: boolean;
  sizes: string;
};

export function CmsVideoPreview({ title, platform, videoUrl, priority = false, sizes }: CmsVideoPreviewProps) {
  const thumbnailUrl = getVideoThumbnailUrl(platform, videoUrl);
  const platformLabel = cmsPlatformLabels[platform];

  return <div className={`relative aspect-video overflow-hidden bg-gradient-to-br ${platformStyles[platform]}`}>
    {thumbnailUrl ? <Image src={thumbnailUrl} alt={`YouTube thumbnail for ${title}`} fill priority={priority} sizes={sizes} className="object-cover transition-transform duration-500 group-hover:scale-[1.025]" /> : <div role="img" aria-label={`${platformLabel} preview for ${title}`} className="absolute inset-0">
      <div className="absolute -right-[8%] -top-[30%] size-[70%] rotate-12 rounded-[28%] border-[clamp(1rem,3vw,2rem)] border-white/10" aria-hidden="true" />
      <div className="absolute -bottom-[45%] left-[5%] size-[75%] rounded-full bg-white/[0.08] blur-2xl" aria-hidden="true" />
      <div className="absolute inset-0 flex items-center justify-center px-5 text-center">
        <span className="font-display text-[clamp(1.45rem,5vw,3.4rem)] font-bold tracking-[-0.055em] text-white/90">{platformLabel}</span>
      </div>
    </div>}
    <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/10" aria-hidden="true" />
    <div className="absolute bottom-3 left-3 rounded-full border border-white/20 bg-black/55 px-3 py-1.5 text-[0.68rem] font-extrabold uppercase tracking-[0.13em] text-white backdrop-blur-sm sm:bottom-4 sm:left-4">{thumbnailUrl ? platformLabel : `${platformLabel} preview`}</div>
  </div>;
}
