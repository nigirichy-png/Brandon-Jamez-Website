import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { RealAuditRecord } from "@/components/admin/real-audit-record";
import { UserManagementForms } from "@/components/admin/user-management-forms";
import { InternalShell } from "@/components/internal/internal-shell";
import { StaffAccessGate } from "@/components/internal/staff-access-gate";
import { StatusLabel } from "@/components/internal/status-label";
import { getAdminAccount, listAuditEvents } from "@/lib/admin/data";
import { resolveStaffAccessState } from "@/lib/auth/access-state";
import { evaluateAdminAccess } from "@/lib/staff/evaluate-staff-access";

export const metadata: Metadata = { title: "Admin Account Review" };

const messages: Record<string, string> = { role_assigned: "Role assignment verified.", role_removed: "Role removal verified.", account_blocked: "Account restriction verified.", account_restored: "Account restoration verified." };

export default async function AdminUserDetailPage({ params, searchParams }: { params: Promise<{ userId: string }>; searchParams: Promise<{ staffDemo?: string | string[]; status?: string | string[]; error?: string | string[] }> }) {
  const [{ userId }, query] = await Promise.all([params, searchParams]);
  const state = await resolveStaffAccessState(query.staffDemo);
  if (!state.developmentPreview && !state.authenticated) redirect("/login?next=/admin/users");
  const decision = evaluateAdminAccess(state);
  const account = decision.allowed && !state.developmentPreview ? await getAdminAccount(userId) : null;
  const audit = account ? await listAuditEvents(1, account.id) : null;
  const status = typeof query.status === "string" ? messages[query.status] : null;
  return <InternalShell state={state} decision={decision} currentPath="/admin/users" eyebrow="Administration · account" title={account?.displayName ?? "Account review"} description={state.developmentPreview ? "Real account details and controls are unavailable in preview mode." : "A data-minimized account summary with deliberate, server-authorized controls."}>
    {!decision.allowed ? <StaffAccessGate decision={decision} area="admin" /> : state.developmentPreview ? <p className="rounded-2xl border border-amber-300/20 bg-amber-300/[0.04] p-6 text-amber-100">Exit the development preview and use a validated real administrator account to review real users.</p> : account ? <div className="space-y-6">{status ? <p role="status" className="rounded-xl border border-emerald-300/20 bg-emerald-300/[0.06] p-4 text-sm text-emerald-100">{status}</p> : null}{query.error ? <p role="alert" className="rounded-xl border border-rose-300/20 bg-rose-300/[0.06] p-4 text-sm text-rose-100">The operation was rejected or could not be verified. The final active administrator is always protected.</p> : null}<section aria-labelledby="summary-title" className="rounded-2xl border border-white/10 bg-[#12151c] p-5 sm:p-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 id="summary-title" className="font-display text-2xl font-bold text-white">Account summary</h2><p className="mt-2 break-all text-sm text-zinc-500">{account.maskedEmail}</p></div><StatusLabel tone={account.blocked ? "danger" : "positive"}>{account.blocked ? "Restricted" : "Active"}</StatusLabel></div><dl className="mt-5 grid gap-4 border-t border-white/10 pt-5 text-sm sm:grid-cols-2 lg:grid-cols-4"><div><dt className="text-zinc-600">Roles</dt><dd className="mt-1 font-bold text-zinc-300">{account.roles.length ? account.roles.map((role) => role.replace("_", " ")).join(", ") : "None"}</dd></div><div><dt className="text-zinc-600">Age verification</dt><dd className="mt-1 font-bold text-zinc-300">{account.ageStatus.replace("_", " ")}</dd></div><div><dt className="text-zinc-600">Subscription</dt><dd className="mt-1 font-bold text-zinc-300">{account.subscriptionStatus.replace("_", " ")}</dd></div><div><dt className="text-zinc-600">Last activity</dt><dd className="mt-1 font-bold text-zinc-300">{account.lastActivityAt ? new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(account.lastActivityAt)) : "Unavailable"}</dd></div></dl></section><UserManagementForms userId={account.id} roles={account.roles} blocked={account.blocked} /><section aria-labelledby="account-audit-title"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 id="account-audit-title" className="font-display text-2xl font-bold text-white">Recent account audit</h2><Link href="/admin/audit" className="text-sm font-bold text-cyan-200 hover:text-cyan-100">All audit events</Link></div><div className="grid gap-3">{audit?.events.length ? audit.events.map((event) => <RealAuditRecord key={event.id} event={event} />) : <p className="rounded-2xl border border-white/10 bg-[#12151c] p-5 text-sm text-zinc-400">No audit events target this account yet.</p>}</div></section></div> : null}
  </InternalShell>;
}
