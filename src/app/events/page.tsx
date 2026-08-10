import type { Metadata } from "next";

import { creatorLinks, creatorSocialLinks } from "@/data/public-links";
import { listPublishedCmsEvents } from "@/lib/events/data";

export const metadata: Metadata = { title: "Updates" };
export const dynamic = "force-dynamic";

const externalActionClass = "inline-flex min-h-12 w-fit items-center justify-center rounded-full px-6 py-3 text-sm font-extrabold text-white transition-colors duration-[var(--transition-fast)]";

const updateChannels = creatorSocialLinks.filter(({ label }) => ["YouTube", "Instagram", "Facebook"].includes(label));

export default async function EventsPage() {
  const events = await listPublishedCmsEvents().catch(() => []);
  return (
    <main id="main-content" className="flex-1">
      <section className="relative overflow-hidden border-b border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.025),transparent)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_82%_18%,rgba(229,79,236,0.14),transparent_34%),radial-gradient(circle_at_12%_88%,rgba(94,232,237,0.08),transparent_30%)]" aria-hidden="true" />
        <div className="page-shell relative py-10 sm:py-14 lg:py-16">
          <p className="eyebrow text-cyan-300">Updates</p>
          <h1 className="font-display mt-4 max-w-5xl text-[clamp(2.75rem,10vw,5.5rem)] font-bold leading-[0.95] tracking-[-0.055em] text-white">Live streams and special announcements.</h1>
          <p className="mt-5 max-w-2xl text-[clamp(1rem,2.4vw,1.18rem)] leading-8 text-zinc-300">Brandon&apos;s streams, meetups and special plans may be announced at short notice.</p>
          <a href={creatorLinks.youtube} target="_blank" rel="noopener noreferrer" aria-label="Open Brandon Jamez on YouTube (opens in a new tab)" className={`${externalActionClass} mt-6 bg-fuchsia-600 shadow-[var(--shadow-accent)] hover:bg-fuchsia-500`}>Open YouTube <span className="ml-2" aria-hidden="true">↗</span></a>
        </div>
      </section>

      <section className="page-shell py-12 sm:py-16 lg:py-20" aria-labelledby="upcoming-title">
        <div className="relative overflow-hidden rounded-[var(--radius-xl)] border border-white/10 bg-[var(--surface)] p-7 sm:p-10 lg:p-12">
          <div className="absolute -right-16 -top-20 size-56 rounded-full border-[34px] border-fuchsia-400/[0.07]" aria-hidden="true" />
          <div className="absolute -bottom-24 -left-16 size-48 rounded-full border-[28px] border-cyan-300/[0.05]" aria-hidden="true" />
          <div className="relative max-w-3xl">
            <p className="eyebrow text-fuchsia-300">Upcoming</p>
            <h2 id="upcoming-title" className="font-display mt-4 text-[clamp(2.25rem,6vw,4rem)] font-bold leading-[1] tracking-[-0.05em] text-white">{events.length ? "Upcoming announcements." : "Nothing announced right now."}</h2>
            {events.length ? <div className="mt-7 divide-y divide-white/10 border-y border-white/10">{events.map((event) => <article key={event.id} className="py-6"><p className="text-xs font-extrabold uppercase tracking-[0.12em] text-fuchsia-300">{new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(new Date(event.starts_at))}</p><h3 className="font-display mt-2 text-2xl font-bold text-white">{event.title}</h3><p className="mt-2 text-sm font-bold text-zinc-300">{event.location}</p>{event.description ? <p className="mt-3 whitespace-pre-wrap leading-7 text-zinc-400">{event.description}</p> : null}</article>)}</div> : <p className="mt-5 max-w-2xl leading-8 text-zinc-300">Follow Brandon&apos;s official channels for the latest livestreams, meetups and updates.</p>}
            <div className="mt-7 flex flex-wrap gap-3" aria-label="Official channels for Brandon Jamez updates">
              {updateChannels.map((channel) => (
                <a key={channel.label} href={channel.href} target="_blank" rel="noopener noreferrer" aria-label={`${channel.label} (opens in a new tab)`} className={`${externalActionClass} border border-cyan-300/25 bg-cyan-300/[0.06] text-cyan-100 hover:bg-cyan-300/[0.12]`}>
                  {channel.label}<span className="ml-2" aria-hidden="true">↗</span>
                </a>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
