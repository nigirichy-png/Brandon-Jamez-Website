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
  return <InternalShell state={state} decision={decision} currentPath="/admin" eyebrow="Administration" title="Control starts with boundaries." description={state.developmentPreview ? "A development-only control-center preview using fictional records." : "A server-authorized control center separating roles, account restrictions, entitlements, content, moderation, and audit responsibility."}>
    {!decision.allowed ? <StaffAccessGate decision={decision} area="admin" /> : <div className="space-y-8">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Administration summary">{state.developmentPreview ? <><SummaryCard label="Mock users" value={adminUserSummaries.length} detail="Fictional, data-minimized summaries" /><SummaryCard label="Content records" value={videoContentRecords.length + eventManagementRecords.length} detail="Fictional oversight records" accent="text-fuchsia-200" /><SummaryCard label="Open moderation" value={moderationReviewItems.filter((item) => item.status !== "reviewed").length} detail="Fictional workflow records" accent="text-amber-200" /><SummaryCard label="Audit previews" value={auditEvents.length} detail="Non-persistent examples" accent="text-emerald-200" /></> : <><SummaryCard label="Accounts" value={realSummary?.[0].total ?? 0} detail="Paginated Auth directory" /><SummaryCard label="Restricted on page" value={realSummary?.[0].users.filter((user) => user.blocked).length ?? 0} detail="Application-level restrictions" accent="text-amber-200" /><SummaryCard label="Recent audit" value={realSummary?.[1].events.length ?? 0} detail="Latest safe event page" accent="text-emerald-200" /><SummaryCard label="Entitlement" value="Separate" detail="Roles do not activate subscriptions" accent="text-fuchsia-200" /></>}</section>
      <section className="grid gap-4 md:grid-cols-3" aria-label="Administrative workspaces"><Link href={withStaffScenario("/admin/users", state.scenarioId)} className="rounded-2xl border border-white/10 bg-[#12151c] p-5 hover:border-cyan-300/30"><p className="text-xs font-extrabold uppercase tracking-wider text-cyan-300">Accounts and roles</p><h2 className="font-display mt-3 text-2xl font-bold text-white">User management</h2><p className="mt-2 text-sm leading-6 text-zinc-500">{state.developmentPreview ? "Review fictional development states." : "Review real accounts and deliberate role or restriction changes."}</p></Link><Link href={withStaffScenario("/admin/content", state.scenarioId)} className="rounded-2xl border border-white/10 bg-[#12151c] p-5 hover:border-fuchsia-300/30"><p className="text-xs font-extrabold uppercase tracking-wider text-fuchsia-300">Publication oversight</p><h2 className="font-display mt-3 text-2xl font-bold text-white">Content control</h2><p className="mt-2 text-sm leading-6 text-zinc-500">Content operations remain separate from account administration.</p></Link><Link href={withStaffScenario("/admin/audit", state.scenarioId)} className="rounded-2xl border border-white/10 bg-[#12151c] p-5 hover:border-emerald-300/30"><p className="text-xs font-extrabold uppercase tracking-wider text-emerald-300">Accountability</p><h2 className="font-display mt-3 text-2xl font-bold text-white">Audit activity</h2><p className="mt-2 text-sm leading-6 text-zinc-500">{state.developmentPreview ? "Preview fictional audit records." : "Review append-oriented trusted activity records."}</p></Link></section>
    </div>}
  </InternalShell>;
}
