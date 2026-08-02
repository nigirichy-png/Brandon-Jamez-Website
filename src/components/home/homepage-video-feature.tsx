import Link from "next/link";

import { CmsVideoPreview } from "@/components/video/cms-video-preview";
import { VideoPlatformBadge, VideoPlatformIcon, videoPlatformIdentities } from "@/components/video/video-platform-identity";
import { creatorLinks } from "@/data/public-links";
import type { PublicCmsVideo } from "@/lib/cms/video-model";

function formatPublishedDate(value: string | null): string {
  if (!value) return "Recently published";
  return new Intl.DateTimeFormat("en-US", { dateStyle: "long", timeZone: "UTC" }).format(new Date(value));
}

function HomepageVideoEmpty({ loadFailed }: { loadFailed: boolean }) {
  return <div role={loadFailed ? "alert" : undefined} className="relative overflow-hidden rounded-[var(--radius-lg)] border border-dashed border-white/15 bg-[var(--surface)] p-7 sm:p-9">
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_90%_10%,rgba(229,79,236,0.11),transparent_32%),radial-gradient(circle_at_5%_95%,rgba(94,232,237,0.07),transparent_30%)]" aria-hidden="true" />
    <div className="relative"><h3 className="font-display text-2xl font-bold tracking-[-0.035em] text-white sm:text-3xl">{loadFailed ? "Video updates are taking a moment." : "The next video is on its way."}</h3><p className="mt-3 max-w-2xl leading-7 text-zinc-400">{loadFailed ? "The published collection could not be loaded safely. Visit the Videos page or try again shortly." : "Nothing has been published here yet. Explore the Videos page or follow Brandon on YouTube for new releases."}</p><div className="mt-6 flex flex-col gap-3 min-[420px]:flex-row min-[420px]:flex-wrap"><Link href="/videos" className="inline-flex min-h-12 items-center justify-center rounded-full bg-fuchsia-500 px-6 py-3 text-sm font-extrabold text-white shadow-[var(--shadow-accent)] hover:bg-fuchsia-400">View all videos</Link><a href={creatorLinks.youtube} target="_blank" rel="noopener noreferrer" aria-label="Open Brandon Jamez on YouTube (opens in a new tab)" className="inline-flex min-h-12 items-center justify-center rounded-full border border-cyan-300/30 bg-cyan-300/[0.07] px-6 py-3 text-sm font-extrabold text-cyan-100 hover:bg-cyan-300/[0.13]">Open YouTube <span className="ml-2" aria-hidden="true">↗</span></a></div></div>
  </div>;
}

export function HomepageVideoFeature({ video, loadFailed = false }: { video: PublicCmsVideo | null; loadFailed?: boolean }) {
  const identity = video ? videoPlatformIdentities[video.platform] : null;
  const title = video?.title.trim() || "Latest from Brandon";

  return <section className="page-shell py-12 sm:py-16 lg:py-20" aria-labelledby="homepage-video-title" data-homepage-video-section>
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4 sm:mb-8"><div><p className="eyebrow text-fuchsia-300">Latest from Brandon</p><h2 id="homepage-video-title" className="font-display mt-3 text-[clamp(2.25rem,7vw,4.5rem)] font-bold leading-[0.98] tracking-[-0.052em] text-white">A moment worth watching.</h2></div><Link href="/videos" className="hidden min-h-11 items-center rounded-full border border-white/15 px-5 py-2.5 text-sm font-extrabold text-zinc-200 hover:border-cyan-300/40 hover:text-white sm:inline-flex">View all videos <span className="ml-2" aria-hidden="true">→</span></Link></div>
    {!video || !identity ? <HomepageVideoEmpty loadFailed={loadFailed} /> : <article className="group overflow-hidden rounded-[var(--radius-lg)] border border-white/10 bg-[var(--surface)] shadow-[var(--shadow-card)] lg:grid lg:grid-cols-[minmax(0,1.18fr)_minmax(20rem,0.82fr)]">
      <CmsVideoPreview title={title} platform={video.platform} videoUrl={video.video_url} sizes="(min-width: 1024px) 55vw, 100vw" />
      <div className="relative flex flex-col justify-center overflow-hidden p-6 sm:p-8 lg:p-10"><div className={`absolute inset-0 bg-gradient-to-br opacity-[0.12] ${identity.previewClass}`} aria-hidden="true" /><div className="relative">{video.featured ? <span className="inline-flex min-h-7 items-center rounded-full border border-fuchsia-300/30 bg-fuchsia-300/[0.1] px-3 py-1 text-xs font-extrabold uppercase tracking-[0.13em] text-fuchsia-200">Featured</span> : null}<div className={`${video.featured ? "mt-4" : ""} flex flex-wrap items-center gap-x-2 gap-y-2 text-xs font-extrabold uppercase tracking-[0.11em]`}><VideoPlatformBadge platform={video.platform} />{video.category ? <><span className="text-white/25" aria-hidden="true">•</span><span className="text-zinc-400">{video.category}</span></> : null}<span className="text-white/25" aria-hidden="true">•</span><time dateTime={video.published_at ?? undefined} className="text-zinc-500">{formatPublishedDate(video.published_at)}</time></div><h3 className="font-display mt-5 text-[clamp(2rem,5vw,3.6rem)] font-bold leading-[0.98] tracking-[-0.052em] text-white">{title}</h3>{video.short_description ? <p className="mt-4 max-w-2xl leading-7 text-zinc-300">{video.short_description}</p> : null}<div className="mt-7 flex flex-col gap-3 min-[420px]:flex-row min-[420px]:flex-wrap"><a href={video.video_url} target="_blank" rel="noopener noreferrer" aria-label={`${identity.watchLabel}: ${title} (opens in a new tab)`} className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-full border px-6 py-3 text-sm font-extrabold transition-[color,background-color,filter] ${identity.watchButtonClass}`}><VideoPlatformIcon platform={video.platform} className="size-5 shrink-0" /><span>{identity.watchLabel}</span><span aria-hidden="true">↗</span></a><Link href="/videos" className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/15 bg-white/[0.035] px-6 py-3 text-sm font-extrabold text-zinc-200 hover:border-cyan-300/40 hover:text-white sm:hidden">View all videos</Link></div></div></div>
    </article>}
  </section>;
}
