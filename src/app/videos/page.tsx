import type { Metadata } from "next";

import { cmsPlatformLabels, type PublicCmsVideo } from "@/lib/cms/video-model";
import { listPublishedCmsVideos } from "@/lib/cms/videos";

export const metadata: Metadata = { title: "Videos" };
export const dynamic = "force-dynamic";

function formatPublishedDate(value: string | null): string {
  if (!value) return "Recently published";
  return new Intl.DateTimeFormat("en-US", { dateStyle: "long", timeZone: "UTC" }).format(new Date(value));
}

function PublicVideoCard({ video }: { video: PublicCmsVideo }) {
  return <article className={`relative overflow-hidden rounded-[var(--radius-lg)] border bg-[var(--surface)] p-6 sm:p-8 ${video.featured ? "border-fuchsia-300/35 shadow-[var(--shadow-accent)] lg:col-span-2" : "border-white/10"}`}>
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_90%_10%,rgba(229,79,236,0.12),transparent_30%),radial-gradient(circle_at_5%_95%,rgba(94,232,237,0.07),transparent_28%)]" aria-hidden="true" />
    <div className="relative">
      <div className="flex flex-wrap items-center gap-2 text-xs font-extrabold uppercase tracking-[0.13em]"><span className="rounded-full border border-cyan-300/25 bg-cyan-300/[0.07] px-3 py-1.5 text-cyan-200">{cmsPlatformLabels[video.platform]}</span>{video.featured ? <span className="rounded-full border border-fuchsia-300/25 bg-fuchsia-300/[0.07] px-3 py-1.5 text-fuchsia-200">Featured</span> : null}<span className="text-zinc-600">{video.category ?? "Video"}</span></div>
      <h2 className={`font-display mt-5 font-bold leading-tight tracking-[-0.04em] text-white ${video.featured ? "text-3xl sm:text-4xl" : "text-2xl sm:text-3xl"}`}>{video.title}</h2>
      <p className="mt-3 max-w-2xl leading-7 text-zinc-400">{video.short_description || `Watch this video on ${cmsPlatformLabels[video.platform]}.`}</p>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-4"><time dateTime={video.published_at ?? undefined} className="text-sm font-bold text-zinc-500">{formatPublishedDate(video.published_at)}</time><a href={video.video_url} target="_blank" rel="noopener noreferrer" aria-label={`Watch ${video.title} on ${cmsPlatformLabels[video.platform]} (opens in a new tab)`} className="inline-flex min-h-12 items-center justify-center rounded-full bg-fuchsia-500 px-6 py-3 text-sm font-extrabold text-white shadow-[var(--shadow-accent)] transition-colors hover:bg-fuchsia-400">Watch on {cmsPlatformLabels[video.platform]} <span className="ml-2" aria-hidden="true">↗</span></a></div>
    </div>
  </article>;
}

export default async function VideosPage() {
  let videos: PublicCmsVideo[] = [];
  let loadFailed = false;
  try { videos = await listPublishedCmsVideos(); } catch { loadFailed = true; }

  return <main id="main-content" className="flex-1">
    <section className="relative overflow-hidden border-b border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.025),transparent)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_82%_18%,rgba(229,79,236,0.15),transparent_34%),radial-gradient(circle_at_10%_88%,rgba(94,232,237,0.08),transparent_30%)]" aria-hidden="true" />
      <div className="page-shell relative py-10 sm:py-14 lg:py-16"><p className="eyebrow text-cyan-300">Videos</p><h1 className="font-display mt-4 max-w-5xl text-[clamp(2.75rem,10vw,5.5rem)] font-bold leading-[0.95] tracking-[-0.055em] text-white">Livestreams, highlights and real moments.</h1><p className="mt-5 max-w-2xl text-[clamp(1rem,2.4vw,1.18rem)] leading-8 text-zinc-300">Watch Brandon Jamez across YouTube, Rumble, and Kick. Only intentionally published video links appear here.</p></div>
    </section>
    <section className="page-shell py-12 sm:py-16 lg:py-20" aria-labelledby="published-videos-title">
      <div className="mb-8"><p className="eyebrow text-fuchsia-300">Published collection</p><h2 id="published-videos-title" className="font-display mt-3 text-[clamp(2rem,6vw,3.75rem)] font-bold tracking-[-0.05em] text-white">Latest videos</h2></div>
      {loadFailed ? <div role="alert" className="rounded-[var(--radius-lg)] border border-rose-300/20 bg-rose-300/[0.05] p-8"><h3 className="font-display text-2xl font-bold text-white">Videos are temporarily unavailable.</h3><p className="mt-3 max-w-xl leading-7 text-zinc-400">The published collection could not be loaded safely. Please try again later.</p></div> : videos.length ? <div className="grid gap-5 lg:grid-cols-2">{videos.map((video) => <PublicVideoCard key={video.id} video={video} />)}</div> : <div className="rounded-[var(--radius-lg)] border border-dashed border-white/15 bg-[var(--surface)] p-8 sm:p-10"><h3 className="font-display text-2xl font-bold text-white">The video collection is being prepared.</h3><p className="mt-3 max-w-xl leading-7 text-zinc-400">No videos have been published yet. Check back soon for the first release.</p></div>}
    </section>
  </main>;
}
