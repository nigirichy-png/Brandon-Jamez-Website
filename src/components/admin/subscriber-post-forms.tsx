"use client";
/* eslint-disable @next/next/no-img-element */

import { useActionState } from "react";
import Link from "next/link";
import {
  createSubscriberPostAction,
  deleteSubscriberPostAction,
  removeSubscriberPostImageAction,
  setSubscriberPostPublicationAction,
  updateSubscriberPostAction,
  uploadSubscriberPostImageAction,
  type SubscriberPostActionState,
} from "@/app/admin/subscriber-content/actions";
import { StatusLabel } from "@/components/internal/status-label";
import type { AdminSubscriberPost } from "@/lib/subscriber-content/model";

const initial: SubscriberPostActionState = { tone: "idle", message: "" };
const field = "mt-1.5 min-h-10 w-full rounded-lg border border-white/15 bg-black/20 px-3 py-2 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-cyan-300";

function Message({ state }: { state: SubscriberPostActionState }) {
  if (!state.message) return null;
  return <p role={state.tone === "error" ? "alert" : "status"} className={`mt-3 rounded-xl border p-3 text-sm ${state.tone === "error" ? "border-rose-300/20 text-rose-100" : "border-emerald-300/20 text-emerald-100"}`}>{state.message}</p>;
}

function Fields({ post }: { post?: AdminSubscriberPost }) {
  return <div className="grid gap-3.5">
    <label className="text-sm font-bold text-zinc-200">Title<input className={field} name="title" defaultValue={post?.title} maxLength={160} required /></label>
    <label className="text-sm font-bold text-zinc-200">Slug <span className="font-normal text-zinc-500">(generated from title when empty)</span><input className={field} name="slug" defaultValue={post?.slug} maxLength={100} pattern="[a-z0-9]+(-[a-z0-9]+)*" /></label>
    <label className="text-sm font-bold text-zinc-200">Excerpt<textarea className={field} name="excerpt" defaultValue={post?.excerpt ?? ""} maxLength={500} rows={3} /></label>
    <label className="text-sm font-bold text-zinc-200">Plain-text body<textarea className={field} name="body" defaultValue={post?.body} maxLength={50000} rows={10} required /></label>
    <div className="grid gap-3.5 md:grid-cols-2">
      <label className="text-sm font-bold text-zinc-200">External cover image URL <span className="font-normal text-zinc-500">(fallback)</span><input className={field} name="coverImageUrl" defaultValue={post?.cover_image_url ?? ""} type="url" /></label>
      <label className="text-sm font-bold text-zinc-200">Status<select className={field} name="status" defaultValue={post?.status ?? "draft"}><option value="draft">Draft</option><option value="published">Published</option></select></label>
    </div>
    <div className="grid gap-3.5 md:grid-cols-2">
      <label className="text-sm font-bold text-zinc-200">External media URL <span className="font-normal text-zinc-500">(fallback)</span><input className={field} name="mediaUrl" defaultValue={post?.media_url ?? ""} type="url" /><span className="mt-2 block text-xs font-normal leading-5 text-zinc-500">Direct video must use HTTPS. Embeds accept YouTube or Vimeo only. External providers do not become private after their URL is known.</span></label>
      <label className="text-sm font-bold text-zinc-200">Media type<select className={field} name="mediaType" defaultValue={post?.media_type ?? ""}><option value="">None</option><option value="image">Image</option><option value="video">Direct HTTPS video</option><option value="embed">YouTube or Vimeo embed</option></select></label>
    </div>
  </div>;
}

export function CreateSubscriberPostForm() {
  const [state, action, pending] = useActionState(createSubscriberPostAction, initial);
  return <form action={action} className="rounded-xl border border-white/10 bg-[#12151c] p-4 sm:p-5"><h2 className="font-display text-xl font-bold text-white">Create subscriber post</h2><p className="mb-4 mt-1.5 text-sm text-zinc-400">Create the post first, then upload preferred private images from its record. External HTTPS URLs remain as compatibility fallbacks.</p><Fields /><button disabled={pending} className="mt-4 min-h-10 rounded-lg bg-white px-4 text-sm font-extrabold text-black hover:bg-zinc-200 disabled:opacity-40">{pending ? "Saving…" : "Create post"}</button><Message state={state} /></form>;
}

function ButtonForm({ action, label, confirmation, danger }: { action: (state: SubscriberPostActionState, data: FormData) => Promise<SubscriberPostActionState>; label: string; confirmation: string; danger?: boolean }) {
  const [state, formAction, pending] = useActionState(action, initial);
  return <form action={formAction} onSubmit={(event) => { if (!window.confirm(confirmation)) event.preventDefault(); }}><button disabled={pending} className={`min-h-10 rounded-lg border px-3.5 text-sm font-extrabold ${danger ? "border-rose-300/30 text-rose-100" : "border-white/15 text-white"}`}>{pending ? "Updating…" : label}</button><Message state={state} /></form>;
}

function formatDate(value: string | null): string {
  return value ? new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(new Date(value)) : "Not published";
}

type PostWithImages = AdminSubscriberPost & { cover_image_src: string | null; content_image_src: string | null };

