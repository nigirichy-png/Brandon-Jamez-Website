import { VideoHoverPreview } from "@/components/video/video-hover-preview";
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
  return <div className="platform-video-grid">
    {videos.map((video, index) => <article key={video.id} className="platform-video-card">
      <div className="platform-video-card-media"><VideoHoverPreview title={video.title} platform={video.platform} videoUrl={video.video_url} priority={index < 2} sizes="(min-width: 1100px) 24rem, (min-width: 640px) 50vw, 100vw" /></div>
      <div className="platform-video-card-body">
        <div className="platform-video-meta"><VideoPlatformBadge platform={video.platform} />{video.featured ? <span className="platform-featured-label">Featured</span> : null}{video.category ? <span>{video.category}</span> : null}</div>
        <h2>{video.title}</h2>
        {video.short_description ? <p>{video.short_description}</p> : null}
        <div className="platform-video-card-footer"><time dateTime={video.published_at ?? undefined}>{formatPublishedDate(video.published_at)}</time><WatchLink video={video} /></div>
      </div>
    </article>)}
  </div>;
}
