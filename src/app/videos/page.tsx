import type { Metadata } from "next";

import { PublicVideoCollection } from "@/components/video/public-video-collection";
import type { PublicCmsVideo } from "@/lib/cms/video-model";
import { listPublishedCmsVideos } from "@/lib/cms/videos";

export const metadata: Metadata = { title: "Videos" };

export default async function VideosPage() {
  let videos: PublicCmsVideo[] = [];
  let loadFailed = false;
  try { videos = await listPublishedCmsVideos(); } catch { loadFailed = true; }
  return <main id="main-content" className="platform-page platform-video-page flex-1"><header className="platform-page-header platform-video-page-header"><div className="platform-shell platform-video-header-grid"><div><p className="platform-kicker">Video hub · Pattaya</p><h1 className="platform-title">Watch Brandon&apos;s <span>latest.</span></h1><p className="platform-copy">Livestreams, highlights and real moments published across YouTube, Rumble and Kick.</p></div><aside className="platform-free-access" aria-label="Free access information"><span>Free access</span><strong>Open to everyone.</strong><p>No subscription or member account is required to watch this collection.</p></aside></div></header><section className="platform-shell platform-video-library" aria-label="Published videos">{loadFailed ? <div role="alert" className="platform-alert"><h2>Videos unavailable</h2><p>The published collection could not be loaded safely. Try again later.</p></div> : <PublicVideoCollection videos={videos} />}</section></main>;
}
