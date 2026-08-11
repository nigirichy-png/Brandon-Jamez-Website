import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { CreateCmsVideoForm, CmsVideoRecord } from "@/components/admin/video-cms-forms";
import { PublicBunnyVideoManager } from "@/components/content/public-bunny-video-manager";
import { InternalShell } from "@/components/internal/internal-shell";
import { StaffAccessGate } from "@/components/internal/staff-access-gate";
import { StatusLabel } from "@/components/internal/status-label";
import { resolveStaffAccessState } from "@/lib/auth/access-state";
import { listAdminCmsVideos, type CmsVideo } from "@/lib/cms/videos";
import { listStaffPublicBunnyVideos } from "@/lib/public-bunny-video/data";
import type { AdminPublicBunnyVideo } from "@/lib/public-bunny-video/model";
import { evaluateAdminAccess } from "@/lib/staff/evaluate-staff-access";

export const metadata: Metadata = { title: "Admin Video Management" };

export default async function AdminVideosPage({ searchParams }: { searchParams: Promise<{ staffDemo?: string | string[] }> }) {
  const state = await resolveStaffAccessState((await searchParams).staffDemo);
  if (!state.developmentPreview && !state.authenticated) redirect("/login?next=/admin/content/videos");
  const decision = evaluateAdminAccess(state);
  let videos: CmsVideo[] = [];
  let bunnyVideos: AdminPublicBunnyVideo[] = [];
  let loadFailed = false;
  if (decision.allowed && !state.developmentPreview) {
    try { [videos, bunnyVideos] = await Promise.all([listAdminCmsVideos(), listStaffPublicBunnyVideos()]); } catch { loadFailed = true; }
  }

  return <InternalShell state={state} decision={decision} currentPath="/admin/content/videos" eyebrow="Administration · video CMS" title="Video CMS" description="Manage external video links and direct public Bunny uploads. Changes are authenticated and audited.">
    {!decision.allowed ? <StaffAccessGate decision={decision} area="admin" /> : state.developmentPreview ? <section className="rounded-2xl border border-amber-300/20 bg-amber-300/[0.05] p-6"><StatusLabel tone="warning">Real session required</StatusLabel><h2 className="font-display mt-4 text-2xl font-bold text-white">CMS mutations are unavailable in preview mode.</h2><p className="mt-2 max-w-2xl leading-7 text-zinc-400">Sign in with a real active administrator account to load or change video records. Preview roles never authorize database access.</p></section> : <div className="space-y-8">
      <PublicBunnyVideoManager videos={bunnyVideos} />
      <CreateCmsVideoForm />
      <section aria-labelledby="video-inventory-title">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-extrabold uppercase tracking-[0.14em] text-fuchsia-300">External inventory</p><h2 id="video-inventory-title" className="font-display mt-2 text-2xl font-bold text-white">Linked video records</h2></div><StatusLabel tone={loadFailed ? "danger" : "positive"}>{loadFailed ? "Load unavailable" : `${videos.length} total`}</StatusLabel></div>
        {loadFailed ? <p role="alert" className="rounded-2xl border border-rose-300/20 bg-rose-300/[0.06] p-6 text-rose-100">Video records could not be loaded safely. Refresh the page or try again later.</p> : videos.length ? <div className="grid gap-5">{videos.map((video) => <CmsVideoRecord key={video.id} video={video} />)}</div> : <div className="rounded-2xl border border-dashed border-white/15 bg-[#12151c] p-8 text-center"><h3 className="font-display text-2xl font-bold text-white">No video records yet</h3><p className="mx-auto mt-2 max-w-xl leading-7 text-zinc-400">Create the first draft above. Nothing appears publicly until an administrator explicitly publishes it.</p></div>}
      </section>
    </div>}
  </InternalShell>;
}
