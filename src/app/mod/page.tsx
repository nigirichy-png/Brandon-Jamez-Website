import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { InternalShell } from "@/components/internal/internal-shell";
import { StaffAccessGate } from "@/components/internal/staff-access-gate";
import { StatusLabel } from "@/components/internal/status-label";
import { SummaryCard } from "@/components/internal/summary-card";
import { resolveStaffAccessState } from "@/lib/auth/access-state";
import { listModerationCases } from "@/lib/moderation/data";
import { evaluateModeratorAccess } from "@/lib/staff/evaluate-staff-access";

export const metadata: Metadata = { title: "Moderation Operations" };
export const dynamic = "force-dynamic";

export default async function ModeratorPage({ searchParams }: { searchParams: Promise<{ staffDemo?: string | string[] }> }) {
  const state = await resolveStaffAccessState((await searchParams).staffDemo);
  if (!state.developmentPreview && !state.authenticated) redirect("/login?next=/mod");
  const decision = evaluateModeratorAccess(state);
  let cases = decision.allowed && !state.developmentPreview ? await listModerationCases().catch(() => null) : [];
  const loadFailed = cases === null;
  cases ??= [];
  const pending = cases.filter((item) => item.status === "pending").length;
  const inReview = cases.filter((item) => item.status === "in_review").length;
  const escalated = cases.filter((item) => item.status === "escalated").length;
  const reviewed = cases.filter((item) => item.status === "reviewed").length;

  return <InternalShell state={state} decision={decision} currentPath="/mod" eyebrow="Moderation" title="Moderation overview" description="Review website-internal cases through the persistent, role-checked workflow.">
    {!decision.allowed ? <StaffAccessGate decision={decision} area="moderator" /> : state.developmentPreview ? <section className="rounded-2xl border border-amber-300/20 bg-amber-300/[0.05] p-6"><StatusLabel tone="warning">Real session required</StatusLabel><h2 className="font-display mt-4 text-2xl font-bold text-white">Moderation data is unavailable in preview mode.</h2><p className="mt-2 max-w-2xl leading-7 text-zinc-400">Sign in with a real active moderator or administrator account. Preview roles never authorize case reads or writes.</p></section> : loadFailed ? <p role="alert" className="rounded-2xl border border-rose-300/20 bg-rose-300/[0.06] p-6 text-rose-100">The moderation queue could not be loaded safely. Confirm that the local moderation migration has been applied in the target environment.</p> : <div className="space-y-8">
      <section aria-labelledby="moderation-summary-title"><h2 id="moderation-summary-title" className="sr-only">Moderation summary</h2><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><SummaryCard label="Pending review" value={pending} detail="Cases awaiting triage" /><SummaryCard label="In review" value={inReview} detail="Cases under active review" accent="text-cyan-200" /><SummaryCard label="Escalated" value={escalated} detail="Cases requiring administrator context" accent="text-amber-200" /><SummaryCard label="Reviewed" value={reviewed} detail="Completed review decisions" accent="text-emerald-200" /></div></section>
      <section className="grid gap-5 xl:grid-cols-[1fr_.72fr]">
        <div className="rounded-2xl border border-white/10 bg-[#12151c] p-5 sm:p-6"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-extrabold uppercase tracking-[0.13em] text-cyan-300">Queue focus</p><h2 className="font-display mt-2 text-2xl font-bold text-white">Recent internal activity</h2></div><Link href="/mod/review" className="inline-flex min-h-11 items-center rounded-xl border border-white/10 px-4 text-sm font-extrabold text-cyan-200 hover:bg-white/[0.05]">Open review queue</Link></div><div className="mt-5 divide-y divide-white/10">{cases.length ? cases.slice(0, 3).map((item) => <article key={item.id} className="py-4"><div className="flex flex-wrap items-center gap-2"><h3 className="font-bold text-white">{item.title}</h3><StatusLabel tone={item.status === "escalated" ? "warning" : item.status === "reviewed" ? "positive" : "neutral"}>{item.status.replace("_", " ")}</StatusLabel></div><p className="mt-2 text-sm leading-6 text-zinc-500">{item.summary}</p></article>) : <p className="py-5 text-sm text-zinc-500">No moderation cases have been recorded.</p>}</div></div>
        <aside className="rounded-2xl border border-fuchsia-300/15 bg-fuchsia-300/[0.035] p-5 sm:p-6"><p className="text-xs font-extrabold uppercase tracking-[0.13em] text-fuchsia-300">Policy notes</p><h2 className="font-display mt-2 text-2xl font-bold text-white">Human review boundary</h2><ul className="mt-4 space-y-3 text-sm leading-6 text-zinc-400"><li>Review only records submitted to this internal workflow.</li><li>Preserve context and add a note to material status changes.</li><li>Use assignment to avoid duplicate handling.</li><li>External platform actions remain outside this workflow.</li></ul></aside>
      </section>
    </div>}
  </InternalShell>;
}
