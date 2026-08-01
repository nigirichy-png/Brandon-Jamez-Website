import type { Metadata } from "next";

import { creatorLinks } from "@/data/public-links";

export const metadata: Metadata = { title: "Videos" };

const youtubeActionClass = "inline-flex min-h-12 w-fit items-center justify-center rounded-full px-6 py-3 text-sm font-extrabold text-white transition-colors duration-[var(--transition-fast)]";

export default function VideosPage() {
  return (
    <main id="main-content" className="flex-1">
      <section className="relative overflow-hidden border-b border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.025),transparent)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_82%_18%,rgba(229,79,236,0.15),transparent_34%),radial-gradient(circle_at_10%_88%,rgba(94,232,237,0.08),transparent_30%)]" aria-hidden="true" />
        <div className="page-shell relative py-10 sm:py-14 lg:py-16">
          <p className="eyebrow text-cyan-300">Videos</p>
          <h1 className="font-display mt-4 max-w-5xl text-[clamp(2.75rem,10vw,5.5rem)] font-bold leading-[0.95] tracking-[-0.055em] text-white">Livestreams, highlights and real moments.</h1>
          <p className="mt-5 max-w-2xl text-[clamp(1rem,2.4vw,1.18rem)] leading-8 text-zinc-300">Watch Brandon Jamez on YouTube for the latest livestreams, videos and updates from Pattaya.</p>
          <a href={creatorLinks.youtube} target="_blank" rel="noopener noreferrer" aria-label="Open Brandon Jamez on YouTube (opens in a new tab)" className={`${youtubeActionClass} mt-6 bg-fuchsia-600 shadow-[var(--shadow-accent)] hover:bg-fuchsia-500`}>Open YouTube <span className="ml-2" aria-hidden="true">↗</span></a>
        </div>
      </section>

      <section className="page-shell py-12 sm:py-16 lg:py-20" aria-labelledby="latest-content-title">
        <article className="relative grid gap-8 overflow-hidden rounded-[var(--radius-xl)] border border-white/10 bg-[var(--surface)] p-7 sm:p-10 lg:grid-cols-[1fr_.72fr] lg:items-center lg:gap-12 lg:p-12">
          <div className="relative z-10">
            <p className="eyebrow text-fuchsia-300">Latest content</p>
            <h2 id="latest-content-title" className="font-display mt-4 max-w-2xl text-[clamp(2.25rem,6vw,4rem)] font-bold leading-[1] tracking-[-0.05em] text-white">Watch the latest on YouTube.</h2>
            <p className="mt-5 max-w-2xl leading-8 text-zinc-300">Brandon&apos;s newest livestreams, highlights and channel updates are available on his official YouTube channel.</p>
            <a href={creatorLinks.youtube} target="_blank" rel="noopener noreferrer" aria-label="Visit Brandon Jamez's YouTube channel (opens in a new tab)" className={`${youtubeActionClass} mt-6 border border-cyan-300/30 bg-cyan-300/[0.07] text-cyan-100 hover:bg-cyan-300/[0.13]`}>Visit Brandon&apos;s channel <span className="ml-2" aria-hidden="true">↗</span></a>
          </div>

          <div className="relative h-40 overflow-hidden rounded-[var(--radius-lg)] border border-white/10 bg-[linear-gradient(145deg,rgba(229,79,236,0.16),rgba(17,17,24,0.92)_48%,rgba(94,232,237,0.09))] sm:h-48 lg:h-72" aria-hidden="true">
            <div className="absolute -right-14 -top-16 size-48 rounded-full border-[30px] border-fuchsia-400/15 lg:size-60 lg:border-[38px]" />
            <div className="absolute -bottom-24 -left-12 size-48 rounded-full border-[28px] border-cyan-300/10 lg:size-56" />
            <div className="font-display absolute right-5 top-1/2 -translate-y-1/2 text-[8rem] font-bold tracking-[-0.1em] text-white/[0.035] sm:text-[10rem] lg:right-8 lg:text-[13rem]">BJ</div>
            <div className="absolute inset-x-6 bottom-6 lg:inset-x-8 lg:bottom-8">
              <p className="font-display text-3xl font-bold tracking-[-0.05em] text-white sm:text-4xl lg:text-5xl">BRANDON JAMEZ</p>
              <div className="mt-3 flex items-center gap-3"><span className="h-1 w-14 rounded-full bg-fuchsia-500" /><span className="eyebrow text-cyan-200/70">YouTube</span></div>
            </div>
          </div>
        </article>
      </section>
    </main>
  );
}
