import type { Metadata } from "next";
import Link from "next/link";

import { requireSubscriberAccess } from "@/lib/entitlements/require-subscriber-access";

export const metadata: Metadata = { title: "Subscriber" };

const placeholders = [
  {
    eyebrow: "Coming soon",
    title: "New subscriber releases",
    description: "Fresh subscriber updates will appear here when the first collection is ready.",
  },
  {
    eyebrow: "In preparation",
    title: "Behind-the-scenes notes",
    description: "Short production notes and project updates are being prepared for this space.",
  },
  {
    eyebrow: "Library preview",
    title: "More to explore",
    description: "This card reserves a place for future subscriber content without exposing unfinished material.",
  },
] as const;

export default async function SubscriberPage() {
  const state = await requireSubscriberAccess();
  const welcomeName = state.displayName ?? "Subscriber";

  return (
    <main id="main-content" className="flex-1">
      <section className="page-shell pb-12 pt-12 sm:pb-16 sm:pt-16 lg:pb-20 lg:pt-24">
        <p className="eyebrow text-emerald-300">Subscriber access active</p>
        <h1 className="font-display mt-4 max-w-4xl text-[clamp(3rem,9vw,6rem)] font-bold leading-[0.92] tracking-[-0.06em] text-white">
          Welcome, {welcomeName}.
        </h1>
        <p className="mt-6 max-w-2xl text-base leading-8 text-zinc-300 sm:text-lg">
          This is your subscriber home. New releases and member updates will be collected here as they become available.
        </p>
        <Link
          href="/account"
          className="mt-8 inline-flex min-h-12 items-center rounded-full border border-white/15 px-6 text-sm font-extrabold text-white hover:bg-white/[0.06]"
        >
          Back to Account
        </Link>
      </section>

      <section className="border-t border-white/10 bg-[var(--page-deep)]">
        <div className="page-shell py-14 sm:py-20 lg:py-24">
          <div className="max-w-2xl">
            <p className="eyebrow text-fuchsia-300">Subscriber library</p>
            <h2 className="font-display mt-3 text-4xl font-bold tracking-tight text-white sm:text-5xl">
              Latest subscriber content
            </h2>
            <p className="mt-4 leading-7 text-zinc-400">
              The library is ready for future releases. Nothing private or unfinished is published yet.
            </p>
          </div>

          <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {placeholders.map((item) => (
              <article key={item.title} className="rounded-2xl border border-white/10 bg-[#12151c] p-6 sm:p-7">
                <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-cyan-300">{item.eyebrow}</p>
                <h3 className="font-display mt-4 text-2xl font-bold text-white">{item.title}</h3>
                <p className="mt-3 text-sm leading-7 text-zinc-400">{item.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
