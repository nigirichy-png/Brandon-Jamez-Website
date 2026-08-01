import type { Metadata } from "next";

import { InternalShell } from "@/components/internal/internal-shell";
import { MockActionGroup } from "@/components/internal/mock-action-group";
import { StaffAccessGate } from "@/components/internal/staff-access-gate";
import { StatusLabel } from "@/components/internal/status-label";
import { videoContentRecords } from "@/data/internal-operations";
import { evaluateContentManagerAccess } from "@/lib/staff/evaluate-staff-access";
import { getMockStaffScenario } from "@/lib/staff/mock-staff-scenarios";

export const metadata: Metadata = { title: "Video Management Preview" };
const publicationTone = { draft: "warning", scheduled: "info", published: "positive", archived: "neutral" } as const;

export default async function ContentVideosPage({ searchParams }: { searchParams: Promise<{ staffDemo?: string | string[] }> }) {
  const state = getMockStaffScenario((await searchParams).staffDemo);
  const decision = evaluateContentManagerAccess(state);
  return <InternalShell state={state} decision={decision} currentPath="/content/videos" eyebrow="Content · video records" title="Every title has a boundary." description="Manage publication metadata in a non-persistent preview. No uploads, files, playback links, tokens, or provider operations are available.">
    {!decision.allowed ? <StaffAccessGate decision={decision} area="content" /> : <section aria-labelledby="video-records-title"><div className="mb-5 flex flex-wrap items-center justify-between gap-3"><h2 id="video-records-title" className="font-display text-2xl font-bold text-white">Mock video inventory</h2><StatusLabel tone="warning">No writes or uploads</StatusLabel></div><div className="grid gap-4 xl:grid-cols-2">{videoContentRecords.map((record) => <article key={record.id} className="rounded-2xl border border-white/10 bg-[#12151c] p-5 sm:p-6"><div className="flex flex-wrap items-center gap-2"><StatusLabel tone={record.accessLevel === "subscriber" ? "warning" : "info"}>{record.accessLevel}</StatusLabel><StatusLabel tone={publicationTone[record.publicationStatus]}>{record.publicationStatus}</StatusLabel>{record.featured ? <StatusLabel tone="positive">Featured</StatusLabel> : null}</div><h3 className="font-display mt-4 text-xl font-bold text-white">{record.title}</h3><p className="mt-2 text-sm text-zinc-500">{record.category} · {record.duration}</p><dl className="mt-5 grid gap-3 border-y border-white/10 py-4 text-sm min-[430px]:grid-cols-2"><div><dt className="text-zinc-600">Publication date</dt><dd className="mt-1 font-bold text-zinc-300">{record.publishedDate}</dd></div><div><dt className="text-zinc-600">Mock asset state</dt><dd className="mt-1 font-bold text-zinc-300">{record.mockAssetState}</dd></div></dl><div className="mt-5"><MockActionGroup actions={["Preview", "Edit metadata", "Schedule", "Archive"]} /></div></article>)}</div></section>}
  </InternalShell>;
}
