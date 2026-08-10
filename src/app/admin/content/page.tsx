import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { InternalShell } from "@/components/internal/internal-shell";
import { StaffAccessGate } from "@/components/internal/staff-access-gate";
import { SummaryCard } from "@/components/internal/summary-card";
import { eventManagementRecords, videoContentRecords } from "@/data/internal-operations";
import { resolveStaffAccessState } from "@/lib/auth/access-state";
import { listAdminCmsVideos } from "@/lib/cms/videos";
import { listStaffCmsEvents } from "@/lib/events/data";
import { evaluateAdminAccess } from "@/lib/staff/evaluate-staff-access";
import { withStaffScenario } from "@/lib/staff/internal-navigation";

export const metadata: Metadata = { title: "Admin Content Oversight" };

export default async function AdminContentPage({ searchParams }: { searchParams: Promise<{ staffDemo?: string | string[] }> }) {
  const state = await resolveStaffAccessState((await searchParams).staffDemo);
  if (!state.developmentPreview && !state.authenticated) redirect("/login?next=/admin/content");
  const decision = evaluateAdminAccess(state);
  const realContent = decision.allowed && !state.developmentPreview ? await Promise.all([listAdminCmsVideos(), listStaffCmsEvents()]).catch(() => null) : null;
  const realVideos = realContent?.[0] ?? null;
  const realEvents = realContent?.[1] ?? null;
  const previewFeatured = videoContentRecords.filter((record) => record.featured).length + eventManagementRecords.filter((record) => record.featured).length;
  const previewDrafts = [...videoContentRecords, ...eventManagementRecords].filter((record) => record.publicationStatus === "draft").length;

  return <InternalShell state={state} decision={decision} currentPath="/admin/content" eyebrow="Administration · content" title="Content control" description={state.developmentPreview ? "Fictional content records for local development." : "Review video and event publication state and open the audited CMS workspaces."}>
    {!decision.allowed ? <StaffAccessGate decision={decision} area="admin" /> : <div className="space-y-8">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Content oversight summary">
        {state.developmentPreview ? <><SummaryCard label="Mock videos" value={videoContentRecords.length} detail="Fictional metadata records" /><SummaryCard label="Mock events" value={eventManagementRecords.length} detail="Fictional planning records" accent="text-cyan-200" /><SummaryCard label="Featured items" value={previewFeatured} detail="Mock placement flags" accent="text-emerald-200" /><SummaryCard label="Drafts" value={previewDrafts} detail="Non-persistent preview" accent="text-amber-200" /></> : realVideos && realEvents ? <><SummaryCard label="Videos" value={realVideos.length} detail="Audited CMS records" /><SummaryCard label="Events" value={realEvents.length} detail="Audited event records" accent="text-cyan-200" /><SummaryCard label="Published" value={realVideos.filter((video) => video.status === "published").length + realEvents.filter((event) => event.status === "published").length} detail="Visible through public RPCs" accent="text-emerald-200" /><SummaryCard label="Drafts" value={realVideos.filter((video) => video.status === "draft").length + realEvents.filter((event) => event.status === "draft").length} detail="Hidden from public reads" accent="text-amber-200" /></> : <><SummaryCard label="Videos" value="Unavailable" detail="CMS summary could not load" accent="text-rose-200" /><SummaryCard label="Events" value="Unavailable" detail="Event summary could not load" accent="text-rose-200" /><SummaryCard label="Published" value="—" detail="No state inferred" /><SummaryCard label="Drafts" value="—" detail="No state inferred" /></>}
      </section>
      <section className="rounded-2xl border border-white/10 bg-[#12151c] p-6"><h2 className="font-display text-2xl font-bold text-white">Content workspaces</h2><p className="mt-3 max-w-2xl leading-7 text-zinc-400">Video and event changes use active content-editor RPCs and append audit events. Administrators retain full access; content managers are limited to content operations.</p><div className="mt-5 flex flex-wrap gap-3"><Link href={withStaffScenario("/admin/content/videos", state.scenarioId)} className="inline-flex min-h-11 items-center rounded-xl bg-fuchsia-300/10 px-4 text-sm font-extrabold text-fuchsia-100 hover:bg-fuchsia-300/15">Manage videos</Link><Link href={withStaffScenario("/content/events", state.scenarioId)} className="inline-flex min-h-11 items-center rounded-xl bg-cyan-300/10 px-4 text-sm font-extrabold text-cyan-100 hover:bg-cyan-300/15">Manage events</Link></div></section>
    </div>}
  </InternalShell>;
}
