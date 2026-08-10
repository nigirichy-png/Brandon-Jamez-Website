import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { CreateModerationCaseForm, ModerationCaseRecord } from "@/components/moderation/moderation-case-forms";
import { InternalShell } from "@/components/internal/internal-shell";
import { StaffAccessGate } from "@/components/internal/staff-access-gate";
import { StatusLabel } from "@/components/internal/status-label";
import { resolveStaffAccessState } from "@/lib/auth/access-state";
import { listModerationCaseHistory, listModerationCases } from "@/lib/moderation/data";
import { evaluateModeratorAccess } from "@/lib/staff/evaluate-staff-access";

export const metadata: Metadata = { title: "Moderation Review Queue" };
export const dynamic = "force-dynamic";

export default async function ModerationReviewPage({ searchParams }: { searchParams: Promise<{ staffDemo?: string | string[] }> }) {
  const state = await resolveStaffAccessState((await searchParams).staffDemo);
  if (!state.developmentPreview && !state.authenticated) redirect("/login?next=/mod/review");
  const decision = evaluateModeratorAccess(state);
  const loaded = decision.allowed && !state.developmentPreview
    ? await Promise.all([listModerationCases(), listModerationCaseHistory()]).catch(() => null)
    : null;
  const cases = loaded?.[0] ?? [];
  const history = loaded?.[1] ?? [];
  const isAdmin = state.roles.includes("admin");

  return <InternalShell state={state} decision={decision} currentPath="/mod/review" eyebrow="Moderation · review queue" title="Review queue" description="Create, assign, review and audit website-internal moderation cases.">
    {!decision.allowed ? <StaffAccessGate decision={decision} area="moderator" /> : state.developmentPreview ? <section className="rounded-2xl border border-amber-300/20 bg-amber-300/[0.05] p-6"><StatusLabel tone="warning">Real session required</StatusLabel><h2 className="font-display mt-4 text-2xl font-bold text-white">Persistent actions are unavailable in preview mode.</h2><p className="mt-2 max-w-2xl leading-7 text-zinc-400">Sign in with a real active moderator or administrator account. Development scenarios never read or mutate moderation records.</p></section> : !loaded ? <p role="alert" className="rounded-2xl border border-rose-300/20 bg-rose-300/[0.06] p-6 text-rose-100">The moderation workflow could not be loaded safely. Confirm that the local moderation migration has been applied in the target environment.</p> : <div className="space-y-8"><CreateModerationCaseForm /><section aria-labelledby="review-records-title"><div className="mb-5 flex flex-wrap items-center justify-between gap-3"><h2 id="review-records-title" className="font-display text-2xl font-bold text-white">Review records</h2><StatusLabel tone="positive">Server authorized</StatusLabel></div>{cases.length ? <div className="grid gap-4">{cases.map((moderationCase) => <ModerationCaseRecord key={moderationCase.id} moderationCase={moderationCase} history={history.filter((event) => event.case_id === moderationCase.id)} isAdmin={isAdmin} />)}</div> : <p className="rounded-2xl border border-dashed border-white/15 p-6 text-center text-sm text-zinc-400">No moderation cases have been recorded.</p>}</section></div>}
  </InternalShell>;
}
