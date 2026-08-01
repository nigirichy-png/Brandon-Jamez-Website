import Link from "next/link";

import type { MockScenarioId } from "@/lib/entitlements/types";
import type { SubscriberVideo } from "@/types";

const thumbnailClasses = {
  magenta: "from-fuchsia-500/80 via-purple-950 to-[#09090d]",
  cyan: "from-cyan-400/70 via-sky-950 to-[#09090d]",
  amber: "from-amber-300/75 via-orange-950 to-[#09090d]",
  violet: "from-violet-500/80 via-indigo-950 to-[#09090d]",
};

export function SubscriberVideoCard({ video, scenarioId, featured = false }: { video: SubscriberVideo; scenarioId: MockScenarioId | null; featured?: boolean }) {
  const href = scenarioId ? `/member/videos/${video.id}?demo=${scenarioId}` : `/member/videos/${video.id}`;
  return (
    <article className={`pointer-lift group overflow-hidden rounded-[var(--radius-lg)] border border-white/10 bg-[var(--surface)] transition-[transform,border-color,box-shadow] duration-[var(--transition-base)] ${featured ? "lg:grid lg:grid-cols-[1.25fr_.75fr]" : ""}`}>
      <div className={`relative aspect-video overflow-hidden bg-gradient-to-br ${thumbnailClasses[video.thumbnailVariant]} ${featured ? "lg:aspect-auto lg:min-h-96" : ""}`} role="img" aria-label={`Abstract mock artwork for ${video.title}`}>
        <div className="absolute -right-8 -top-10 size-40 rotate-12 rounded-[2.5rem] border-[20px] border-white/10 transition-transform duration-500 group-hover:rotate-[18deg]" aria-hidden="true" />
        <div className="absolute bottom-[-25%] left-[7%] h-[65%] w-[42%] -rotate-12 rounded-full bg-white/10 blur-2xl" aria-hidden="true" />
        <div className="absolute inset-x-4 top-4 flex items-center justify-between gap-2 sm:inset-x-5 sm:top-5">
          <span className="rounded-full border border-white/20 bg-black/40 px-3 py-1.5 text-[0.68rem] font-extrabold uppercase tracking-[0.12em] text-white backdrop-blur-sm">Subscriber demo</span>
          <span className="rounded-full bg-black/60 px-3 py-1.5 text-xs font-extrabold text-white">{video.duration}</span>
        </div>
        <span className="font-display absolute bottom-5 left-5 text-3xl font-bold text-white/90" aria-hidden="true">BJ / {video.episode}</span>
      </div>
      <div className={`flex flex-col ${featured ? "justify-center p-7 sm:p-9" : "p-5 sm:p-6"}`}>
        <div className="flex flex-wrap gap-2 text-[0.7rem] font-extrabold uppercase tracking-[0.12em] text-cyan-300"><span>{video.category}</span><span className="text-white/25" aria-hidden="true">•</span><time className="text-zinc-500">{video.publishedAt}</time></div>
        <h3 className={`font-display mt-3 font-bold tracking-tight text-white ${featured ? "text-3xl sm:text-4xl" : "text-xl sm:text-2xl"}`}><Link href={href} className="rounded-sm decoration-fuchsia-400 decoration-2 underline-offset-4 hover:underline">{video.title}</Link></h3>
        <p className="mt-3 leading-6 text-zinc-400">{video.description}</p>
        {video.progressPercent > 0 ? (
          <div className="mt-5">
            <div className="mb-2 flex justify-between text-xs font-bold text-zinc-400"><span>Continue watching</span><span>{video.progressPercent}%</span></div>
            <progress aria-label={`${video.progressPercent}% watched`} value={video.progressPercent} max="100" className="h-1.5 w-full accent-fuchsia-400" />
          </div>
        ) : null}
        <Link href={href} className="mt-5 inline-flex min-h-11 items-center self-start rounded text-sm font-extrabold text-cyan-300 hover:text-cyan-200">View details <span className="ml-2" aria-hidden="true">→</span></Link>
      </div>
    </article>
  );
}
