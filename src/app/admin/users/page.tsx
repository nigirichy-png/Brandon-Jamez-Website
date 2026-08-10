import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { RealUserCard } from "@/components/admin/real-user-card";
import { InternalShell } from "@/components/internal/internal-shell";
import { StaffAccessGate } from "@/components/internal/staff-access-gate";
import { StatusLabel } from "@/components/internal/status-label";
import { adminUserSummaries } from "@/data/internal-operations";
import { listAdminAccounts, parsePage } from "@/lib/admin/data";
import { resolveStaffAccessState } from "@/lib/auth/access-state";
import { evaluateAdminAccess } from "@/lib/staff/evaluate-staff-access";

export const metadata: Metadata = { title: "Admin User Management" };

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<{ staffDemo?: string | string[]; page?: string | string[]; error?: string | string[] }> }) {
  const query = await searchParams;
  const state = await resolveStaffAccessState(query.staffDemo);
  if (!state.developmentPreview && !state.authenticated) redirect("/login?next=/admin/users");
  const decision = evaluateAdminAccess(state);
  const page = parsePage(query.page);
  const result = decision.allowed && !state.developmentPreview ? await listAdminAccounts(page) : null;
  return <InternalShell state={state} decision={decision} currentPath="/admin/users" eyebrow="Administration · users" title="User management" description={state.developmentPreview ? "Fictional account summaries for local development." : "Review accounts, roles and restrictions. Privileged changes are audited."}>
    {!decision.allowed ? <StaffAccessGate decision={decision} area="admin" /> : state.developmentPreview ? <section aria-labelledby="preview-users-title"><div className="mb-5 flex flex-wrap items-center justify-between gap-3"><h2 id="preview-users-title" className="font-display text-2xl font-bold text-white">Fictional user summaries</h2><StatusLabel tone="warning">Actions disabled</StatusLabel></div><div className="grid gap-4 xl:grid-cols-2">{adminUserSummaries.map((user) => <article key={user.id} className="rounded-2xl border border-white/10 bg-[#12151c] p-5"><h3 className="font-display text-xl font-bold text-white">{user.displayName}</h3><p className="mt-3 text-sm text-zinc-400">Development-only preview record. No real account data or mutations.</p></article>)}</div></section> : <section aria-labelledby="real-users-title"><div className="mb-5 flex flex-wrap items-center justify-between gap-3"><h2 id="real-users-title" className="font-display text-2xl font-bold text-white">Real account summaries</h2><StatusLabel tone="positive">Server authorized</StatusLabel></div>{query.error ? <p role="alert" className="mb-5 rounded-xl border border-rose-300/20 bg-rose-300/[0.06] p-4 text-sm text-rose-100">The requested account operation could not be completed.</p> : null}{result?.users.length ? <div className="grid gap-4 xl:grid-cols-2">{result.users.map((user) => <RealUserCard key={user.id} user={user} />)}</div> : <p className="rounded-2xl border border-white/10 bg-[#12151c] p-6 text-zinc-400">No accounts were found on this page.</p>}<nav aria-label="Account pages" className="mt-6 flex flex-wrap items-center justify-between gap-3"><Link aria-disabled={page <= 1} tabIndex={page <= 1 ? -1 : undefined} href={page > 1 ? `/admin/users?page=${page - 1}` : "/admin/users?page=1"} className={`inline-flex min-h-11 items-center rounded-xl border border-white/15 px-5 text-sm font-extrabold ${page <= 1 ? "pointer-events-none text-zinc-700" : "text-white hover:bg-white/[0.05]"}`}>Previous</Link><span className="text-sm font-bold text-zinc-400">Page {result?.page ?? page} of {result?.totalPages ?? 1}</span><Link aria-disabled={page >= (result?.totalPages ?? 1)} tabIndex={page >= (result?.totalPages ?? 1) ? -1 : undefined} href={page < (result?.totalPages ?? 1) ? `/admin/users?page=${page + 1}` : `/admin/users?page=${result?.totalPages ?? 1}`} className={`inline-flex min-h-11 items-center rounded-xl border border-white/15 px-5 text-sm font-extrabold ${page >= (result?.totalPages ?? 1) ? "pointer-events-none text-zinc-700" : "text-white hover:bg-white/[0.05]"}`}>Next</Link></nav></section>}
  </InternalShell>;
}
