import { ButtonLink } from "@/components/ui/button-link";

export function Hero() {
  return (
    <section className="relative isolate overflow-hidden border-b border-white/10">
      <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_78%_25%,rgba(229,79,236,0.19),transparent_31rem),radial-gradient(circle_at_5%_90%,rgba(94,232,237,0.1),transparent_25rem)]" aria-hidden="true" />
      <div className="absolute inset-y-0 left-[8%] -z-10 hidden w-px bg-gradient-to-b from-transparent via-white/10 to-transparent xl:block" aria-hidden="true" />
      <div className="page-shell grid items-center gap-10 py-12 sm:py-16 lg:min-h-[calc(100svh-4.5rem)] lg:grid-cols-[1.08fr_.92fr] lg:gap-8 lg:py-20">
        <div className="relative z-10">
          <div className="mb-6 inline-flex min-h-9 items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/[0.055] px-3.5 py-2 text-[0.72rem] font-extrabold uppercase tracking-[0.13em] text-cyan-200 sm:text-xs sm:tracking-[0.18em]">
            <span className="size-2 rounded-full bg-cyan-300" aria-hidden="true" />
            Official site · In development
          </div>
          <h1 className="font-display max-w-4xl text-[clamp(3.15rem,16vw,5.6rem)] font-bold leading-[0.88] tracking-[-0.065em] text-white lg:text-[clamp(5.5rem,8.3vw,8.25rem)]">
            Big energy.<br />
            <span className="gradient-text">Real moments.</span>
          </h1>
          <p className="mt-6 max-w-xl text-[clamp(1rem,2.5vw,1.2rem)] leading-8 text-zinc-300">
            The new home for Brandon Jamez—public videos, live updates, events, Pattaya stories, and more as the platform takes shape.
          </p>
          <div className="mt-8 flex flex-col gap-3 min-[420px]:flex-row min-[420px]:flex-wrap">
            <ButtonLink href="/videos" className="w-full min-[420px]:w-auto">Watch public clips <span aria-hidden="true" className="ml-2">→</span></ButtonLink>
            <ButtonLink href="/subscribe" variant="secondary" className="w-full min-[420px]:w-auto">Explore membership</ButtonLink>
          </div>
        </div>

        <div className="relative mx-auto h-52 w-full max-w-xl sm:h-72 lg:h-[34rem] lg:max-w-lg" aria-hidden="true">
          <div className="absolute inset-x-[8%] inset-y-4 rotate-2 rounded-[2rem] bg-gradient-to-br from-fuchsia-500 via-violet-600 to-cyan-400 opacity-70 blur-[2px] lg:inset-8 lg:rounded-[3rem]" />
          <div className="absolute inset-1 overflow-hidden rounded-[2rem] border border-white/20 bg-[#101017]/90 shadow-[var(--shadow-card)] backdrop-blur-sm lg:inset-3 lg:rounded-[3rem]">
            <div className="absolute -right-14 -top-20 size-52 rounded-full border-[32px] border-fuchsia-500/25 lg:-right-24 lg:-top-24 lg:size-72 lg:border-[44px]" />
            <div className="absolute -bottom-24 -left-16 size-52 rounded-full border-[28px] border-cyan-400/18 lg:size-64 lg:border-[36px]" />
            <div className="absolute left-6 top-6 flex items-center gap-2 text-[0.68rem] font-bold uppercase tracking-[0.17em] text-white/60 lg:left-10 lg:top-10">
              <span className="h-px w-8 bg-cyan-300" /> Creator · Nights · Stories
            </div>
            <div className="absolute inset-x-6 bottom-6 lg:inset-x-10 lg:bottom-10">
              <p className="eyebrow text-cyan-300">Brandon</p>
              <p className="font-display mt-1 text-[clamp(3.25rem,17vw,5.75rem)] font-bold leading-[0.78] tracking-[-0.08em] text-white lg:text-8xl">JAMEZ</p>
              <div className="mt-5 flex items-center gap-3"><span className="h-1 w-16 rounded-full bg-fuchsia-500" /><span className="size-1 rounded-full bg-white/40" /><span className="size-1 rounded-full bg-white/20" /></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
