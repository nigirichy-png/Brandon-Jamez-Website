import Image from "next/image";

import { creatorLinks } from "@/data/public-links";

export function Hero() {
  return (
    <section className="relative isolate overflow-hidden border-b border-white/10">
      <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_78%_25%,rgba(229,79,236,0.19),transparent_31rem),radial-gradient(circle_at_5%_90%,rgba(94,232,237,0.1),transparent_25rem)]" aria-hidden="true" />
      <div className="absolute inset-y-0 left-[8%] -z-10 hidden w-px bg-gradient-to-b from-transparent via-white/10 to-transparent xl:block" aria-hidden="true" />
      <div className="page-shell grid items-center gap-9 py-10 sm:py-14 lg:min-h-[42rem] lg:grid-cols-[1.08fr_.92fr] lg:gap-10 lg:py-16">
        <div className="relative z-10">
          <div className="mb-5 inline-flex min-h-9 items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/[0.055] px-3.5 py-2 text-[0.68rem] font-extrabold uppercase tracking-[0.12em] text-cyan-200 sm:text-xs sm:tracking-[0.17em]">
            <span className="size-2 rounded-full bg-cyan-300" aria-hidden="true" />
            Creator <span aria-hidden="true">·</span> Livestreamer <span aria-hidden="true">·</span> Pattaya
          </div>
          <h1 className="font-display max-w-4xl text-[clamp(3.15rem,16vw,5.8rem)] font-bold leading-[0.86] tracking-[-0.065em] text-white lg:text-[clamp(5.3rem,8vw,7.8rem)]">
            Brandon<br />
            <span className="gradient-text">Jamez.</span>
          </h1>
          <p className="mt-5 max-w-xl text-[clamp(1.05rem,2.5vw,1.25rem)] font-medium leading-8 text-zinc-300">
            Livestreams, nightlife, real moments and life in Pattaya.
          </p>
          <div className="mt-7 flex flex-col gap-3 min-[420px]:flex-row min-[420px]:flex-wrap">
            <a
              href={creatorLinks.youtube}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Watch Brandon Jamez on YouTube (opens in a new tab)"
              className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-fuchsia-600 px-6 py-3 text-sm font-extrabold text-white shadow-[var(--shadow-accent)] transition-colors duration-[var(--transition-fast)] hover:bg-fuchsia-500 min-[420px]:w-auto"
            >
              Watch on YouTube <span aria-hidden="true" className="ml-2">↗</span>
            </a>
            <a
              href={creatorLinks.pattayaGuide}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Explore the Brandon Jamez Pattaya Guide (opens in a new tab)"
              className="inline-flex min-h-12 w-full items-center justify-center rounded-full border border-white/15 bg-white/[0.045] px-6 py-3 text-sm font-extrabold text-white transition-[background-color,border-color] duration-[var(--transition-fast)] hover:border-cyan-300/45 hover:bg-white/[0.08] min-[420px]:w-auto"
            >
              Explore Pattaya Guide <span aria-hidden="true" className="ml-2">↗</span>
            </a>
          </div>
        </div>

        <div className="relative mx-auto h-80 w-full max-w-xs sm:h-96 sm:max-w-sm lg:h-[29rem] lg:max-w-lg">
          <div className="absolute inset-x-[8%] inset-y-4 rounded-[2rem] bg-gradient-to-br from-fuchsia-500 via-violet-600 to-cyan-400 opacity-60 blur-[2px] lg:inset-8 lg:rounded-[3rem]" />
          <div className="absolute inset-1 overflow-hidden rounded-[2rem] border border-white/20 bg-[#101017]/92 shadow-[var(--shadow-card)] backdrop-blur-sm lg:inset-3 lg:rounded-[3rem]">
            <Image
              src="/brandon-clean-portrait.png"
              alt="Brandon Jamez wearing a white cap"
              width={1123}
              height={1401}
              sizes="(max-width: 639px) 20rem, (max-width: 1023px) 24rem, 32rem"
              priority
              className="h-full w-full scale-[1.04] object-cover object-top"
            />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_38%,transparent_38%,rgba(37,8,45,0.18)_68%,rgba(8,8,12,0.68)_100%),linear-gradient(180deg,rgba(31,7,38,0.12),transparent_42%,rgba(8,8,12,0.7))]" aria-hidden="true" />
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(229,79,236,0.14),transparent_45%,rgba(94,232,237,0.11))] mix-blend-soft-light ring-1 ring-inset ring-cyan-300/15" aria-hidden="true" />
          </div>
        </div>
      </div>
    </section>
  );
}
