import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { InternalShell } from "@/components/internal/internal-shell";
import { StaffAccessGate } from "@/components/internal/staff-access-gate";
import { StatusLabel } from "@/components/internal/status-label";
import { SummaryCard } from "@/components/internal/summary-card";
import { adminUserSummaries, auditEvents, eventManagementRecords, integrationStatuses, moderationReviewItems, videoContentRecords } from "@/data/internal-operations";
import { evaluateAdminAccess } from "@/lib/staff/evaluate-staff-access";
import { withStaffScenario } from "@/lib/staff/internal-navigation";
import { resolveStaffAccessState } from "@/lib/auth/access-state";

export const metadata: Metadata = { title: "Admin Control Center Preview" };

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ staffDemo?: string | string[] }> }) {
  const state = await resolveStaffAccessState((await searchParams).staffDemo);
  if (!state.developmentPreview && !state.authenticated) redirect("/login?next=/admin");
  const decision = evaluateAdminAccess(state);
  return <InternalShell state={state} decision={decision} currentPath="/admin" eyebrow="Administration" title="Control starts with boundaries." description="A high-level internal control-center preview separating identity, roles, entitlement, content, moderation, integrations, and audit responsibility.">
    {!decision.allowed ? <StaffAccessGate decision={decision} area="admin" /> : <div className="space-y-8">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Administration summary"><SummaryCard label="Mock users" value={adminUserSummaries.length} detail="Fictional, data-minimized summaries" /><SummaryCard label="Content records" value={videoContentRecords.length + eventManagementRecords.length} detail="Oversight across videos and events" accent="text-fuchsia-200" /><SummaryCard label="Open moderation" value={moderationReviewItems.filter((item) => item.status !== "reviewed").length} detail="Internal workflow records" accent="text-amber-200" /><SummaryCard label="Audit previews" value={auditEvents.length} detail="Append-oriented design examples" accent="text-emerald-200" /></section>
      <section aria-labelledby="integration-title"><div className="mb-4"><p className="text-xs font-extrabold uppercase tracking-[0.13em] text-cyan-300">Safe configuration view</p><h2 id="integration-title" className="font-display mt-2 text-2xl font-bold text-white">Integration status</h2></div><div className="grid gap-3 sm:grid-cols-2">{integrationStatuses.map((integration) => <article key={integration.id} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-[#12151c] p-5"><div><h3 className="font-bold text-white">{integration.label}</h3><p className="mt-1 text-sm text-zinc-500">{integration.detail}</p></div><StatusLabel tone="neutral">{integration.status}</StatusLabel></article>)}</div></section>
      <section className="grid gap-4 md:grid-cols-3" aria-label="Administrative workspaces"><Link href={withStaffScenario("/admin/users", state.scenarioId)} className="rounded-2xl border border-white/10 bg-[#12151c] p-5 hover:border-cyan-300/30"><p className="text-xs font-extrabold uppercase tracking-wider text-cyan-300">Accounts and roles</p><h2 className="font-display mt-3 text-2xl font-bold text-white">User summaries</h2><p className="mt-2 text-sm leading-6 text-zinc-500">Review safe fictional states and non-persistent admin controls.</p></Link><Link href={withStaffScenario("/admin/content", state.scenarioId)} className="rounded-2xl border border-white/10 bg-[#12151c] p-5 hover:border-fuchsia-300/30"><p className="text-xs font-extrabold uppercase tracking-wider text-fuchsia-300">Publication oversight</p><h2 className="font-display mt-3 text-2xl font-bold text-white">Content control</h2><p className="mt-2 text-sm leading-6 text-zinc-500">See content state without bypassing content-manager boundaries.</p></Link><Link href={withStaffScenario("/admin/audit", state.scenarioId)} className="rounded-2xl border border-white/10 bg-[#12151c] p-5 hover:border-emerald-300/30"><p className="text-xs font-extrabold uppercase tracking-wider text-emerald-300">Accountability</p><h2 className="font-display mt-3 text-2xl font-bold text-white">Audit activity</h2><p className="mt-2 text-sm leading-6 text-zinc-500">Preview safe, append-oriented privileged activity records.</p></Link></section>
    </div>}
  </InternalShell>;
}
