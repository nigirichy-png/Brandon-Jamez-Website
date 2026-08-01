import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Age Verification Plan" };

const plannedSteps = [
  ["01", "Start with a trusted provider", "The future application creates a provider session only after server-side authentication."],
  ["02", "Complete checks off-site", "Document, eID, and liveness work stays with a professional verification provider."],
  ["03", "Receive a signed result", "A verified server-to-server callback updates only the minimum status and reference data."],
];

export default function VerifyAgePage() {
  return (
    <main id="main-content" className="flex-1">
      <section className="page-shell py-14 sm:py-20 lg:py-24">
        <span className="eyebrow inline-flex rounded-full border border-amber-300/25 bg-amber-300/10 px-3 py-2 text-amber-200">Planning screen · not connected</span>
        <h1 className="font-display mt-6 max-w-5xl text-[clamp(3rem,9vw,6.5rem)] font-bold leading-[0.92] tracking-[-0.06em] text-white">Professional verification, <span className="gradient-text">minimal data.</span></h1>
        <p className="mt-6 max-w-3xl text-lg leading-8 text-zinc-300">This route explains the intended boundary. It does not verify age, collect an ID, take a selfie, create a provider session, or store information.</p>
      </section>
      <section className="border-y border-white/10 bg-[var(--page-deep)]">
        <ol className="page-shell grid gap-px py-12 sm:py-16 lg:grid-cols-3">
          {plannedSteps.map(([number, title, detail]) => <li key={number} className="border-t border-white/10 py-7 lg:border-l lg:border-t-0 lg:px-7"><span className="font-display text-xl font-bold text-fuchsia-300">{number}</span><h2 className="font-display mt-4 text-2xl font-bold text-white">{title}</h2><p className="mt-3 leading-7 text-zinc-400">{detail}</p></li>)}
        </ol>
      </section>
      <section className="page-shell section-space">
        <div className="rounded-[var(--radius-xl)] border border-cyan-300/20 bg-cyan-300/[0.045] p-7 sm:p-10 lg:p-12">
          <p className="eyebrow text-cyan-300">Development handoff</p>
          <h2 className="font-display mt-4 text-4xl font-bold tracking-tight text-white">Preview the next gated state</h2>
          <p className="mt-4 max-w-2xl leading-7 text-zinc-300">Use the signed-in, unverified scenario to see how the member page directs a future user here. The link changes only a URL parameter.</p>
          <div className="mt-7 flex flex-wrap gap-3">{process.env.NODE_ENV === "development" ? <Link href="/member?demo=signed_in_unverified" className="inline-flex min-h-12 items-center rounded-full bg-fuchsia-500 px-6 py-3 text-sm font-extrabold text-white hover:bg-fuchsia-400">Open unverified demo</Link> : null}<Link href="/" className="inline-flex min-h-12 items-center rounded-full border border-white/15 px-6 py-3 text-sm font-extrabold text-white hover:bg-white/[0.06]">Back home</Link></div>
        </div>
      </section>
    </main>
  );
}
