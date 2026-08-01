import Link from "next/link";

import type { PublicVideo, SubscriberVideo } from "@/types";

type VideoRecord = PublicVideo | SubscriberVideo;

const thumbnailClasses = {
  magenta: "from-fuchsia-500/80 via-purple-950 to-[#09090d]",
  cyan: "from-cyan-400/70 via-sky-950 to-[#09090d]",
  amber: "from-amber-300/75 via-orange-950 to-[#09090d]",
  violet: "from-violet-500/80 via-indigo-950 to-[#09090d]",
};

type VideoCardProps = {
  video: VideoRecord;
  href?: string;
  featured?: boolean;
  className?: string;
};

export function VideoCard({ video, href, featured = false, className = "" }: VideoCardProps) {
  const isPublic = video.accessLevel === "public";
  const title = (
    <h3 className={`font-display font-bold tracking-tight text-white ${featured ? "text-2xl sm:text-3xl" : "text-xl sm:text-2xl"}`}>
      {video.title}
    </h3>
  );

  return (
    <article id={video.id} className={`pointer-lift group overflow-hidden rounded-[var(--radius-lg)] border border-white/10 bg-[var(--surface)] transition-[transform,border-color,box-shadow] duration-[var(--transition-base)] ${className}`}>
      <div className={`relative aspect-video overflow-hidden bg-gradient-to-br ${thumbnailClasses[video.thumbnailVariant]}`} aria-label={`Abstract placeholder artwork for ${video.title}`} role="img">
        <div className="absolute -right-8 -top-12 size-40 rotate-12 rounded-[2.5rem] border-[20px] border-white/10 transition-transform duration-500 group-hover:rotate-[18deg]" aria-hidden="true" />
        <div className="absolute bottom-[-30%] left-[8%] h-[70%] w-[38%] -rotate-12 rounded-full bg-white/[0.08] blur-xl" aria-hidden="true" />
        <div className="absolute inset-x-4 top-4 flex items-center justify-between gap-2 sm:inset-x-5 sm:top-5">
          <span className="rounded-full border border-white/20 bg-black/35 px-3 py-1.5 text-[0.7rem] font-extrabold uppercase tracking-[0.12em] text-white backdrop-blur-sm">
            {isPublic ? "Public preview" : "Subscriber metadata"}
          </span>
          <span className="rounded-full bg-black/55 px-3 py-1.5 text-xs font-extrabold text-white">{video.duration}</span>
        </div>
        <div className="absolute bottom-4 left-4 flex items-center gap-2 sm:bottom-5 sm:left-5" aria-hidden="true">
          <span className="font-display text-3xl font-bold text-white/90">BJ</span>
          <span className="h-px w-10 bg-white/50" />
          <span className="text-[0.65rem] font-bold uppercase tracking-[0.17em] text-white/60">Visual study</span>
        </div>
      </div>
      <div className={featured ? "p-6 sm:p-8" : "p-5 sm:p-6"}>
        <div className="mb-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.72rem] font-extrabold uppercase tracking-[0.12em] text-cyan-300">
          <span>{video.category}</span>
          {isPublic ? <><span className="text-white/25" aria-hidden="true">•</span><time className="text-zinc-500">{video.publishedAt}</time></> : <><span className="text-white/25" aria-hidden="true">•</span><span className="text-zinc-500">Development only</span></>}
        </div>
        {href ? (
          <Link href={href} className="rounded-sm decoration-fuchsia-400 decoration-2 underline-offset-4 hover:underline">
            {title}
          </Link>
        ) : title}
        <p className={`mt-2 leading-6 text-zinc-400 ${featured ? "max-w-2xl" : "text-sm sm:text-base"}`}>{video.description}</p>
      </div>
    </article>
  );
}
