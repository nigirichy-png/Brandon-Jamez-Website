import type { Metadata } from "next";

import { PageHero } from "@/components/ui/page-hero";
import { VideoCard } from "@/components/ui/video-card";
import { publicVideos } from "@/data/mock-data";

export const metadata: Metadata = { title: "Videos" };

export default function VideosPage() {
  return (
    <main id="main-content" className="flex-1">
      <PageHero eyebrow="Public library" title="Watch the public side of the story." description="Safe mock records preview a future video library. They contain no private media, public MP4 links, or connected playback provider." />
      <section className="page-shell section-space">
        <div className="mb-9 flex flex-col gap-4 border-b border-white/10 pb-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-zinc-400"><strong className="text-white">{publicVideos.length}</strong> development previews · newest first</p>
          <span className="eyebrow w-fit rounded-full border border-white/10 px-3 py-2 text-zinc-500">Playback not connected</span>
        </div>
        <div className="grid gap-5 lg:grid-cols-12">
          {publicVideos.map((video, index) => (
            <VideoCard key={video.id} video={video} featured={index === 0} className={index === 0 ? "lg:col-span-7" : index === 1 ? "lg:col-span-5" : "lg:col-span-6"} />
          ))}
        </div>
      </section>
    </main>
  );
}
