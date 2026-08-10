import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { InternalShell } from "@/components/internal/internal-shell";
import { StaffAccessGate } from "@/components/internal/staff-access-gate";
import { StatusLabel } from "@/components/internal/status-label";
import { SummaryCard } from "@/components/internal/summary-card";
import { resolveStaffAccessState } from "@/lib/auth/access-state";
import { listStaffCmsVideos } from "@/lib/cms/videos";
import { listStaffCmsEvents } from "@/lib/events/data";
import { evaluateContentViewerAccess } from "@/lib/staff/evaluate-staff-access";

export const metadata: Metadata = { title: "Content Operations" };
export const dynamic = "force-dynamic";

export default async function ContentPage({ searchParams }: { searchParams: Promise<{ staffDemo?: string | string[] }> }) {
  const state = await resolveStaffAccessState((await searchParams).staffDemo);
  if (!state.developmentPreview && !state.authenticated) redirect("/login?next=/content");
  const decision = evaluateContentViewerAccess(state);
  const loaded = decision.allowed && !state.developmentPreview ? await Promise.all([listStaffCmsVideos(), listStaffCmsEvents()]).catch(() => null) : null;
  const videos = loaded?.[0] ?? [];
  const events = loaded?.[1] ?? [];
  const drafts = videos.filter((record) => record.status === "draft").length + events.filter((record) => record.status === "draft").length;
  const canEdit = state.roles.includes("content_manager") || state.roles.includes("admin");
  return <InternalShell state={state} decision={decision} currentPath="/content" eyebrow="Content" title="Content overview" description="Review video and event publication state from the role-checked content database.">
    {!decision.allowed ? <StaffAccessGate decision={decision} area="content" /> : state.developmentPreview ? <section className="rounded-2xl border border-amber-300/20 bg-amber-300/[0.05] p-6"><StatusLabel tone="warning">Real session required</StatusLabel><h2 className="font-display mt-4 text-2xl font-bold text-white">Persistent content is unavailable in preview mode.</h2><p className="mt-2 max-w-2xl leading-7 text-zinc-400">Use a real moderator, content-manager, or administrator session. Preview roles never read or mutate CMS data.</p></section> : !loaded ? <p role="alert" className="rounded-2xl border border-rose-300/20 bg-rose-300/[0.06] p-6 text-rose-100">Content records could not be loaded safely. Confirm that the local content migration is available in the target environment.</p> : <div className="space-y-8">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Content summary"><SummaryCard label="Video records" value={videos.length} detail="External video metadata" /><SummaryCard label="Event records" value={events.length} detail="Website event records" accent="text-fuchsia-200" /><SummaryCard label="Drafts" value={drafts} detail="Hidden from public reads" accent="text-amber-200" /><SummaryCard label="Access" value={canEdit ? "Editor" : "Read only"} detail={canEdit ? "Content changes are audited" : "Moderator content mutation is denied"} accent="text-zinc-200" /></section>
      <section className="grid gap-5 lg:grid-cols-2"><article className="rounded-2xl border border-white/10 bg-[#12151c] p-6"><StatusLabel tone="info">Video workflow</StatusLabel><h2 className="font-display mt-4 text-3xl font-bold text-white">Metadata, access, release.</h2><p className="mt-3 leading-7 text-zinc-400">Review the live CMS inventory. Content managers and administrators can change it; moderators receive read-only access.</p><Link href="/content/videos" className="mt-6 inline-flex min-h-11 items-center rounded-xl bg-cyan-300/10 px-4 text-sm font-extrabold text-cyan-100 hover:bg-cyan-300/15">Open video records <span className="ml-2" aria-hidden="true">→</span></Link></article><article className="rounded-2xl border border-white/10 bg-[#12151c] p-6"><StatusLabel tone="warning">Event workflow</StatusLabel><h2 className="font-display mt-4 text-3xl font-bold text-white">Schedule with context.</h2><p className="mt-3 leading-7 text-zinc-400">Create, edit, publish, archive and delete event records through audited database actions.</p><Link href="/content/events" className="mt-6 inline-flex min-h-11 items-center rounded-xl bg-fuchsia-300/10 px-4 text-sm font-extrabold text-fuchsia-100 hover:bg-fuchsia-300/15">Open event records <span className="ml-2" aria-hidden="true">→</span></Link></article></section>
    </div>}
  </InternalShell>;
}
