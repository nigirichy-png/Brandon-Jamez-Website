import type { Metadata } from "next";

import { PublicVideoCollection } from "@/components/video/public-video-collection";
import type { PublicCmsVideo } from "@/lib/cms/video-model";
import { listPublishedCmsVideos } from "@/lib/cms/videos";

export const metadata: Metadata = { title: "Videos" };
export const dynamic = "force-dynamic";

export default async function VideosPage() {
  let videos: PublicCmsVideo[] = [];
  let loadFailed = false;
  try { videos = await listPublishedCmsVideos(); } catch { loadFailed = true; }
  return <main id="main-content" className="platform-page flex-1"><header className="platform-shell platform-page-header py-10 sm:py-14"><p className="platform-kicker">Videos · Pattaya</p><h1 className="platform-title">Watch Brandon&apos;s latest.</h1><p className="platform-copy">Livestreams, highlights and real moments published across YouTube, Rumble and Kick.</p></header><section className="platform-shell pb-12 sm:pb-16" aria-label="Published videos">{loadFailed ? <div role="alert" className="platform-alert"><h2>Videos unavailable</h2><p>The published collection could not be loaded safely. Try again later.</p></div> : <PublicVideoCollection videos={videos} />}</section></main>;
}
