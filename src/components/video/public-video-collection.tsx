import { CmsVideoPreview } from "@/components/video/cms-video-preview";
import { creatorLinks } from "@/data/public-links";
import { cmsPlatformLabels, type PublicCmsVideo } from "@/lib/cms/video-model";

function formatPublishedDate(value: string | null): string {
  if (!value) return "Recently published";
  return new Intl.DateTimeFormat("en-US", { dateStyle: "long", timeZone: "UTC" }).format(new Date(value));
}

function VideoMetadata({ video }: { video: PublicCmsVideo }) {
  return <div className="flex flex-wrap items-center gap-x-2 gap-y-2 text-xs font-extrabold uppercase tracking-[0.12em]">
    <span className="rounded-full border border-cyan-300/25 bg-cyan-300/[0.07] px-3 py-1.5 text-cyan-200">{cmsPlatformLabels[video.platform]}</span>
    {video.category ? <><span className="text-white/25" aria-hidden="true">•</span><span className="text-zinc-400">{video.category}</span></> : null}
    <span className="text-white/25" aria-hidden="true">•</span>
    <time dateTime={video.published_at ?? undefined} className="text-zinc-500">{formatPublishedDate(video.published_at)}</time>
  </div>;
}

function WatchLink({ video, featured = false }: { video: PublicCmsVideo; featured?: boolean }) {
  const platform = cmsPlatformLabels[video.platform];
  return <a href={video.video_url} target="_blank" rel="noopener noreferrer" aria-label={`Watch ${video.title} on ${platform} (opens in a new tab)`} className={`inline-flex min-h-12 items-center justify-center rounded-full px-6 py-3 text-sm font-extrabold text-white transition-colors ${featured ? "bg-fuchsia-500 shadow-[var(--shadow-accent)] hover:bg-fuchsia-400" : "border border-fuchsia-300/30 bg-fuchsia-300/[0.08] hover:bg-fuchsia-300/[0.15]"}`}>Watch on {platform} <span className="ml-2" aria-hidden="true">↗</span></a>;
}

function FeaturedVideo({ video }: { video: PublicCmsVideo }) {
  return <article className="group overflow-hidden rounded-[var(--radius-lg)] border border-fuchsia-300/30 bg-[var(--surface)] shadow-[var(--shadow-accent)] lg:grid lg:grid-cols-[minmax(0,1.35fr)_minmax(19rem,0.85fr)]">
    <CmsVideoPreview title={video.title} platform={video.platform} videoUrl={video.video_url} priority sizes="(min-width: 1024px) 58vw, 100vw" />
    <div className="relative flex flex-col justify-center overflow-hidden p-6 sm:p-8 lg:p-10">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_100%_0%,rgba(229,79,236,0.16),transparent_38%)]" aria-hidden="true" />
      <div className="relative">
        <div className="mb-5"><span className="rounded-full border border-fuchsia-300/30 bg-fuchsia-300/[0.1] px-3 py-1.5 text-xs font-extrabold uppercase tracking-[0.14em] text-fuchsia-200">Featured</span></div>
        <VideoMetadata video={video} />
        <h3 className="font-display mt-5 text-[clamp(2rem,5vw,3.6rem)] font-bold leading-[0.98] tracking-[-0.052em] text-white">{video.title}</h3>
        {video.short_description ? <p className="mt-4 max-w-2xl text-base leading-7 text-zinc-300 sm:text-lg">{video.short_description}</p> : null}
        <div className="mt-7"><WatchLink video={video} featured /></div>
      </div>
    </div>
  </article>;
}

function LatestVideoCard({ video }: { video: PublicCmsVideo }) {
  return <article className="pointer-lift group flex h-full flex-col overflow-hidden rounded-[var(--radius-lg)] border border-white/10 bg-[var(--surface)] transition-[transform,border-color,box-shadow] duration-[var(--transition-base)]">
    <CmsVideoPreview title={video.title} platform={video.platform} videoUrl={video.video_url} sizes="(min-width: 1280px) 31vw, (min-width: 640px) 48vw, 100vw" />
    <div className="flex flex-1 flex-col p-5 sm:p-6">
      <VideoMetadata video={video} />
      <h3 className="font-display mt-4 text-2xl font-bold leading-tight tracking-[-0.04em] text-white">{video.title}</h3>
      {video.short_description ? <p className="mt-3 line-clamp-3 leading-6 text-zinc-400">{video.short_description}</p> : null}
      <div className="mt-auto pt-6"><WatchLink video={video} /></div>
    </div>
  </article>;
}

function EmptyVideos() {
  return <div className="relative overflow-hidden rounded-[var(--radius-lg)] border border-dashed border-white/15 bg-[var(--surface)] p-8 sm:p-10">
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_90%_10%,rgba(94,232,237,0.09),transparent_32%)]" aria-hidden="true" />
    <div className="relative"><p className="eyebrow text-cyan-300">More is coming</p><h2 className="font-display mt-3 text-2xl font-bold text-white sm:text-3xl">The video collection is being prepared.</h2><p className="mt-3 max-w-xl leading-7 text-zinc-400">No videos have been published here yet. Visit Brandon&apos;s YouTube channel for the latest streams and updates.</p><a href={creatorLinks.youtube} target="_blank" rel="noopener noreferrer" className="mt-6 inline-flex min-h-12 items-center justify-center rounded-full border border-cyan-300/30 bg-cyan-300/[0.07] px-6 py-3 text-sm font-extrabold text-cyan-100 hover:bg-cyan-300/[0.13]" aria-label="Open Brandon Jamez on YouTube (opens in a new tab)">Open YouTube <span className="ml-2" aria-hidden="true">↗</span></a></div>
  </div>;
}

export function PublicVideoCollection({ videos }: { videos: PublicCmsVideo[] }) {
  if (!videos.length) return <EmptyVideos />;

  const featured = videos.find((video) => video.featured);
  const latest = featured ? videos.filter((video) => video.id !== featured.id) : videos;

  return <div className="space-y-12 sm:space-y-16">
    {featured ? <section aria-labelledby="featured-video-title"><div className="mb-5"><p className="eyebrow text-fuchsia-300">Editor&apos;s pick</p><h2 id="featured-video-title" className="font-display mt-3 text-[clamp(2rem,6vw,3.75rem)] font-bold tracking-[-0.05em] text-white">Featured video</h2></div><FeaturedVideo video={featured} /></section> : null}
    {latest.length ? <section aria-labelledby="latest-videos-title"><div className="mb-6 sm:mb-8"><p className="eyebrow text-cyan-300">Published collection</p><h2 id="latest-videos-title" className="font-display mt-3 text-[clamp(2rem,6vw,3.75rem)] font-bold tracking-[-0.05em] text-white">{featured ? "Latest videos" : "Watch the latest"}</h2></div><div className="grid items-stretch gap-5 sm:grid-cols-2 xl:grid-cols-3">{latest.map((video) => <LatestVideoCard key={video.id} video={video} />)}</div></section> : null}
  </div>;
}
