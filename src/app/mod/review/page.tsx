import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { InternalShell } from "@/components/internal/internal-shell";
import { MockActionGroup } from "@/components/internal/mock-action-group";
import { StaffAccessGate } from "@/components/internal/staff-access-gate";
import { StatusLabel } from "@/components/internal/status-label";
import { moderationReviewItems } from "@/data/internal-operations";
import { evaluateModeratorAccess } from "@/lib/staff/evaluate-staff-access";
import { resolveStaffAccessState } from "@/lib/auth/access-state";

export const metadata: Metadata = { title: "Moderation Review Queue Preview" };

const severityTone = { low: "neutral", medium: "warning", high: "danger" } as const;

export default async function ModerationReviewPage({ searchParams }: { searchParams: Promise<{ staffDemo?: string | string[] }> }) {
  const state = await resolveStaffAccessState((await searchParams).staffDemo);
  if (!state.developmentPreview && !state.authenticated) redirect("/login?next=/mod/review");
  const decision = evaluateModeratorAccess(state);
  return <InternalShell state={state} decision={decision} currentPath="/mod/review" eyebrow="Moderation · review queue" title="Context before action." description="Fictional, website-internal review records designed to preview careful triage without performing any external moderation.">
    {!decision.allowed ? <StaffAccessGate decision={decision} area="moderator" /> : <section aria-labelledby="review-records-title"><div className="mb-5 flex flex-wrap items-center justify-between gap-3"><h2 id="review-records-title" className="font-display text-2xl font-bold text-white">Review records</h2><StatusLabel tone="warning">Actions do not persist</StatusLabel></div><div className="grid gap-4">{moderationReviewItems.map((item) => <article key={item.id} className="rounded-2xl border border-white/10 bg-[#12151c] p-5 sm:p-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-extrabold uppercase tracking-[0.12em] text-zinc-600">{item.sourceType} · {item.id}</p><h3 className="font-display mt-2 text-xl font-bold text-white sm:text-2xl">{item.title}</h3></div><div className="flex flex-wrap gap-2"><StatusLabel tone={severityTone[item.severity]}>{item.severity} severity</StatusLabel><StatusLabel tone={item.status === "escalated" ? "warning" : "info"}>{item.status.replace("_", " ")}</StatusLabel></div></div><p className="mt-4 max-w-4xl leading-7 text-zinc-400">{item.summary}</p><dl className="mt-5 grid gap-3 border-y border-white/10 py-4 text-sm sm:grid-cols-2 xl:grid-cols-4"><div><dt className="text-zinc-600">Submitted</dt><dd className="mt-1 font-bold text-zinc-300">{item.submittedAt}</dd></div><div><dt className="text-zinc-600">Submitted by</dt><dd className="mt-1 font-bold text-zinc-300">{item.submittedByLabel}</dd></div><div><dt className="text-zinc-600">Evidence</dt><dd className="mt-1 font-bold text-zinc-300">{item.evidenceReference}</dd></div><div><dt className="text-zinc-600">Assigned</dt><dd className="mt-1 font-bold text-zinc-300">{item.assignedToLabel}</dd></div></dl><div className="mt-5"><MockActionGroup actions={["Mark reviewed", "Escalate to admin", "Request more context", "Archive"]} /></div></article>)}</div></section>}
  </InternalShell>;
}
