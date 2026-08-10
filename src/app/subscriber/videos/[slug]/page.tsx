import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BunnyHlsPlayer } from "@/components/video/bunny-hls-player";
import { requireSubscriberAccess } from "@/lib/entitlements/require-subscriber-access";
import { listPublishedSubscriberVideos } from "@/lib/subscriber-content/data";

export const metadata: Metadata = { title: "Subscriber video" };
export const dynamic = "force-dynamic";

export default async function SubscriberVideoPage({ params }: { params: Promise<{ slug: string }> }) {
  await requireSubscriberAccess();
  const { slug } = await params;
  const video = (await listPublishedSubscriberVideos()).find((item) => item.slug === slug);
  if (!video) notFound();
  return <main id="main-content" className="platform-page platform-subscriber-page flex-1">
    <section className="platform-shell platform-subscriber-library">
      <Link href="/subscriber" className="text-sm font-bold text-cyan-200 hover:text-white">← Back to member videos</Link>
      <div className="mt-5"><p className="platform-kicker">Private streaming</p><h1 className="font-display mt-1 text-3xl font-bold text-white sm:text-5xl">{video.title}</h1>{video.description ? <p className="mt-3 max-w-3xl text-zinc-300">{video.description}</p> : null}</div>
      <BunnyHlsPlayer playbackEndpoint={`/api/subscriber/bunny/${video.slug}`} title={video.title} className="mt-6 aspect-video w-full bg-black" />
    </section>
  </main>;
}
