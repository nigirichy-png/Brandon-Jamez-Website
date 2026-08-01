import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { InternalShell } from "@/components/internal/internal-shell";
import { MockActionGroup } from "@/components/internal/mock-action-group";
import { StaffAccessGate } from "@/components/internal/staff-access-gate";
import { StatusLabel } from "@/components/internal/status-label";
import { adminUserSummaries } from "@/data/internal-operations";
import { evaluateAdminAccess } from "@/lib/staff/evaluate-staff-access";
import { resolveStaffAccessState } from "@/lib/auth/access-state";

export const metadata: Metadata = { title: "Admin User Summaries Preview" };

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<{ staffDemo?: string | string[] }> }) {
  const state = await resolveStaffAccessState((await searchParams).staffDemo);
  if (!state.developmentPreview && !state.authenticated) redirect("/login?next=/admin/users");
  const decision = evaluateAdminAccess(state);
  return <InternalShell state={state} decision={decision} currentPath="/admin/users" eyebrow="Administration · users" title="Minimum data, explicit privilege." description="Safe fictional account summaries demonstrate future role and restriction workflows without emails, contact details, identity documents, payment data, or mutations.">
    {!decision.allowed ? <StaffAccessGate decision={decision} area="admin" /> : <section aria-labelledby="user-summary-title"><div className="mb-5 flex flex-wrap items-center justify-between gap-3"><h2 id="user-summary-title" className="font-display text-2xl font-bold text-white">Fictional user summaries</h2><StatusLabel tone="warning">Admin actions disabled</StatusLabel></div><div className="grid gap-4 xl:grid-cols-2">{adminUserSummaries.map((user) => <article key={user.id} className="rounded-2xl border border-white/10 bg-[#12151c] p-5 sm:p-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-extrabold uppercase tracking-[0.12em] text-zinc-600">{user.id}</p><h3 className="font-display mt-2 text-xl font-bold text-white">{user.displayName}</h3></div><StatusLabel tone={user.accountStatus === "blocked" ? "danger" : "positive"}>{user.accountStatus}</StatusLabel></div><div className="mt-4 flex flex-wrap gap-2">{user.roles.map((role) => <StatusLabel key={role} tone="info">{role.replace("_", " ")}</StatusLabel>)}</div><dl className="mt-5 grid gap-3 border-y border-white/10 py-4 text-sm min-[430px]:grid-cols-2"><div><dt className="text-zinc-600">Age verification</dt><dd className="mt-1 font-bold text-zinc-300">{user.ageVerificationStatus.replace("_", " ")}</dd></div><div><dt className="text-zinc-600">Subscription</dt><dd className="mt-1 font-bold text-zinc-300">{user.subscriptionStatus}</dd></div><div><dt className="text-zinc-600">Created</dt><dd className="mt-1 font-bold text-zinc-300">{user.createdAt}</dd></div><div><dt className="text-zinc-600">Last activity</dt><dd className="mt-1 font-bold text-zinc-300">{user.lastActivityLabel}</dd></div></dl><div className="mt-5"><MockActionGroup actions={["View account summary", "Assign role", "Remove role", user.accountStatus === "blocked" ? "Restore account" : "Block account"]} /></div></article>)}</div></section>}
  </InternalShell>;
}
