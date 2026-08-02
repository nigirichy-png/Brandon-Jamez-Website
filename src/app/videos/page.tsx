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

  return <main id="main-content" className="flex-1">
    <section className="relative overflow-hidden border-b border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.025),transparent)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_82%_18%,rgba(229,79,236,0.15),transparent_34%),radial-gradient(circle_at_10%_88%,rgba(94,232,237,0.08),transparent_30%)]" aria-hidden="true" />
      <div className="page-shell relative py-10 sm:py-14 lg:py-16"><p className="eyebrow text-cyan-300">Videos</p><h1 className="font-display mt-4 max-w-5xl text-[clamp(2.75rem,10vw,5.5rem)] font-bold leading-[0.95] tracking-[-0.055em] text-white">Livestreams, highlights and real moments.</h1><p className="mt-5 max-w-2xl text-[clamp(1rem,2.4vw,1.18rem)] leading-8 text-zinc-300">Watch Brandon Jamez across YouTube, Rumble, and Kick. Only intentionally published video links appear here.</p></div>
    </section>
    <section className="page-shell py-12 sm:py-16 lg:py-20" aria-label="Published videos">
      {loadFailed ? <div role="alert" className="rounded-[var(--radius-lg)] border border-rose-300/20 bg-rose-300/[0.05] p-8"><h2 className="font-display text-2xl font-bold text-white">Videos are temporarily unavailable.</h2><p className="mt-3 max-w-xl leading-7 text-zinc-400">The published collection could not be loaded safely. Please try again later.</p></div> : <PublicVideoCollection videos={videos} />}
    </section>
  </main>;
}
