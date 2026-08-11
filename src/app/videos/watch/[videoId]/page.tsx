import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BunnyHlsPlayer } from "@/components/video/bunny-hls-player";
import { listPublishedPublicBunnyVideos } from "@/lib/public-bunny-video/data";

export const metadata: Metadata = { title: "Video" };

export default async function PublicBunnyVideoPage({ params }: { params: Promise<{ videoId: string }> }) {
  const { videoId } = await params;
  const video = (await listPublishedPublicBunnyVideos()).find((item) => item.id === videoId);
  if (!video) notFound();
  return <main id="main-content" className="platform-page platform-subscriber-page flex-1">
    <section className="platform-shell platform-subscriber-library platform-subscriber-video-detail">
      <Link href="/videos" className="platform-subscriber-back"><span aria-hidden="true">←</span>Back to all videos</Link>
      <div className="mt-5"><p className="platform-kicker">Free video · Brandon Jamez</p><h1 className="platform-subscriber-video-title font-display mt-1 text-3xl font-bold text-white sm:text-5xl">{video.title}</h1>{video.short_description ? <p className="mt-3 max-w-3xl text-zinc-300">{video.short_description}</p> : null}</div>
      <div className="platform-subscriber-content-notice" role="note"><strong>Open to everyone</strong><span>This video is hosted directly by Brandon Jamez. No subscription or member account is required.</span></div>
      <BunnyHlsPlayer playbackEndpoint={`/api/videos/bunny/${video.id}`} title={video.title} className="platform-subscriber-video-player mt-5 aspect-video w-full bg-black" />
    </section>
  </main>;
}
