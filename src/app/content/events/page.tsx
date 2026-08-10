import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { CreateCmsEventForm, CmsEventRecord } from "@/components/content/event-cms-forms";
import { InternalShell } from "@/components/internal/internal-shell";
import { StaffAccessGate } from "@/components/internal/staff-access-gate";
import { StatusLabel } from "@/components/internal/status-label";
import { resolveStaffAccessState } from "@/lib/auth/access-state";
import { listStaffCmsEvents } from "@/lib/events/data";
import { evaluateContentViewerAccess } from "@/lib/staff/evaluate-staff-access";

export const metadata: Metadata = { title: "Event Management" };
export const dynamic = "force-dynamic";

export default async function ContentEventsPage({ searchParams }: { searchParams: Promise<{ staffDemo?: string | string[] }> }) {
  const state = await resolveStaffAccessState((await searchParams).staffDemo);
  if (!state.developmentPreview && !state.authenticated) redirect("/login?next=/content/events");
  const decision = evaluateContentViewerAccess(state);
  const events = decision.allowed && !state.developmentPreview ? await listStaffCmsEvents().catch(() => null) : [];
  const canEdit = state.roles.includes("content_manager") || state.roles.includes("admin");
  return <InternalShell state={state} decision={decision} currentPath="/content/events" eyebrow="Content · event records" title="Event records" description={canEdit ? "Create, edit, publish, archive and delete audited event records." : "Review event records with read-only moderator access."}>
    {!decision.allowed ? <StaffAccessGate decision={decision} area="content" /> : state.developmentPreview ? <section className="rounded-2xl border border-amber-300/20 bg-amber-300/[0.05] p-6"><StatusLabel tone="warning">Real session required</StatusLabel><h2 className="font-display mt-4 text-2xl font-bold text-white">Event data is unavailable in preview mode.</h2></section> : events === null ? <p role="alert" className="rounded-2xl border border-rose-300/20 bg-rose-300/[0.06] p-6 text-rose-100">Event records could not be loaded safely.</p> : <div className="space-y-8">{canEdit ? <CreateCmsEventForm /> : null}<section aria-labelledby="event-records-title"><div className="mb-5 flex flex-wrap items-center justify-between gap-3"><h2 id="event-records-title" className="font-display text-2xl font-bold text-white">Event inventory</h2><StatusLabel tone={canEdit ? "positive" : "neutral"}>{canEdit ? "Audited editor" : "Read only"}</StatusLabel></div>{events.length ? <div className="grid gap-4">{events.map((event) => <CmsEventRecord key={event.id} event={event} readOnly={!canEdit} />)}</div> : <p className="rounded-2xl border border-dashed border-white/15 p-6 text-center text-sm text-zinc-400">No event records yet.</p>}</section></div>}
  </InternalShell>;
}
