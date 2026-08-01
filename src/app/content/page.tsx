import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { InternalShell } from "@/components/internal/internal-shell";
import { StaffAccessGate } from "@/components/internal/staff-access-gate";
import { StatusLabel } from "@/components/internal/status-label";
import { SummaryCard } from "@/components/internal/summary-card";
import { eventManagementRecords, videoContentRecords } from "@/data/internal-operations";
import { evaluateContentManagerAccess } from "@/lib/staff/evaluate-staff-access";
import { withStaffScenario } from "@/lib/staff/internal-navigation";
import { resolveStaffAccessState } from "@/lib/auth/access-state";

export const metadata: Metadata = { title: "Content Operations Preview" };

export default async function ContentPage({ searchParams }: { searchParams: Promise<{ staffDemo?: string | string[] }> }) {
  const state = await resolveStaffAccessState((await searchParams).staffDemo);
  if (!state.developmentPreview && !state.authenticated) redirect("/login?next=/content");
  const decision = evaluateContentManagerAccess(state);
  const drafts = videoContentRecords.filter((record) => record.publicationStatus === "draft").length + eventManagementRecords.filter((record) => record.publicationStatus === "draft").length;
  return <InternalShell state={state} decision={decision} currentPath="/content" eyebrow="Content operations" title="Shape the release, safely." description="A structured preview for coordinating public video, subscriber metadata, events, featured placement, and publication state without writing to a database.">
    {!decision.allowed ? <StaffAccessGate decision={decision} area="content" /> : <div className="space-y-8">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Content summary"><SummaryCard label="Video records" value={videoContentRecords.length} detail="Public and subscriber metadata" /><SummaryCard label="Event records" value={eventManagementRecords.length} detail="Fictional event planning records" accent="text-fuchsia-200" /><SummaryCard label="Drafts" value={drafts} detail="Mock workflow state only" accent="text-amber-200" /><SummaryCard label="Persistent writes" value="None" detail="Every control is disabled" accent="text-zinc-200" /></section>
      <section className="grid gap-5 lg:grid-cols-2"><article className="rounded-2xl border border-white/10 bg-[#12151c] p-6"><StatusLabel tone="info">Video workflow</StatusLabel><h2 className="font-display mt-4 text-3xl font-bold text-white">Metadata, access, release.</h2><p className="mt-3 leading-7 text-zinc-400">Review public and subscriber records from the existing mock source of truth, with clear asset boundaries.</p><Link href={withStaffScenario("/content/videos", state.scenarioId)} className="mt-6 inline-flex min-h-11 items-center rounded-xl bg-cyan-300/10 px-4 text-sm font-extrabold text-cyan-100 hover:bg-cyan-300/15">Open video records <span className="ml-2" aria-hidden="true">→</span></Link></article><article className="rounded-2xl border border-white/10 bg-[#12151c] p-6"><StatusLabel tone="warning">Event workflow</StatusLabel><h2 className="font-display mt-4 text-3xl font-bold text-white">Schedule with context.</h2><p className="mt-3 leading-7 text-zinc-400">Organize dates, locations, featured state, and publication readiness without publishing anything.</p><Link href={withStaffScenario("/content/events", state.scenarioId)} className="mt-6 inline-flex min-h-11 items-center rounded-xl bg-fuchsia-300/10 px-4 text-sm font-extrabold text-fuchsia-100 hover:bg-fuchsia-300/15">Open event records <span className="ml-2" aria-hidden="true">→</span></Link></article></section>
    </div>}
  </InternalShell>;
}
