import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { RealAuditRecord } from "@/components/admin/real-audit-record";
import { AuditRecord } from "@/components/internal/audit-record";
import { InternalShell } from "@/components/internal/internal-shell";
import { StaffAccessGate } from "@/components/internal/staff-access-gate";
import { StatusLabel } from "@/components/internal/status-label";
import { auditEvents } from "@/data/internal-operations";
import { listAuditEvents, parsePage } from "@/lib/admin/data";
import { resolveStaffAccessState } from "@/lib/auth/access-state";
import { evaluateAdminAccess } from "@/lib/staff/evaluate-staff-access";

export const metadata: Metadata = { title: "Administrative Audit Activity" };

export default async function AdminAuditPage({ searchParams }: { searchParams: Promise<{ staffDemo?: string | string[]; page?: string | string[] }> }) {
  const query = await searchParams;
  const state = await resolveStaffAccessState(query.staffDemo);
  if (!state.developmentPreview && !state.authenticated) redirect("/login?next=/admin/audit");
  const decision = evaluateAdminAccess(state);
  const page = parsePage(query.page);
  const audit = decision.allowed && !state.developmentPreview ? await listAuditEvents(page) : null;
  return <InternalShell state={state} decision={decision} currentPath="/admin/audit" eyebrow="Administration · audit" title="Privileged work leaves a record." description={state.developmentPreview ? "Fictional audit records are available only in local development preview mode." : "A data-minimized, append-oriented stream written by trusted database operations."}>
    {!decision.allowed ? <StaffAccessGate decision={decision} area="admin" /> : <section aria-labelledby="audit-title"><div className="mb-5 flex flex-wrap items-center justify-between gap-3"><h2 id="audit-title" className="font-display text-2xl font-bold text-white">{state.developmentPreview ? "Mock audit events" : "Audit events"}</h2><StatusLabel tone={state.developmentPreview ? "warning" : "positive"}>{state.developmentPreview ? "Fictional and non-persistent" : "Server written"}</StatusLabel></div><div className="grid gap-3">{state.developmentPreview ? auditEvents.map((event) => <AuditRecord key={event.id} event={event} />) : audit?.events.length ? audit.events.map((event) => <RealAuditRecord key={event.id} event={event} />) : <p className="rounded-2xl border border-white/10 bg-[#12151c] p-6 text-zinc-400">No audit events have been recorded.</p>}</div>{!state.developmentPreview ? <nav aria-label="Audit pages" className="mt-6 flex flex-wrap items-center justify-between gap-3"><Link aria-disabled={page <= 1} tabIndex={page <= 1 ? -1 : undefined} href={page > 1 ? `/admin/audit?page=${page - 1}` : "/admin/audit?page=1"} className={`inline-flex min-h-11 items-center rounded-xl border border-white/15 px-5 text-sm font-extrabold ${page <= 1 ? "pointer-events-none text-zinc-700" : "text-white hover:bg-white/[0.05]"}`}>Previous</Link><span className="text-sm font-bold text-zinc-400">Page {page} of {audit?.totalPages ?? 1}</span><Link aria-disabled={page >= (audit?.totalPages ?? 1)} tabIndex={page >= (audit?.totalPages ?? 1) ? -1 : undefined} href={page < (audit?.totalPages ?? 1) ? `/admin/audit?page=${page + 1}` : `/admin/audit?page=${audit?.totalPages ?? 1}`} className={`inline-flex min-h-11 items-center rounded-xl border border-white/15 px-5 text-sm font-extrabold ${page >= (audit?.totalPages ?? 1) ? "pointer-events-none text-zinc-700" : "text-white hover:bg-white/[0.05]"}`}>Next</Link></nav> : null}</section>}
  </InternalShell>;
}