function ImageManager({ post, kind, imageSrc, hasPrivateImage }: { post: PostWithImages; kind: "cover" | "content"; imageSrc: string | null; hasPrivateImage: boolean }) {
  const upload = uploadSubscriberPostImageAction.bind(null, post.id, post.updated_at, post.slug, kind);
  const remove = removeSubscriberPostImageAction.bind(null, post.id, post.updated_at, post.slug, kind);
  const [uploadState, uploadAction, uploading] = useActionState(upload, initial);
  const [removeState, removeAction, removing] = useActionState(remove, initial);
  const label = kind === "cover" ? "Cover image" : "Content image";
  return <section className="rounded-lg border border-white/10 bg-black/15 p-3.5"><h3 className="font-display text-base font-bold text-white">{label}</h3>{imageSrc ? <img src={imageSrc} alt="" className="mt-2.5 aspect-video max-h-56 w-full rounded-lg border border-white/10 object-contain" /> : <p className="mt-2 text-sm text-zinc-500">No image configured.</p>}<form action={uploadAction} className="mt-3"><label className="text-sm font-bold text-zinc-200">{hasPrivateImage ? "Replace private image" : "Upload private image"}<input className={`${field} file:mr-3 file:rounded-md file:border-0 file:bg-zinc-200 file:px-3 file:py-1.5 file:font-bold file:text-black`} name="image" type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" required /></label><p className="mt-1.5 text-xs leading-5 text-zinc-500">JPEG, PNG, WebP, GIF, or AVIF. Maximum 10 MB. Private upload is preferred.</p><button disabled={uploading} className="mt-2.5 min-h-10 rounded-lg border border-cyan-300/30 px-3.5 text-sm font-extrabold text-cyan-100">{uploading ? "Uploading…" : hasPrivateImage ? "Replace image" : "Upload image"}</button><Message state={uploadState} /></form>{hasPrivateImage ? <form action={removeAction} className="mt-2.5" onSubmit={(event) => { if (!window.confirm(`Remove the private ${kind} image from “${post.title}”?`)) event.preventDefault(); }}><button disabled={removing} className="min-h-10 rounded-lg border border-rose-300/30 px-3.5 text-sm font-extrabold text-rose-100">{removing ? "Removing…" : "Remove private image"}</button><Message state={removeState} /></form> : null}</section>;
}

export function SubscriberPostRecord({ post }: { post: PostWithImages }) {
  const [state, action, pending] = useActionState(updateSubscriberPostAction.bind(null, post.id, post.updated_at, post.slug), initial);
  const publication = setSubscriberPostPublicationAction.bind(null, post.id, post.updated_at, post.slug, post.status === "draft");
  const deletion = deleteSubscriberPostAction.bind(null, post.id, post.updated_at, post.slug);
  return <article className="rounded-xl border border-white/10 bg-[#12151c] p-4 sm:p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><StatusLabel tone={post.status === "published" ? "positive" : "warning"}>{post.status === "published" ? "Published" : "Draft"}</StatusLabel><h2 className="font-display mt-2 text-xl font-bold text-white">{post.title}</h2><p className="mt-0.5 text-sm text-zinc-500">/{post.slug}</p></div><Link href={`/admin/subscriber-content/${post.id}/preview`} className="inline-flex min-h-10 items-center rounded-lg border border-cyan-300/30 px-3.5 text-sm font-extrabold text-cyan-100 hover:bg-cyan-300/[0.06]">Preview post</Link></div><dl className="mt-3 grid gap-3 border-y border-white/10 py-3 text-sm sm:grid-cols-2"><div><dt className="text-zinc-500">Updated</dt><dd className="mt-0.5 font-bold text-zinc-200">{formatDate(post.updated_at)}</dd></div><div><dt className="text-zinc-500">Published</dt><dd className="mt-0.5 font-bold text-zinc-200">{formatDate(post.published_at)}</dd></div></dl><div className="mt-4 grid gap-3.5 lg:grid-cols-2"><ImageManager post={post} kind="cover" imageSrc={post.cover_image_src} hasPrivateImage={Boolean(post.cover_image_path)} /><ImageManager post={post} kind="content" imageSrc={post.content_image_src} hasPrivateImage={Boolean(post.content_image_path)} /></div><details className="mt-4 rounded-lg border border-white/10 p-3"><summary className="cursor-pointer font-extrabold text-cyan-100">Edit post</summary><form action={action} className="mt-4"><Fields post={post} /><button disabled={pending} className="mt-4 min-h-10 rounded-lg border border-white/15 px-3.5 text-sm font-extrabold text-white">{pending ? "Saving…" : "Save changes"}</button><Message state={state} /></form></details><div className="mt-3 flex flex-wrap gap-2.5"><ButtonForm action={publication} label={post.status === "draft" ? "Publish post" : "Return to draft"} confirmation={`${post.status === "draft" ? "Publish" : "Unpublish"} “${post.title}”?`} /><ButtonForm action={deletion} label="Delete post" confirmation={`Permanently delete “${post.title}”?`} danger /></div></article>;
}
