import { creatorLinks } from "@/data/public-links";

export function LiveStatus() {
  return (
    <section className="page-shell pt-5 sm:pt-7" aria-labelledby="live-status-title">
      <div className="flex flex-col gap-4 rounded-[var(--radius-md)] border border-white/10 bg-white/[0.025] p-4 sm:flex-row sm:items-center sm:gap-5 sm:p-5">
        <div className="flex min-h-9 w-fit shrink-0 items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-extrabold text-zinc-200">
          <span className="size-2 rounded-full bg-zinc-500" aria-hidden="true" />
          Livestreams
        </div>
        <div className="min-w-0 flex-1">
          <h2 id="live-status-title" className="font-display text-lg font-bold tracking-tight text-white sm:text-xl">Check YouTube for the latest live stream</h2>
          <p className="mt-1 text-sm leading-6 text-zinc-400">Visit Brandon&apos;s channel for live sessions and new broadcasts.</p>
        </div>
        <a href={creatorLinks.youtube} target="_blank" rel="noopener noreferrer" aria-label="Open Brandon Jamez on YouTube (opens in a new tab)" className="inline-flex min-h-11 w-full shrink-0 items-center justify-center rounded-full border border-cyan-300/30 bg-cyan-300/[0.07] px-5 py-2.5 text-sm font-extrabold text-cyan-100 transition-colors hover:bg-cyan-300/[0.13] sm:w-auto">Open YouTube <span className="ml-2" aria-hidden="true">↗</span></a>
      </div>
    </section>
  );
}
