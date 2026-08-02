"use client";

import { useActionState } from "react";

import {
  createCmsVideoAction,
  deleteCmsVideoAction,
  reorderCmsVideoAction,
  setCmsVideoFeaturedAction,
  setCmsVideoPublicationAction,
  updateCmsVideoAction,
  type CmsActionState,
} from "@/app/admin/content/videos/actions";
import { StatusLabel } from "@/components/internal/status-label";
import { CmsVideoPreview } from "@/components/video/cms-video-preview";
import { VideoPlatformBadge, VideoPlatformIcon, currentVideoPlatforms, videoPlatformIdentities } from "@/components/video/video-platform-identity";
import type { CmsVideo } from "@/lib/cms/video-model";

const fieldClass = "mt-2 w-full rounded-xl border border-white/15 bg-black/20 px-3 py-2.5 text-white outline-none placeholder:text-zinc-600 focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/20";
const secondaryButton = "min-h-11 rounded-xl border border-white/15 px-4 py-2 text-sm font-extrabold text-white transition-colors hover:border-cyan-300/40 hover:bg-white/[0.05] disabled:cursor-not-allowed disabled:opacity-40";
const initialCmsActionState: CmsActionState = { tone: "idle", message: "" };

function ActionMessage({ state }: { state: CmsActionState }) {
  if (!state.message) return null;
  return <p role={state.tone === "error" ? "alert" : "status"} aria-live="polite" className={`mt-3 rounded-xl border p-3 text-sm ${state.tone === "error" ? "border-rose-300/20 bg-rose-300/[0.06] text-rose-100" : "border-emerald-300/20 bg-emerald-300/[0.06] text-emerald-100"}`}>{state.message}</p>;
}

function FormFields({ video }: { video?: CmsVideo }) {
  return <div className="grid gap-4">
    <label className="text-sm font-bold text-zinc-200">Title
      <input className={fieldClass} name="title" defaultValue={video?.title} minLength={1} maxLength={120} required autoComplete="off" />
    </label>
    <label className="text-sm font-bold text-zinc-200">Short description
      <textarea className={`${fieldClass} resize-y`} name="shortDescription" defaultValue={video?.short_description} maxLength={500} rows={4} />
    </label>
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="text-sm font-bold text-zinc-200">Platform
        <select className={fieldClass} name="platform" defaultValue={video?.platform ?? "youtube"} required>
          {currentVideoPlatforms.map((platform) => <option key={platform} value={platform}>{videoPlatformIdentities[platform].label}</option>)}
        </select>
      </label>
      <label className="text-sm font-bold text-zinc-200">Category <span className="font-normal text-zinc-500">(optional)</span>
        <input className={fieldClass} name="category" defaultValue={video?.category ?? ""} maxLength={60} autoComplete="off" />
      </label>
    </div>
    <label className="text-sm font-bold text-zinc-200">Video URL
      <input className={fieldClass} name="videoUrl" defaultValue={video?.video_url} type="url" inputMode="url" maxLength={2048} required placeholder="https://youtube.com/..." autoComplete="url" />
      <span className="mt-1.5 block text-xs font-normal leading-5 text-zinc-500">HTTPS links from YouTube, Rumble, or Kick only. The website does not upload or host video files.</span>
    </label>
  </div>;
}

export function CreateCmsVideoForm() {
  const [state, action, pending] = useActionState(createCmsVideoAction, initialCmsActionState);
  return <form action={action} className="rounded-2xl border border-white/10 bg-[#12151c] p-5 sm:p-6">
    <div className="mb-5"><p className="text-xs font-extrabold uppercase tracking-[0.14em] text-cyan-300">New draft</p><h2 className="font-display mt-2 text-2xl font-bold text-white">Add a video</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">Create metadata first. Publishing is a separate confirmed action.</p></div>
    <FormFields />
    <button className="mt-5 min-h-12 rounded-xl bg-fuchsia-500 px-5 py-2.5 text-sm font-extrabold text-white shadow-[var(--shadow-accent)] hover:bg-fuchsia-400 disabled:cursor-not-allowed disabled:bg-zinc-700" type="submit" disabled={pending}>{pending ? "Creating draft…" : "Create draft video"}</button>
    <ActionMessage state={state} />
  </form>;
}

function MutationForm({ action, label, pendingLabel, confirmation, tone = "neutral", disabled = false }: { action: (previous: CmsActionState, formData: FormData) => Promise<CmsActionState>; label: string; pendingLabel: string; confirmation?: string; tone?: "neutral" | "danger" | "accent"; disabled?: boolean }) {
  const [state, formAction, pending] = useActionState(action, initialCmsActionState);
  const color = tone === "danger" ? "border-rose-300/30 text-rose-100 hover:bg-rose-300/[0.08]" : tone === "accent" ? "border-fuchsia-300/30 text-fuchsia-100 hover:bg-fuchsia-300/[0.08]" : "border-white/15 text-white hover:border-cyan-300/40 hover:bg-white/[0.05]";
  return <form action={formAction} onSubmit={(event) => { if (confirmation && !window.confirm(confirmation)) event.preventDefault(); }}>
    <button type="submit" disabled={disabled || pending} className={`min-h-11 rounded-xl border px-4 py-2 text-sm font-extrabold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${color}`}>{pending ? pendingLabel : label}</button>
    <ActionMessage state={state} />
  </form>;
}

