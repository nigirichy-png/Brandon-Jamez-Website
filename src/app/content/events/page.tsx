import type { Metadata } from "next";

import { InternalShell } from "@/components/internal/internal-shell";
import { MockActionGroup } from "@/components/internal/mock-action-group";
import { StaffAccessGate } from "@/components/internal/staff-access-gate";
import { StatusLabel } from "@/components/internal/status-label";
import { eventManagementRecords } from "@/data/internal-operations";
import { evaluateContentManagerAccess } from "@/lib/staff/evaluate-staff-access";
import { getMockStaffScenario } from "@/lib/staff/mock-staff-scenarios";

export const metadata: Metadata = { title: "Event Management Preview" };
const publicationTone = { draft: "warning", scheduled: "info", published: "positive", archived: "neutral" } as const;

export default async function ContentEventsPage({ searchParams }: { searchParams: Promise<{ staffDemo?: string | string[] }> }) {
  const state = getMockStaffScenario((await searchParams).staffDemo);
  const decision = evaluateContentManagerAccess(state);
  return <InternalShell state={state} decision={decision} currentPath="/content/events" eyebrow="Content · event records" title="Plan the moment before publishing." description="A responsive event workflow preview using the existing fictional website records. Controls are visible but intentionally disabled.">
    {!decision.allowed ? <StaffAccessGate decision={decision} area="content" /> : <section aria-labelledby="event-records-title"><div className="mb-5 flex flex-wrap items-center justify-between gap-3"><h2 id="event-records-title" className="font-display text-2xl font-bold text-white">Mock event inventory</h2><StatusLabel tone="warning">Non-persistent actions</StatusLabel></div><div className="grid gap-4">{eventManagementRecords.map((event) => <article key={event.id} className="rounded-2xl border border-white/10 bg-[#12151c] p-5 sm:p-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-extrabold uppercase tracking-[0.12em] text-fuchsia-300">{event.date} · {event.time}</p><h3 className="font-display mt-2 text-2xl font-bold text-white">{event.title}</h3><p className="mt-2 text-sm text-zinc-400">{event.location}</p></div><div className="flex flex-wrap gap-2"><StatusLabel tone={publicationTone[event.publicationStatus]}>{event.publicationStatus}</StatusLabel><StatusLabel>{event.eventStatus}</StatusLabel>{event.featured ? <StatusLabel tone="positive">Featured</StatusLabel> : null}</div></div><div className="mt-5 border-t border-white/10 pt-5"><MockActionGroup actions={["Preview", "Edit", "Publish", "Cancel"]} /></div></article>)}</div></section>}
  </InternalShell>;
}
