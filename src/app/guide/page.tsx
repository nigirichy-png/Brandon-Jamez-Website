import type { Metadata } from "next";

import { ButtonLink } from "@/components/ui/button-link";
import { PageHero } from "@/components/ui/page-hero";

export const metadata: Metadata = { title: "Pattaya Guide" };

export default function GuidePage() {
  return (
    <main id="main-content" className="flex-1">
      <PageHero eyebrow="Pattaya Guide" title="A dedicated guide, staying independent." description="The existing Brandon Jamez Pattaya Guide remains a separate project. This website does not import, copy, move, or modify it.">
        <ButtonLink href="/" variant="secondary">Back to home</ButtonLink>
      </PageHero>
      <section className="page-shell section-space grid gap-12 lg:grid-cols-[1.15fr_.85fr] lg:gap-16">
        <div>
          <p className="eyebrow text-fuchsia-300">Connection plan</p>
          <h2 className="font-display mt-4 max-w-2xl text-[clamp(2.3rem,7vw,4.25rem)] font-bold leading-[1.02] tracking-[-0.05em] text-white">A clean handoff. No shared machinery.</h2>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-zinc-400">When a final public URL is intentionally selected, this page can direct visitors to the independent Guide. Until then, the project boundary remains explicit.</p>
          <dl className="mt-10 border-t border-white/10">
            <div className="grid gap-2 border-b border-white/10 py-6 sm:grid-cols-[10rem_1fr]"><dt className="font-display text-lg font-bold text-white">Independent</dt><dd className="leading-7 text-zinc-400">The Guide keeps its own source, hosting, deployment, and release lifecycle.</dd></div>
            <div className="grid gap-2 border-b border-white/10 py-6 sm:grid-cols-[10rem_1fr]"><dt className="font-display text-lg font-bold text-white">Intentional</dt><dd className="leading-7 text-zinc-400">Only a reviewed public destination will connect the two experiences.</dd></div>
            <div className="grid gap-2 border-b border-white/10 py-6 sm:grid-cols-[10rem_1fr]"><dt className="font-display text-lg font-bold text-white">Reversible</dt><dd className="leading-7 text-zinc-400">The connection will remain a simple public link, not a code-level dependency.</dd></div>
          </dl>
        </div>
        <aside className="relative overflow-hidden rounded-[var(--radius-lg)] border border-dashed border-white/20 bg-[var(--surface)] p-7 sm:p-9 lg:self-start">
          <div className="absolute -right-16 -top-16 size-44 rounded-full border-[26px] border-cyan-300/[0.06]" aria-hidden="true" />
          <p className="eyebrow relative text-zinc-500">External destination</p>
          <h2 className="font-display relative mt-5 text-3xl font-bold text-white">Guide URL not configured</h2>
          <p className="relative mt-3 leading-7 text-zinc-400">This control is intentionally disabled until the final public address is approved.</p>
          <span aria-disabled="true" className="relative mt-8 inline-flex min-h-12 cursor-not-allowed items-center rounded-full bg-zinc-800 px-5 text-sm font-extrabold text-zinc-500">Open Pattaya Guide</span>
        </aside>
      </section>
    </main>
  );
}
