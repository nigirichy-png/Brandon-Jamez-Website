import type { Metadata } from "next";

import { EventCard } from "@/components/ui/event-card";
import { PageHero } from "@/components/ui/page-hero";
import { upcomingEvents } from "@/data/mock-data";

export const metadata: Metadata = { title: "Events" };

export default function EventsPage() {
  return (
    <main id="main-content" className="flex-1">
      <PageHero eyebrow="Upcoming events" title="Good nights start with a plan." description="A mock schedule for future public appearances, online sessions, and announcements. Dates and locations are not confirmed." />
      <section className="page-shell section-space">
        <div className="grid gap-10 lg:grid-cols-[.35fr_1fr]">
          <aside className="lg:pt-8">
            <p className="eyebrow text-fuchsia-300">2026 preview</p>
            <p className="mt-4 max-w-xs leading-7 text-zinc-400">A structured editorial timeline keeps every practical detail easy to scan on mobile and desktop.</p>
          </aside>
          <div>{upcomingEvents.map((event, index) => <EventCard key={event.id} event={event} index={index} />)}</div>
        </div>
        <p className="mt-10 border-l-2 border-amber-300/60 pl-5 text-sm leading-7 text-zinc-400">All listings on this development site are mock content. Confirmed event information will be clearly identified when publishing workflows are connected.</p>
      </section>
    </main>
  );
}
