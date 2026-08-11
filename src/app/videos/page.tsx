import type { Metadata } from "next";

import { PublicVideoCollection } from "@/components/video/public-video-collection";
import type { PublicVideo } from "@/lib/cms/video-model";
import { listPublishedCmsVideos } from "@/lib/cms/videos";
import { listPublishedPublicBunnyVideos } from "@/lib/public-bunny-video/data";

export const metadata: Metadata = { title: "Videos" };

export default async function VideosPage() {
  let videos: PublicVideo[] = [];
  let loadFailed = false;
  try {
    const [linkedVideos, hostedVideos] = await Promise.all([listPublishedCmsVideos(), listPublishedPublicBunnyVideos()]);
    videos = [...linkedVideos, ...hostedVideos].sort((left, right) => Number(right.featured) - Number(left.featured) || left.display_order - right.display_order || (right.published_at ?? "").localeCompare(left.published_at ?? ""));
  } catch { loadFailed = true; }
  return <main id="main-content" className="platform-page platform-video-page flex-1"><header className="platform-page-header platform-video-page-header"><div className="platform-shell platform-video-header-grid"><div><p className="platform-kicker">Video hub · Pattaya</p><h1 className="platform-title">Watch Brandon&apos;s <span>latest.</span></h1><p className="platform-copy">Livestreams, highlights and real moments from YouTube, Rumble, Kick and exclusive uploads.</p></div><aside className="platform-free-access" aria-label="Free access information"><span>Free access</span><strong>Open to everyone.</strong><p>No subscription or member account is required to watch this collection.</p></aside></div></header><section className="platform-shell platform-video-library" aria-label="Published videos">{loadFailed ? <div role="alert" className="platform-alert"><h2>Videos unavailable</h2><p>The published collection could not be loaded safely. Try again later.</p></div> : <PublicVideoCollection videos={videos} />}</section></main>;
}
