import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { CreateCmsVideoForm, CmsVideoRecord } from "@/components/admin/video-cms-forms";
import { PublicBunnyVideoManager } from "@/components/content/public-bunny-video-manager";
import { InternalShell } from "@/components/internal/internal-shell";
import { StaffAccessGate } from "@/components/internal/staff-access-gate";
import { StatusLabel } from "@/components/internal/status-label";
import { resolveStaffAccessState } from "@/lib/auth/access-state";
import { listStaffCmsVideos } from "@/lib/cms/videos";
import { listStaffPublicBunnyVideos } from "@/lib/public-bunny-video/data";
import { evaluateContentViewerAccess } from "@/lib/staff/evaluate-staff-access";

export const metadata: Metadata = { title: "Video Management" };
export const dynamic = "force-dynamic";

export default async function ContentVideosPage({ searchParams }: { searchParams: Promise<{ staffDemo?: string | string[] }> }) {
  const state = await resolveStaffAccessState((await searchParams).staffDemo);
  if (!state.developmentPreview && !state.authenticated) redirect("/login?next=/content/videos");
  const decision = evaluateContentViewerAccess(state);
  const inventory = decision.allowed && !state.developmentPreview
    ? await Promise.all([listStaffCmsVideos(), listStaffPublicBunnyVideos()]).catch(() => null)
    : [[], []];
  const videos = inventory?.[0] ?? null;
  const bunnyVideos = inventory?.[1] ?? [];
  const canEdit = state.roles.includes("content_manager") || state.roles.includes("admin");
  return <InternalShell state={state} decision={decision} currentPath="/content/videos" eyebrow="Content · video records" title="Video records" description={canEdit ? "Manage external video links and direct public Bunny uploads through audited content actions." : "Review public video metadata with read-only moderator access."}>
    {!decision.allowed ? <StaffAccessGate decision={decision} area="content" /> : state.developmentPreview ? <section className="rounded-2xl border border-amber-300/20 bg-amber-300/[0.05] p-6"><StatusLabel tone="warning">Real session required</StatusLabel><h2 className="font-display mt-4 text-2xl font-bold text-white">CMS data is unavailable in preview mode.</h2></section> : videos === null ? <p role="alert" className="rounded-2xl border border-rose-300/20 bg-rose-300/[0.06] p-6 text-rose-100">Video records could not be loaded safely.</p> : <div className="space-y-8">{canEdit ? <PublicBunnyVideoManager videos={bunnyVideos} /> : null}{canEdit ? <CreateCmsVideoForm /> : null}<section aria-labelledby="video-records-title"><div className="mb-5 flex flex-wrap items-center justify-between gap-3"><h2 id="video-records-title" className="font-display text-2xl font-bold text-white">Linked video inventory</h2><StatusLabel tone={canEdit ? "positive" : "neutral"}>{canEdit ? "Audited editor" : "Read only"}</StatusLabel></div>{videos.length ? <div className="grid gap-5">{videos.map((video) => <CmsVideoRecord key={video.id} video={video} readOnly={!canEdit} />)}</div> : <p className="rounded-2xl border border-dashed border-white/15 p-6 text-center text-sm text-zinc-400">No linked video records yet.</p>}</section></div>}
  </InternalShell>;
}
