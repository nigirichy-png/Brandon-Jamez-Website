import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { InternalShell } from "@/components/internal/internal-shell";
import { StaffAccessGate } from "@/components/internal/staff-access-gate";
import { SummaryCard } from "@/components/internal/summary-card";
import { adminUserSummaries, auditEvents, eventManagementRecords, moderationReviewItems, videoContentRecords } from "@/data/internal-operations";
import { listAdminAccounts, listAuditEvents } from "@/lib/admin/data";
import { evaluateAdminAccess } from "@/lib/staff/evaluate-staff-access";
import { withStaffScenario } from "@/lib/staff/internal-navigation";
import { resolveStaffAccessState } from "@/lib/auth/access-state";

export const metadata: Metadata = { title: "Admin Control Center" };

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ staffDemo?: string | string[] }> }) {
  const state = await resolveStaffAccessState((await searchParams).staffDemo);
  if (!state.developmentPreview && !state.authenticated) redirect("/login?next=/admin");
  const decision = evaluateAdminAccess(state);
  const realSummary = decision.allowed && !state.developmentPreview ? await Promise.all([listAdminAccounts(1), listAuditEvents(1)]) : null;
  return <InternalShell state={state} decision={decision} currentPath="/admin" eyebrow="Administration" title="Administration overview" description={state.developmentPreview ? "Development preview with fictional records." : "Manage accounts, roles, content and audit records."}>
    {!decision.allowed ? <StaffAccessGate decision={decision} area="admin" /> : <div className="space-y-7">
      <section className="grid border-t border-white/10 lg:grid-cols-2" aria-label="Administration summary">{state.developmentPreview ? <><SummaryCard label="Mock users" value={adminUserSummaries.length} detail="Fictional, data-minimized summaries" /><SummaryCard label="Content records" value={videoContentRecords.length + eventManagementRecords.length} detail="Fictional oversight records" accent="text-fuchsia-200" /><SummaryCard label="Open moderation" value={moderationReviewItems.filter((item) => item.status !== "reviewed").length} detail="Fictional workflow records" accent="text-amber-200" /><SummaryCard label="Audit previews" value={auditEvents.length} detail="Non-persistent examples" accent="text-emerald-200" /></> : <><SummaryCard label="Accounts" value={realSummary?.[0].total ?? 0} detail="Paginated Auth directory" /><SummaryCard label="Restricted on page" value={realSummary?.[0].users.filter((user) => user.blocked).length ?? 0} detail="Application-level restrictions" accent="text-amber-200" /><SummaryCard label="Recent audit" value={realSummary?.[1].events.length ?? 0} detail="Latest safe event page" accent="text-emerald-200" /><SummaryCard label="Entitlement" value="Separate" detail="Roles do not activate subscriptions" accent="text-fuchsia-200" /></>}</section>
      <section aria-labelledby="workspaces-title"><h2 id="workspaces-title" className="mb-2 text-sm font-semibold text-zinc-300">Workspaces</h2><div className="divide-y divide-white/10 border-y border-white/10"><Link href={withStaffScenario("/admin/users", state.scenarioId)} className="grid gap-1 py-3 hover:bg-white/[0.025] sm:grid-cols-[12rem_1fr]"><strong className="text-sm text-white">User management</strong><span className="text-sm text-zinc-500">{state.developmentPreview ? "Review fictional development states." : "Review accounts, roles and restrictions."}</span></Link><Link href={withStaffScenario("/admin/content", state.scenarioId)} className="grid gap-1 py-3 hover:bg-white/[0.025] sm:grid-cols-[12rem_1fr]"><strong className="text-sm text-white">Content control</strong><span className="text-sm text-zinc-500">Review publication and content operations.</span></Link><Link href={withStaffScenario("/admin/audit", state.scenarioId)} className="grid gap-1 py-3 hover:bg-white/[0.025] sm:grid-cols-[12rem_1fr]"><strong className="text-sm text-white">Audit activity</strong><span className="text-sm text-zinc-500">Review administrative activity records.</span></Link></div></section>
    </div>}
  </InternalShell>;
}
