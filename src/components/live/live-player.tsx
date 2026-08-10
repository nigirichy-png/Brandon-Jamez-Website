import type { LiveSession } from "@/lib/live/model";
import { getDirectPlaybackDescriptor } from "@/lib/live/playback";

export function LivePlayer({ session }: { session: LiveSession | null }) {
  if (!session || session.status === "offline" || session.status === "ended") return <div className="grid min-h-72 place-items-center border border-white/10 bg-black/30 p-8 text-center text-zinc-400">No stream is live right now.</div>;
  if (session.source === "youtube" && session.youtubeVideoId) return <div className="aspect-video overflow-hidden bg-black"><iframe className="h-full w-full" src={`https://www.youtube-nocookie.com/embed/${session.youtubeVideoId}`} title={session.title} allow="accelerometer; autoplay; encrypted-media; picture-in-picture" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" /></div>;
  const direct = getDirectPlaybackDescriptor(session);
  return <div className="grid min-h-72 place-items-center border border-white/10 bg-black/30 p-8 text-center text-zinc-400" data-provider={direct?.provider}>Direct playback is configured, but the external streaming provider adapter is not connected yet.</div>;
}

