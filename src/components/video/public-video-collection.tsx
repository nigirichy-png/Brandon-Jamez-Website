import { CmsVideoPreview } from "@/components/video/cms-video-preview";
import { VideoPlatformBadge, VideoPlatformIcon, videoPlatformIdentities } from "@/components/video/video-platform-identity";
import { creatorLinks } from "@/data/public-links";
import type { PublicCmsVideo } from "@/lib/cms/video-model";

function formatPublishedDate(value: string | null): string {
  if (!value) return "Recently published";
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(value));
}

function WatchLink({ video }: { video: PublicCmsVideo }) {
  const identity = videoPlatformIdentities[video.platform];
  return <a href={video.video_url} target="_blank" rel="noopener noreferrer" aria-label={`${identity.watchLabel}: ${video.title} (opens in a new tab)`} className="platform-text-link"><VideoPlatformIcon platform={video.platform} className="size-4" />{identity.watchLabel} ↗</a>;
}

export function PublicVideoCollection({ videos }: { videos: PublicCmsVideo[] }) {
  if (!videos.length) return <div className="platform-alert"><h2>No videos yet</h2><p>New releases will appear here when published.</p><a href={creatorLinks.youtube} target="_blank" rel="noopener noreferrer" aria-label="Open Brandon Jamez on YouTube (opens in a new tab)" className="platform-button-primary mt-4">Open YouTube ↗</a></div>;
  const featured = videos.find((video) => video.featured) ?? videos[0];
  const remaining = videos.filter((video) => video.id !== featured.id);
  return <div className="platform-video-stack">
    <article className="platform-featured-video"><div className="platform-video-media"><CmsVideoPreview title={featured.title} platform={featured.platform} videoUrl={featured.video_url} priority sizes="(min-width: 900px) 60vw, 100vw" editorial /></div><div className="platform-video-info"><div className="platform-video-meta"><VideoPlatformBadge platform={featured.platform} />{featured.category ? <span>{featured.category}</span> : null}<time dateTime={featured.published_at ?? undefined}>{formatPublishedDate(featured.published_at)}</time></div><h2>{featured.title}</h2>{featured.short_description ? <p>{featured.short_description}</p> : null}<WatchLink video={featured} /></div></article>
    {remaining.length ? <div><div className="platform-list-heading"><h2>More videos</h2><span>{remaining.length} entries</span></div>{remaining.map((video, index) => <article key={video.id} className="platform-video-row"><span className="platform-row-number">{String(index + 2).padStart(2, "0")}</span><div className="platform-row-thumb"><CmsVideoPreview title={video.title} platform={video.platform} videoUrl={video.video_url} sizes="12rem" editorial /></div><div className="platform-row-copy"><div className="platform-video-meta"><VideoPlatformBadge platform={video.platform} />{video.category ? <span>{video.category}</span> : null}<time dateTime={video.published_at ?? undefined}>{formatPublishedDate(video.published_at)}</time></div><h3>{video.title}</h3>{video.short_description ? <p>{video.short_description}</p> : null}</div><WatchLink video={video} /></article>)}</div> : null}
  </div>;
}