function EditCmsVideoForm({ video }: { video: CmsVideo }) {
  const boundAction = updateCmsVideoAction.bind(null, video.id, video.updated_at);
  const [state, action, pending] = useActionState(boundAction, initialCmsActionState);
  return <details className="rounded-xl border border-white/10 bg-black/15 p-4">
    <summary className="cursor-pointer text-sm font-extrabold text-cyan-100">Edit metadata</summary>
    <form action={action} className="mt-5">
      <FormFields video={video} />
      <button type="submit" disabled={pending} className={`${secondaryButton} mt-5`}>{pending ? "Saving changes…" : "Save metadata changes"}</button>
      <ActionMessage state={state} />
    </form>
  </details>;
}

function formatDate(value: string | null): string {
  if (!value) return "Not published";
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(new Date(value));
}

export function CmsVideoRecord({ video }: { video: CmsVideo }) {
  const identity = videoPlatformIdentities[video.platform];
  const publishAction = setCmsVideoPublicationAction.bind(null, video.id, video.updated_at, video.status === "draft");
  const featureAction = setCmsVideoFeaturedAction.bind(null, video.id, video.updated_at, !video.featured);
  const moveUpAction = reorderCmsVideoAction.bind(null, video.id, video.updated_at, Math.max(0, video.display_order - 1));
  const moveDownAction = reorderCmsVideoAction.bind(null, video.id, video.updated_at, Math.min(1_000_000, video.display_order + 1));
  const deleteAction = deleteCmsVideoAction.bind(null, video.id, video.updated_at);
  return <article className={`rounded-2xl border bg-[#12151c] p-5 sm:p-6 ${video.featured ? "border-fuchsia-300/35 shadow-[0_18px_50px_rgba(229,79,236,0.08)]" : "border-white/10"}`}>
    <div className="grid gap-5 md:grid-cols-[14rem_minmax(0,1fr)] md:items-start">
      <div className="group overflow-hidden rounded-xl border border-white/10"><CmsVideoPreview title={video.title} platform={video.platform} videoUrl={video.video_url} compact sizes="224px" /></div>
      <div className="min-w-0"><div className="flex flex-wrap items-center gap-2">{video.featured ? <StatusLabel tone="positive">Featured</StatusLabel> : null}<StatusLabel tone={video.status === "published" ? "positive" : "warning"}>{video.status === "published" ? "Published" : "Draft"}</StatusLabel><VideoPlatformBadge platform={video.platform} /></div><h2 className="font-display mt-4 text-2xl font-bold text-white">{video.title}</h2>{video.short_description ? <p className="mt-2 max-w-2xl leading-6 text-zinc-400">{video.short_description}</p> : <p className="mt-2 text-sm italic text-zinc-600">No short description</p>}<a href={video.video_url} target="_blank" rel="noopener noreferrer" aria-label={`Open ${identity.label}: ${video.title} (opens in a new tab)`} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/15 px-4 text-sm font-extrabold text-cyan-100 hover:border-cyan-300/40"><VideoPlatformIcon platform={video.platform} className="size-5 shrink-0" />Open {identity.label} <span aria-hidden="true">↗</span></a></div>
    </div>
    <dl className="mt-5 grid gap-3 border-y border-white/10 py-4 text-sm sm:grid-cols-2 xl:grid-cols-4">
      <div><dt className="text-zinc-500">Category</dt><dd className={`mt-1 font-bold ${video.category ? "text-zinc-200" : "text-zinc-500"}`}>{video.category ?? "No category"}</dd></div>
      <div><dt className="text-zinc-500">Display order</dt><dd className="mt-1 font-bold text-zinc-200">{video.display_order}</dd></div>
      <div><dt className="text-zinc-500">Published</dt><dd className="mt-1 font-bold text-zinc-200">{formatDate(video.published_at)}</dd></div>
      <div><dt className="text-zinc-500">Updated</dt><dd className="mt-1 font-bold text-zinc-200">{formatDate(video.updated_at)}</dd></div>
    </dl>
    <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      <MutationForm action={publishAction} label={video.status === "draft" ? "Publish video" : "Return to draft"} pendingLabel="Updating visibility…" confirmation={video.status === "draft" ? `Publish “${video.title}” on the public Videos page?` : `Unpublish “${video.title}” and remove it from the public Videos page?`} tone="accent" />
      <MutationForm action={featureAction} label={video.featured ? "Remove featured" : "Make featured"} pendingLabel="Updating featured state…" confirmation={`Change featured placement for “${video.title}”?`} disabled={video.status !== "published"} />
      <div className="flex flex-wrap gap-2"><MutationForm action={moveUpAction} label="Move up" pendingLabel="Moving…" disabled={video.display_order === 0} /><MutationForm action={moveDownAction} label="Move down" pendingLabel="Moving…" disabled={video.display_order === 1_000_000} /></div>
    </div>
    <div className="mt-4"><EditCmsVideoForm video={video} /></div>
    <div className="mt-4 border-t border-white/10 pt-4"><MutationForm action={deleteAction} label="Delete video" pendingLabel="Deleting…" confirmation={`Permanently delete “${video.title}”? Its audit reference will be retained.`} tone="danger" /></div>
  </article>;
}
