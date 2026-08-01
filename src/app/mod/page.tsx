import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { InternalShell } from "@/components/internal/internal-shell";
import { StaffAccessGate } from "@/components/internal/staff-access-gate";
import { StatusLabel } from "@/components/internal/status-label";
import { SummaryCard } from "@/components/internal/summary-card";
import { moderationReviewItems } from "@/data/internal-operations";
import { evaluateModeratorAccess } from "@/lib/staff/evaluate-staff-access";
import { resolveStaffAccessState } from "@/lib/auth/access-state";
import { withStaffScenario } from "@/lib/staff/internal-navigation";

export const metadata: Metadata = { title: "Moderation Operations Preview" };

export default async function ModeratorPage({ searchParams }: { searchParams: Promise<{ staffDemo?: string | string[] }> }) {
  const state = await resolveStaffAccessState((await searchParams).staffDemo);
  if (!state.developmentPreview && !state.authenticated) redirect("/login?next=/mod");
  const decision = evaluateModeratorAccess(state);
  const pending = moderationReviewItems.filter((item) => item.status === "pending").length;
  const escalated = moderationReviewItems.filter((item) => item.status === "escalated").length;
  const reviewed = moderationReviewItems.filter((item) => item.status === "reviewed").length;
  return (
    <InternalShell state={state} decision={decision} currentPath="/mod" eyebrow="Moderation operations" title="Review with context, not automation." description="A safe internal preview for reviewing fictional website submissions. It cannot report, ban, or act on any external platform.">
      {!decision.allowed ? <StaffAccessGate decision={decision} area="moderator" /> : <div className="space-y-8">
        <section aria-labelledby="moderation-summary-title"><h2 id="moderation-summary-title" className="sr-only">Moderation summary</h2><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><SummaryCard label="Pending review" value={pending} detail="Fictional items awaiting context review" /><SummaryCard label="Reviewed today" value={reviewed} detail="Non-persistent workflow previews" accent="text-emerald-200" /><SummaryCard label="Escalated" value={escalated} detail="Queued for mock admin review" accent="text-amber-200" /><SummaryCard label="External actions" value="None" detail="No platform integrations exist" accent="text-zinc-200" /></div></section>
        <section className="grid gap-5 xl:grid-cols-[1fr_.72fr]">
          <div className="rounded-2xl border border-white/10 bg-[#12151c] p-5 sm:p-6"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-extrabold uppercase tracking-[0.13em] text-cyan-300">Queue focus</p><h2 className="font-display mt-2 text-2xl font-bold text-white">Recent internal activity</h2></div><Link href={withStaffScenario("/mod/review", state.scenarioId)} className="inline-flex min-h-11 items-center rounded-xl border border-white/10 px-4 text-sm font-extrabold text-cyan-200 hover:bg-white/[0.05]">Open review queue</Link></div><div className="mt-5 divide-y divide-white/10">{moderationReviewItems.slice(0, 3).map((item) => <article key={item.id} className="py-4"><div className="flex flex-wrap items-center gap-2"><h3 className="font-bold text-white">{item.title}</h3><StatusLabel tone={item.status === "escalated" ? "warning" : "neutral"}>{item.status.replace("_", " ")}</StatusLabel></div><p className="mt-2 text-sm leading-6 text-zinc-500">{item.summary}</p></article>)}</div></div>
          <aside className="rounded-2xl border border-fuchsia-300/15 bg-fuchsia-300/[0.035] p-5 sm:p-6"><p className="text-xs font-extrabold uppercase tracking-[0.13em] text-fuchsia-300">Policy notes</p><h2 className="font-display mt-2 text-2xl font-bold text-white">Human review boundary</h2><ul className="mt-4 space-y-3 text-sm leading-6 text-zinc-400"><li>Review only records submitted to this internal workflow.</li><li>Preserve context and escalate uncertainty.</li><li>Never imply an external account was reported or banned.</li><li>Future decisions require server-side audit entries.</li></ul></aside>
        </section>
      </div>}
    </InternalShell>
  );
}
