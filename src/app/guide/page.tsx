import type { Metadata } from "next";

import { creatorLinks } from "@/data/public-links";

export const metadata: Metadata = { title: "Pattaya Guide" };

const guideActionClass = "inline-flex min-h-12 w-fit items-center justify-center rounded-full px-6 py-3 text-sm font-extrabold text-white transition-colors duration-[var(--transition-fast)]";

const guideFeatures = [
  {
    title: "Places to explore",
    description: "Discover selected bars, restaurants, nightlife venues and local spots.",
  },
  {
    title: "Built for Pattaya",
    description: "Browse a focused map and place list designed around Pattaya.",
  },
  {
    title: "Save your favorites",
    description: "Keep useful places close while planning your next stop.",
  },
] as const;

export default function GuidePage() {
  return (
    <main id="main-content" className="flex-1">
      <section className="relative overflow-hidden border-b border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.025),transparent)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_82%_18%,rgba(94,232,237,0.13),transparent_34%),radial-gradient(circle_at_12%_88%,rgba(229,79,236,0.09),transparent_30%)]" aria-hidden="true" />
        <div className="page-shell relative py-10 sm:py-14 lg:py-16">
          <p className="eyebrow text-cyan-300">Pattaya Guide</p>
          <h1 className="font-display mt-4 max-w-5xl text-[clamp(2.75rem,10vw,5.5rem)] font-bold leading-[0.95] tracking-[-0.055em] text-white">Discover Pattaya with Brandon.</h1>
          <p className="mt-5 max-w-2xl text-[clamp(1rem,2.4vw,1.18rem)] leading-8 text-zinc-300">Explore nightlife, food, places and local favorites across Pattaya in Brandon&apos;s dedicated guide.</p>
          <a href={creatorLinks.pattayaGuide} target="_blank" rel="noopener noreferrer" aria-label="Open the Brandon Jamez Pattaya Guide (opens in a new tab)" className={`${guideActionClass} mt-6 bg-fuchsia-600 shadow-[var(--shadow-accent)] hover:bg-fuchsia-500`}>Open Pattaya Guide <span className="ml-2" aria-hidden="true">↗</span></a>
        </div>
      </section>

      <section className="page-shell py-12 sm:py-16 lg:py-20" aria-labelledby="guide-features-title">
        <div className="max-w-3xl">
          <p className="eyebrow text-fuchsia-300">Made for exploring</p>
          <h2 id="guide-features-title" className="font-display mt-4 text-[clamp(2.25rem,6vw,4rem)] font-bold leading-[1] tracking-[-0.05em] text-white">Pattaya, all in one focused guide.</h2>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {guideFeatures.map((feature, index) => (
            <article key={feature.title} className="relative overflow-hidden rounded-[var(--radius-lg)] border border-white/10 bg-[var(--surface)] p-6 sm:p-7">
              <span className="font-display text-5xl font-bold tracking-[-0.08em] text-white/[0.055]" aria-hidden="true">0{index + 1}</span>
              <h3 className="font-display mt-7 text-2xl font-bold tracking-[-0.035em] text-white">{feature.title}</h3>
              <p className="mt-3 leading-7 text-zinc-400">{feature.description}</p>
              <div className="absolute right-0 top-0 h-16 w-16 rounded-bl-full border-b border-l border-cyan-300/10 bg-cyan-300/[0.025]" aria-hidden="true" />
            </article>
          ))}
        </div>
      </section>

      <section className="page-shell pb-12 sm:pb-16 lg:pb-20" aria-labelledby="guide-cta-title">
        <div className="relative grid gap-8 overflow-hidden rounded-[var(--radius-xl)] border border-white/10 bg-[linear-gradient(135deg,rgba(229,79,236,0.13),rgba(17,17,24,0.96)_45%,rgba(94,232,237,0.08))] p-7 sm:p-10 lg:grid-cols-[1fr_.55fr] lg:items-center lg:gap-12 lg:p-12">
          <div className="relative z-10">
            <p className="eyebrow text-cyan-300">Explore the guide</p>
            <h2 id="guide-cta-title" className="font-display mt-4 max-w-3xl text-[clamp(2.25rem,6vw,4rem)] font-bold leading-[1] tracking-[-0.05em] text-white">Find your next place in Pattaya.</h2>
            <p className="mt-5 max-w-2xl leading-8 text-zinc-300">Open Brandon&apos;s dedicated Pattaya Guide and start exploring.</p>
            <a href={creatorLinks.pattayaGuide} target="_blank" rel="noopener noreferrer" aria-label="Launch the Brandon Jamez Pattaya Guide (opens in a new tab)" className={`${guideActionClass} mt-6 border border-cyan-300/30 bg-cyan-300/[0.07] text-cyan-100 hover:bg-cyan-300/[0.13]`}>Launch Pattaya Guide <span className="ml-2" aria-hidden="true">↗</span></a>
          </div>

          <div className="relative h-36 overflow-hidden rounded-[var(--radius-lg)] border border-white/10 bg-black/20 sm:h-44 lg:h-56" aria-hidden="true">
            <div className="absolute -right-12 -top-14 size-44 rounded-full border-[28px] border-fuchsia-400/15 lg:size-52 lg:border-[34px]" />
            <div className="absolute -bottom-20 -left-10 size-40 rounded-full border-[24px] border-cyan-300/10 lg:size-48" />
            <div className="font-display absolute bottom-5 left-5 text-4xl font-bold tracking-[-0.06em] text-white sm:bottom-7 sm:left-7 sm:text-5xl">PATTAYA</div>
            <div className="absolute bottom-5 right-5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 sm:bottom-7 sm:right-7">
              <span className="eyebrow text-fuchsia-200/80">BJ Guide</span>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
