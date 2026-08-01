import Image from "next/image";

import { Hero } from "@/components/home/hero";
import { LiveStatus } from "@/components/home/live-status";
import { SocialStage } from "@/components/home/social-stage";
import { creatorLinks } from "@/data/public-links";

const externalActionClass = "inline-flex min-h-12 w-fit items-center justify-center rounded-full px-6 py-3 text-sm font-extrabold transition-[background-color,border-color,color] duration-[var(--transition-fast)]";

export default function Home() {
  return (
    <main id="main-content" className="flex-1">
      <Hero />
      <LiveStatus />
      <SocialStage />

      <section className="page-shell py-12 sm:py-16 lg:py-20" aria-label="Creator updates">
        <div className="grid gap-4 md:grid-cols-2 lg:gap-5">
          <article className="relative overflow-hidden rounded-[var(--radius-lg)] border border-white/10 bg-[var(--surface)] p-6 sm:p-8 lg:p-9">
            <div className="absolute -right-12 -top-16 size-44 rounded-full border-[26px] border-fuchsia-400/[0.07]" aria-hidden="true" />
            <div className="relative flex h-full flex-col items-start">
              <p className="eyebrow text-fuchsia-300">Latest videos</p>
              <h2 className="font-display mt-3 max-w-lg text-[clamp(2rem,5vw,3rem)] font-bold leading-[1.02] tracking-[-0.045em] text-white">Watch the latest from Brandon.</h2>
              <p className="mt-4 max-w-xl leading-7 text-zinc-400">Find Brandon&apos;s latest videos, livestreams and channel updates on YouTube.</p>
              <a href={creatorLinks.youtube} target="_blank" rel="noopener noreferrer" aria-label="Watch Brandon Jamez's latest videos on YouTube (opens in a new tab)" className={`${externalActionClass} mt-6 bg-fuchsia-600 text-white shadow-[var(--shadow-accent)] hover:bg-fuchsia-500`}>Watch latest videos <span className="ml-2" aria-hidden="true">↗</span></a>
            </div>
          </article>

          <article className="relative overflow-hidden rounded-[var(--radius-lg)] border border-white/10 bg-cyan-300/[0.035] p-6 sm:p-8 lg:p-9">
            <div className="absolute -bottom-20 -right-12 size-48 rounded-full border-[30px] border-cyan-300/[0.055]" aria-hidden="true" />
            <div className="relative flex h-full flex-col items-start">
              <p className="eyebrow text-cyan-300">Live &amp; upcoming</p>
              <h2 className="font-display mt-3 max-w-lg text-[clamp(2rem,5vw,3rem)] font-bold leading-[1.02] tracking-[-0.045em] text-white">Follow Brandon for the next stream.</h2>
              <p className="mt-4 max-w-xl leading-7 text-zinc-400">Livestream announcements and creator updates are shared through Brandon&apos;s official platforms.</p>
              <a href={creatorLinks.youtube} target="_blank" rel="noopener noreferrer" aria-label="Open Brandon Jamez on YouTube (opens in a new tab)" className={`${externalActionClass} mt-6 border border-cyan-300/30 bg-cyan-300/[0.07] text-cyan-100 hover:bg-cyan-300/[0.13]`}>Open YouTube <span className="ml-2" aria-hidden="true">↗</span></a>
            </div>
          </article>
        </div>
      </section>

      <section className="border-y border-white/10 bg-[var(--page-deep)]">
        <div className="page-shell py-12 sm:py-14 lg:py-12">
          <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[.62fr_1fr] lg:items-center lg:gap-10">
            <div className="relative w-full max-w-[29.6875rem] overflow-hidden rounded-[var(--radius-lg)] border border-white/15 bg-[var(--surface)] shadow-[var(--shadow-card)]">
              <Image
                src="/brandon-throne.png"
                alt="Brandon Jamez seated in a decorative chair"
                width={475}
                height={361}
                sizes="(max-width: 511px) calc(100vw - 3rem), (max-width: 1023px) 475px, 23rem"
                className="h-auto w-full object-cover object-center"
              />
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_46%,rgba(8,8,12,0.46)_100%),linear-gradient(180deg,rgba(31,7,38,0.08),transparent_52%,rgba(8,8,12,0.34))]" aria-hidden="true" />
              <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(229,79,236,0.09),transparent_50%,rgba(94,232,237,0.06))] mix-blend-soft-light ring-1 ring-inset ring-cyan-300/12" aria-hidden="true" />
            </div>
            <div>
              <p className="eyebrow text-fuchsia-300">About Brandon</p>
              <h2 className="font-display mt-4 max-w-4xl text-[clamp(2.25rem,6vw,4rem)] font-bold leading-[1.02] tracking-[-0.05em] text-white">Livestreams, nightlife and real life in Pattaya.</h2>
              <p className="mt-4 max-w-3xl text-[clamp(1rem,2vw,1.15rem)] leading-8 text-zinc-300">Brandon Jamez shares livestreams, nights out, local experiences and unscripted moments from Pattaya.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="page-shell py-12 sm:py-16 lg:py-20">
        <article className="relative grid gap-7 overflow-hidden rounded-[var(--radius-xl)] border border-cyan-300/15 bg-cyan-300/[0.045] p-7 sm:p-10 lg:grid-cols-[1fr_.62fr] lg:items-end lg:p-12">
          <div className="absolute -right-16 -top-20 size-56 rounded-full border-[34px] border-cyan-300/[0.07]" aria-hidden="true" />
          <div className="relative">
            <p className="eyebrow text-cyan-300">Pattaya Guide</p>
            <h2 className="font-display mt-4 max-w-2xl text-[clamp(2.25rem,6vw,4rem)] font-bold leading-[1] tracking-[-0.05em] text-white">Discover Brandon&apos;s Pattaya.</h2>
          </div>
          <div className="relative">
            <p className="max-w-xl leading-7 text-zinc-300">Explore nightlife, food, places and local favorites across Pattaya.</p>
            <a href={creatorLinks.pattayaGuide} target="_blank" rel="noopener noreferrer" aria-label="Explore the Brandon Jamez Pattaya Guide (opens in a new tab)" className={`${externalActionClass} mt-6 border border-white/15 bg-white/[0.045] text-white hover:border-cyan-300/45 hover:bg-white/[0.08]`}>Explore Pattaya Guide <span className="ml-2" aria-hidden="true">↗</span></a>
          </div>
        </article>
      </section>
    </main>
  );
}
