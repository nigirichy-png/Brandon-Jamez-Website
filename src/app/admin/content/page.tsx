import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { InternalShell } from "@/components/internal/internal-shell";
import { StaffAccessGate } from "@/components/internal/staff-access-gate";
import { SummaryCard } from "@/components/internal/summary-card";
import { eventManagementRecords, videoContentRecords } from "@/data/internal-operations";
import { evaluateAdminAccess } from "@/lib/staff/evaluate-staff-access";
import { withStaffScenario } from "@/lib/staff/internal-navigation";
import { resolveStaffAccessState } from "@/lib/auth/access-state";

export const metadata: Metadata = { title: "Admin Content Oversight Preview" };

export default async function AdminContentPage({ searchParams }: { searchParams: Promise<{ staffDemo?: string | string[] }> }) {
  const state = await resolveStaffAccessState((await searchParams).staffDemo);
  if (!state.developmentPreview && !state.authenticated) redirect("/login?next=/admin/content");
  const decision = evaluateAdminAccess(state);
  const publicCount = videoContentRecords.filter((record) => record.accessLevel === "public").length;
  const subscriberCount = videoContentRecords.filter((record) => record.accessLevel === "subscriber").length;
  const featured = videoContentRecords.filter((record) => record.featured).length + eventManagementRecords.filter((record) => record.featured).length;
  const drafts = [...videoContentRecords, ...eventManagementRecords].filter((record) => record.publicationStatus === "draft").length;
  const archived = videoContentRecords.filter((record) => record.publicationStatus === "archived").length;
  return <InternalShell state={state} decision={decision} currentPath="/admin/content" eyebrow="Administration · content oversight" title="Oversight without bypassing workflow." description="A high-level view of mock content state. Detailed metadata work remains organized through the content-manager routes and future trusted server operations.">
    {!decision.allowed ? <StaffAccessGate decision={decision} area="admin" /> : <div className="space-y-8"><section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-label="Content oversight summary"><SummaryCard label="Public videos" value={publicCount} detail="Public metadata records" /><SummaryCard label="Subscriber videos" value={subscriberCount} detail="Protected metadata records" accent="text-fuchsia-200" /><SummaryCard label="Events" value={eventManagementRecords.length} detail="Fictional planning records" accent="text-cyan-200" /><SummaryCard label="Featured items" value={featured} detail="Mock placement flags" accent="text-emerald-200" /><SummaryCard label="Drafts" value={drafts} detail="Awaiting fictional review" accent="text-amber-200" /><SummaryCard label="Archived" value={archived} detail="Retained mock metadata" accent="text-zinc-200" /></section><section className="rounded-2xl border border-white/10 bg-[#12151c] p-6"><h2 className="font-display text-2xl font-bold text-white">Continue in content operations</h2><p className="mt-3 max-w-2xl leading-7 text-zinc-400">Admin access permits this preview, but production content changes must still use narrow validated operations and generate audit events.</p><div className="mt-5 flex flex-wrap gap-3"><Link href={withStaffScenario("/content/videos", state.scenarioId)} className="inline-flex min-h-11 items-center rounded-xl bg-cyan-300/10 px-4 text-sm font-extrabold text-cyan-100 hover:bg-cyan-300/15">Video records</Link><Link href={withStaffScenario("/content/events", state.scenarioId)} className="inline-flex min-h-11 items-center rounded-xl bg-fuchsia-300/10 px-4 text-sm font-extrabold text-fuchsia-100 hover:bg-fuchsia-300/15">Event records</Link></div></section></div>}
  </InternalShell>;
}
