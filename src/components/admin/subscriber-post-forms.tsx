"use client";

import { useActionState } from "react";
import { createSubscriberPostAction, deleteSubscriberPostAction, setSubscriberPostPublicationAction, updateSubscriberPostAction, type SubscriberPostActionState } from "@/app/admin/subscriber-content/actions";
import { StatusLabel } from "@/components/internal/status-label";
import type { AdminSubscriberPost } from "@/lib/subscriber-content/model";

const initial: SubscriberPostActionState = { tone: "idle", message: "" };
const field = "mt-2 w-full rounded-xl border border-white/15 bg-black/20 px-3 py-2.5 text-white outline-none placeholder:text-zinc-600 focus:border-cyan-300";

function Message({ state }: { state: SubscriberPostActionState }) {
  return state.message ? <p role={state.tone === "error" ? "alert" : "status"} className={`mt-3 rounded-xl border p-3 text-sm ${state.tone === "error" ? "border-rose-300/20 text-rose-100" : "border-emerald-300/20 text-emerald-100"}`}>{state.message}</p> : null;
}

function Fields({ post }: { post?: AdminSubscriberPost }) {
  return <div className="grid gap-4">
    <label className="text-sm font-bold text-zinc-200">Title<input className={field} name="title" defaultValue={post?.title} maxLength={160} required /></label>
    <label className="text-sm font-bold text-zinc-200">Slug <span className="font-normal text-zinc-500">(generated from title when empty)</span><input className={field} name="slug" defaultValue={post?.slug} maxLength={100} pattern="[a-z0-9]+(-[a-z0-9]+)*" /></label>
    <label className="text-sm font-bold text-zinc-200">Excerpt<textarea className={field} name="excerpt" defaultValue={post?.excerpt ?? ""} maxLength={500} rows={3} /></label>
    <label className="text-sm font-bold text-zinc-200">Plain-text body<textarea className={field} name="body" defaultValue={post?.body} maxLength={50000} rows={10} required /></label>
    <div className="grid gap-4 md:grid-cols-2"><label className="text-sm font-bold text-zinc-200">Cover image URL<input className={field} name="coverImageUrl" defaultValue={post?.cover_image_url ?? ""} type="url" /></label><label className="text-sm font-bold text-zinc-200">Status<select className={field} name="status" defaultValue={post?.status ?? "draft"}><option value="draft">Draft</option><option value="published">Published</option></select></label></div>
    <div className="grid gap-4 md:grid-cols-2"><label className="text-sm font-bold text-zinc-200">Media URL<input className={field} name="mediaUrl" defaultValue={post?.media_url ?? ""} type="url" /></label><label className="text-sm font-bold text-zinc-200">Media type<select className={field} name="mediaType" defaultValue={post?.media_type ?? ""}><option value="">None</option><option value="image">Image</option><option value="video">Video</option><option value="embed">External link</option></select></label></div>
  </div>;
}

export function CreateSubscriberPostForm() {
  const [state, action, pending] = useActionState(createSubscriberPostAction, initial);
  return <form action={action} className="rounded-2xl border border-white/10 bg-[#12151c] p-6"><h2 className="font-display text-2xl font-bold text-white">Create subscriber post</h2><p className="mb-5 mt-2 text-sm text-zinc-400">Use neutral plain text and optional HTTPS media links.</p><Fields /><button disabled={pending} className="mt-5 min-h-12 rounded-xl bg-fuchsia-500 px-5 font-extrabold text-white disabled:opacity-40">{pending ? "Saving…" : "Create post"}</button><Message state={state} /></form>;
}

function ButtonForm({ action, label, confirmation, danger }: { action: (state: SubscriberPostActionState, data: FormData) => Promise<SubscriberPostActionState>; label: string; confirmation: string; danger?: boolean }) {
  const [state, formAction, pending] = useActionState(action, initial);
  return <form action={formAction} onSubmit={(event) => { if (!window.confirm(confirmation)) event.preventDefault(); }}><button disabled={pending} className={`min-h-11 rounded-xl border px-4 text-sm font-extrabold ${danger ? "border-rose-300/30 text-rose-100" : "border-white/15 text-white"}`}>{pending ? "Updating…" : label}</button><Message state={state} /></form>;
}

function formatDate(value: string | null): string {
  return value ? new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(new Date(value)) : "Not published";
}

export function SubscriberPostRecord({ post }: { post: AdminSubscriberPost }) {
  const [state, action, pending] = useActionState(updateSubscriberPostAction.bind(null, post.id, post.updated_at, post.slug), initial);
  const publication = setSubscriberPostPublicationAction.bind(null, post.id, post.updated_at, post.slug, post.status === "draft");
  const deletion = deleteSubscriberPostAction.bind(null, post.id, post.updated_at, post.slug);
  return <article className="rounded-2xl border border-white/10 bg-[#12151c] p-6"><div className="flex flex-wrap items-center justify-between gap-3"><div><StatusLabel tone={post.status === "published" ? "positive" : "warning"}>{post.status === "published" ? "Published" : "Draft"}</StatusLabel><h2 className="font-display mt-3 text-2xl font-bold text-white">{post.title}</h2><p className="mt-1 text-sm text-zinc-500">/{post.slug}</p></div></div><dl className="mt-4 grid gap-3 border-y border-white/10 py-4 text-sm sm:grid-cols-2"><div><dt className="text-zinc-500">Updated</dt><dd className="mt-1 font-bold text-zinc-200">{formatDate(post.updated_at)}</dd></div><div><dt className="text-zinc-500">Published</dt><dd className="mt-1 font-bold text-zinc-200">{formatDate(post.published_at)}</dd></div></dl><details className="mt-5 rounded-xl border border-white/10 p-4"><summary className="cursor-pointer font-extrabold text-cyan-100">Edit post</summary><form action={action} className="mt-5"><Fields post={post} /><button disabled={pending} className="mt-5 min-h-11 rounded-xl border border-white/15 px-4 font-extrabold text-white">{pending ? "Saving…" : "Save changes"}</button><Message state={state} /></form></details><div className="mt-4 flex flex-wrap gap-3"><ButtonForm action={publication} label={post.status === "draft" ? "Publish post" : "Return to draft"} confirmation={`${post.status === "draft" ? "Publish" : "Unpublish"} “${post.title}”?`} /><ButtonForm action={deletion} label="Delete post" confirmation={`Permanently delete “${post.title}”?`} danger /></div></article>;
}
