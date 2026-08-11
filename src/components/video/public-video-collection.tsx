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

function isShortFormVideo(video: PublicCmsVideo): boolean {
  if (/(^|[\s/_-])(shorts?|clips?)([\s/_-]|$)/i.test(video.category ?? "")) return true;
  try {
    const url = new URL(video.video_url);
    const path = url.pathname.toLowerCase();
    return url.hostname.toLowerCase().startsWith("clips.")
      || /\/(shorts?|clips?)(\/|$)/.test(path);
  } catch {
    return false;
  }
}

function VideoGrid({ videos, priority = false }: { videos: PublicCmsVideo[]; priority?: boolean }) {
  return <div className="platform-video-grid">
    {videos.map((video, index) => <article key={video.id} className="platform-video-card">
      <div className="platform-video-card-media"><VideoHoverPreview title={video.title} platform={video.platform} videoUrl={video.video_url} priority={priority && index < 2} sizes="(min-width: 1100px) 24rem, (min-width: 640px) 50vw, 100vw" /></div>
      <div className="platform-video-card-body">
        <div className="platform-video-meta"><VideoPlatformBadge platform={video.platform} />{video.featured ? <span className="platform-featured-label">Featured</span> : null}{video.category ? <span>{video.category}</span> : null}</div>
        <h2>{video.title}</h2>
        {video.short_description ? <p>{video.short_description}</p> : null}
        <div className="platform-video-card-footer"><time dateTime={video.published_at ?? undefined}>{formatPublishedDate(video.published_at)}</time><WatchLink video={video} /></div>
      </div>
    </article>)}
  </div>;
}

export function PublicVideoCollection({ videos }: { videos: PublicCmsVideo[] }) {
  if (!videos.length) return <div className="platform-alert"><h2>No videos yet</h2><p>New releases will appear here when published.</p><a href={creatorLinks.youtube} target="_blank" rel="noopener noreferrer" aria-label="Open Brandon Jamez on YouTube (opens in a new tab)" className="platform-button-primary mt-4">Open YouTube ↗</a></div>;
  const shorts = videos.filter(isShortFormVideo);
  const fullVideos = videos.filter((video) => !isShortFormVideo(video));
  return <div className="platform-video-groups">
    <nav className="platform-video-group-nav" aria-label="Video collection sections">
      <a href="#videos-and-livestreams">Videos &amp; Livestreams <span>{fullVideos.length}</span></a>
      <a href="#clips-and-shorts">Clips &amp; Shorts <span>{shorts.length}</span></a>
    </nav>
    <section id="videos-and-livestreams" className="platform-video-group" aria-labelledby="videos-and-livestreams-title">
      <header className="platform-video-group-header"><div><p>Full-length releases</p><h2 id="videos-and-livestreams-title">Videos &amp; Livestreams</h2><span>YouTube and Kick videos, streams and longer highlights.</span></div><strong>{fullVideos.length}</strong></header>
      {fullVideos.length ? <VideoGrid videos={fullVideos} priority /> : <div className="platform-video-group-empty"><strong>No full-length videos yet.</strong><span>New YouTube and Kick releases will appear here.</span></div>}
    </section>
    <section id="clips-and-shorts" className="platform-video-group" aria-labelledby="clips-and-shorts-title">
      <header className="platform-video-group-header"><div><p>Quick watch</p><h2 id="clips-and-shorts-title">Clips &amp; Shorts</h2><span>Short moments, vertical videos and quick Pattaya highlights.</span></div><strong>{shorts.length}</strong></header>
      {shorts.length ? <VideoGrid videos={shorts} /> : <div className="platform-video-group-empty"><strong>Short clips are coming soon.</strong><span>Published items categorized as Short, Shorts, Clip or Clips will appear here automatically.</span></div>}
    </section>
  </div>;
}
