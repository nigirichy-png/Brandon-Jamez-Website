import type { Metadata } from "next";

import { AuditRecord } from "@/components/internal/audit-record";
import { InternalShell } from "@/components/internal/internal-shell";
import { StaffAccessGate } from "@/components/internal/staff-access-gate";
import { StatusLabel } from "@/components/internal/status-label";
import { auditEvents } from "@/data/internal-operations";
import { evaluateAdminAccess } from "@/lib/staff/evaluate-staff-access";
import { getMockStaffScenario } from "@/lib/staff/mock-staff-scenarios";

export const metadata: Metadata = { title: "Audit Log Preview" };

export default async function AdminAuditPage({ searchParams }: { searchParams: Promise<{ staffDemo?: string | string[] }> }) {
  const state = getMockStaffScenario((await searchParams).staffDemo);
  const decision = evaluateAdminAccess(state);
  return <InternalShell state={state} decision={decision} currentPath="/admin/audit" eyebrow="Administration · audit" title="Privileged work leaves a record." description="A mobile-friendly mock audit stream showing the safe shape of future append-oriented, server-written administrative events.">
    {!decision.allowed ? <StaffAccessGate decision={decision} area="admin" /> : <section aria-labelledby="audit-title"><div className="mb-5 flex flex-wrap items-center justify-between gap-3"><h2 id="audit-title" className="font-display text-2xl font-bold text-white">Mock audit events</h2><StatusLabel tone="warning">Fictional and non-persistent</StatusLabel></div><div className="grid gap-3">{auditEvents.map((event) => <AuditRecord key={event.id} event={event} />)}</div><aside className="mt-6 rounded-2xl border border-cyan-300/15 bg-cyan-300/[0.035] p-5 sm:p-6"><h2 className="font-display text-xl font-bold text-white">Production audit boundary</h2><p className="mt-3 max-w-4xl text-sm leading-7 text-zinc-400">Future audit events must be written on trusted servers, protected through restrictive RLS and narrow privileged operations, append-oriented, and stripped of secrets or sensitive payloads. Browser input must never be trusted as the audit source.</p></aside></section>}
  </InternalShell>;
}
