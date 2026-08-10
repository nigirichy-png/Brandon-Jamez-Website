"use client";

import { useActionState } from "react";

import { createCmsEventAction, deleteCmsEventAction, setCmsEventArchivedAction, setCmsEventPublicationAction, updateCmsEventAction, type CmsEventActionState } from "@/app/content/events/actions";
import { StatusLabel } from "@/components/internal/status-label";
import type { CmsEvent } from "@/lib/events/model";

const initial: CmsEventActionState = { tone: "idle", message: "" };
const fieldClass = "mt-2 w-full rounded-xl border border-white/15 bg-black/20 px-3 py-2.5 text-white outline-none placeholder:text-zinc-600 focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/20";
const buttonClass = "min-h-11 rounded-xl border border-white/15 px-4 py-2 text-sm font-extrabold text-white hover:border-cyan-300/40 hover:bg-white/[0.05] disabled:cursor-not-allowed disabled:opacity-40";

function Message({ state }: { state: CmsEventActionState }) {
  if (!state.message) return null;
  return <p role={state.tone === "error" ? "alert" : "status"} className={`mt-3 rounded-xl border p-3 text-sm ${state.tone === "error" ? "border-rose-300/20 text-rose-100" : "border-emerald-300/20 text-emerald-100"}`}>{state.message}</p>;
}
function localDateTime(value?: string): string {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}
function Fields({ event }: { event?: CmsEvent }) {
  return <div className="grid gap-4"><label className="text-sm font-bold text-zinc-200">Title<input className={fieldClass} name="title" defaultValue={event?.title} minLength={1} maxLength={160} required /></label><label className="text-sm font-bold text-zinc-200">Description<textarea className={`${fieldClass} resize-y`} name="description" defaultValue={event?.description} maxLength={4000} rows={4} /></label><div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-bold text-zinc-200">Location<input className={fieldClass} name="location" defaultValue={event?.location} minLength={1} maxLength={240} required /></label><label className="text-sm font-bold text-zinc-200">Start date and time<input className={fieldClass} name="startsAt" type="datetime-local" defaultValue={localDateTime(event?.starts_at)} required /></label></div></div>;
}

export function CreateCmsEventForm() {
  const [state, action, pending] = useActionState(createCmsEventAction, initial);
  return <form action={action} className="rounded-2xl border border-white/10 bg-[#12151c] p-5 sm:p-6"><h2 className="font-display text-2xl font-bold text-white">Create event</h2><p className="mb-5 mt-2 text-sm leading-6 text-zinc-400">New events start as drafts and require a separate publication action.</p><Fields /><button type="submit" disabled={pending} className={`${buttonClass} mt-5`}>{pending ? "Creating…" : "Create draft event"}</button><Message state={state} /></form>;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(new Date(value));
}

export function CmsEventRecord({ event, readOnly = false }: { event: CmsEvent; readOnly?: boolean }) {
  const [editState, editAction, editing] = useActionState(updateCmsEventAction.bind(null, event.id, event.updated_at), initial);
  const [publicationState, publicationAction, publishing] = useActionState(setCmsEventPublicationAction.bind(null, event.id, event.updated_at, event.status === "draft"), initial);
  const [archiveState, archiveAction, archiving] = useActionState(setCmsEventArchivedAction.bind(null, event.id, event.updated_at, event.status !== "archived"), initial);
  const [deleteState, deleteAction, deleting] = useActionState(deleteCmsEventAction.bind(null, event.id, event.updated_at), initial);
  return <article className="rounded-2xl border border-white/10 bg-[#12151c] p-5 sm:p-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-extrabold uppercase tracking-[0.12em] text-fuchsia-300">{formatDate(event.starts_at)}</p><h2 className="font-display mt-2 text-2xl font-bold text-white">{event.title}</h2><p className="mt-2 text-sm text-zinc-400">{event.location}</p></div><StatusLabel tone={event.status === "published" ? "positive" : event.status === "draft" ? "warning" : "neutral"}>{event.status}</StatusLabel></div>{event.description ? <p className="mt-4 whitespace-pre-wrap leading-7 text-zinc-400">{event.description}</p> : null}{readOnly ? null : <><details className="mt-5 rounded-xl border border-white/10 p-4"><summary className="cursor-pointer text-sm font-extrabold text-cyan-100">Edit event</summary><form action={editAction} className="mt-5"><Fields event={event} /><button type="submit" disabled={editing} className={`${buttonClass} mt-5`}>{editing ? "Saving…" : "Save event changes"}</button><Message state={editState} /></form></details><div className="mt-5 flex flex-wrap gap-3">{event.status !== "archived" ? <form action={publicationAction}><button type="submit" disabled={publishing} className={buttonClass}>{publishing ? "Updating…" : event.status === "draft" ? "Publish event" : "Return to draft"}</button><Message state={publicationState} /></form> : null}<form action={archiveAction}><button type="submit" disabled={archiving} className={buttonClass}>{archiving ? "Updating…" : event.status === "archived" ? "Restore as draft" : "Archive event"}</button><Message state={archiveState} /></form></div>{event.status === "archived" ? <form action={deleteAction} className="mt-4 border-t border-white/10 pt-4" onSubmit={(submission) => { if (!window.confirm(`Permanently delete “${event.title}”?`)) submission.preventDefault(); }}><button type="submit" disabled={deleting} className="min-h-11 rounded-xl border border-rose-300/30 px-4 py-2 text-sm font-extrabold text-rose-100 disabled:opacity-40">{deleting ? "Deleting…" : "Permanently delete event"}</button><Message state={deleteState} /></form> : null}</>}</article>;
}
