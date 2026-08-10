"use client";

import { useActionState } from "react";

import {
  createModerationCaseAction,
  deleteModerationCaseAction,
  setModerationAssignmentAction,
  setModerationStatusAction,
  updateModerationCaseAction,
  type ModerationActionState,
} from "@/app/mod/review/actions";
import { StatusLabel } from "@/components/internal/status-label";
import { moderationSeverities, moderationStatuses, type ModerationCase, type ModerationCaseHistory } from "@/lib/moderation/model";

const initial: ModerationActionState = { tone: "idle", message: "" };
const fieldClass = "mt-2 w-full rounded-xl border border-white/15 bg-black/20 px-3 py-2.5 text-white outline-none placeholder:text-zinc-600 focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/20";
const buttonClass = "min-h-11 rounded-xl border border-white/15 px-4 py-2 text-sm font-extrabold text-white hover:border-cyan-300/40 hover:bg-white/[0.05] disabled:cursor-not-allowed disabled:opacity-40";

function ActionMessage({ state }: { state: ModerationActionState }) {
  if (!state.message) return null;
  return <p role={state.tone === "error" ? "alert" : "status"} aria-live="polite" className={`mt-3 rounded-xl border p-3 text-sm ${state.tone === "error" ? "border-rose-300/20 text-rose-100" : "border-emerald-300/20 text-emerald-100"}`}>{state.message}</p>;
}

function CaseFields({ moderationCase }: { moderationCase?: ModerationCase }) {
  return <div className="grid gap-4">
    <label className="text-sm font-bold text-zinc-200">Title<input className={fieldClass} name="title" defaultValue={moderationCase?.title} minLength={1} maxLength={160} required /></label>
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="text-sm font-bold text-zinc-200">Source<input className={fieldClass} name="sourceType" defaultValue={moderationCase?.source_type} minLength={1} maxLength={80} required /></label>
      <label className="text-sm font-bold text-zinc-200">Category<input className={fieldClass} name="category" defaultValue={moderationCase?.category} minLength={1} maxLength={80} required /></label>
    </div>
    <label className="text-sm font-bold text-zinc-200">Severity<select className={fieldClass} name="severity" defaultValue={moderationCase?.severity ?? "medium"}>{moderationSeverities.map((severity) => <option key={severity} value={severity}>{severity}</option>)}</select></label>
    <label className="text-sm font-bold text-zinc-200">Summary<textarea className={`${fieldClass} resize-y`} name="summary" defaultValue={moderationCase?.summary} minLength={1} maxLength={4000} rows={5} required /></label>
    <label className="text-sm font-bold text-zinc-200">Evidence reference <span className="font-normal text-zinc-500">(optional)</span><textarea className={`${fieldClass} resize-y`} name="evidenceReference" defaultValue={moderationCase?.evidence_reference ?? ""} maxLength={500} rows={2} /></label>
  </div>;
}

export function CreateModerationCaseForm() {
  const [state, action, pending] = useActionState(createModerationCaseAction, initial);
  return <form action={action} className="rounded-2xl border border-white/10 bg-[#12151c] p-5 sm:p-6"><h2 className="font-display text-2xl font-bold text-white">Create review case</h2><p className="mb-5 mt-2 text-sm leading-6 text-zinc-400">Record a website-internal issue. Creation starts the append-only status history at pending.</p><CaseFields /><button type="submit" disabled={pending} className={`${buttonClass} mt-5`}>{pending ? "Creating…" : "Create case"}</button><ActionMessage state={state} /></form>;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(new Date(value));
}

const severityTone = { low: "neutral", medium: "warning", high: "danger" } as const;

export function ModerationCaseRecord({ moderationCase, history, isAdmin }: { moderationCase: ModerationCase; history: ModerationCaseHistory[]; isAdmin: boolean }) {
  const [editState, editAction, editing] = useActionState(updateModerationCaseAction.bind(null, moderationCase.id, moderationCase.updated_at), initial);
  const assignToSelf = !moderationCase.assigned_to_label;
  const canChangeAssignment = assignToSelf || moderationCase.assigned_to_current_user || isAdmin;
  const [assignmentState, assignmentAction, assigning] = useActionState(setModerationAssignmentAction.bind(null, moderationCase.id, moderationCase.updated_at, assignToSelf), initial);
  const [statusState, statusAction, changingStatus] = useActionState(setModerationStatusAction.bind(null, moderationCase.id, moderationCase.updated_at), initial);
  const [deleteState, deleteAction, deleting] = useActionState(deleteModerationCaseAction.bind(null, moderationCase.id, moderationCase.updated_at), initial);

  return <article className="rounded-2xl border border-white/10 bg-[#12151c] p-5 sm:p-6">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-extrabold uppercase tracking-[0.12em] text-zinc-600">{moderationCase.source_type} · {moderationCase.id}</p><h2 className="font-display mt-2 text-xl font-bold text-white sm:text-2xl">{moderationCase.title}</h2></div><div className="flex flex-wrap gap-2"><StatusLabel tone={severityTone[moderationCase.severity]}>{moderationCase.severity} severity</StatusLabel><StatusLabel tone={moderationCase.status === "escalated" ? "warning" : moderationCase.status === "reviewed" ? "positive" : "info"}>{moderationCase.status.replace("_", " ")}</StatusLabel></div></div>
    <p className="mt-4 max-w-4xl whitespace-pre-wrap leading-7 text-zinc-400">{moderationCase.summary}</p>
    <dl className="mt-5 grid gap-3 border-y border-white/10 py-4 text-sm sm:grid-cols-2 xl:grid-cols-4"><div><dt className="text-zinc-600">Category</dt><dd className="mt-1 font-bold text-zinc-300">{moderationCase.category}</dd></div><div><dt className="text-zinc-600">Created</dt><dd className="mt-1 font-bold text-zinc-300">{formatDate(moderationCase.created_at)}</dd></div><div><dt className="text-zinc-600">Evidence</dt><dd className="mt-1 whitespace-pre-wrap font-bold text-zinc-300">{moderationCase.evidence_reference ?? "None"}</dd></div><div><dt className="text-zinc-600">Assigned</dt><dd className="mt-1 font-bold text-zinc-300">{moderationCase.assigned_to_label ?? "Unassigned"}</dd></div></dl>

    <div className="mt-5 grid gap-4 lg:grid-cols-2">
      <form action={assignmentAction}><button type="submit" disabled={!canChangeAssignment || assigning} className={buttonClass}>{assigning ? "Updating assignment…" : assignToSelf ? "Assign to me" : "Release assignment"}</button>{!canChangeAssignment ? <p className="mt-2 text-xs text-zinc-500">Only the assignee or an administrator can release this case.</p> : null}<ActionMessage state={assignmentState} /></form>
      <form action={statusAction}><label className="text-sm font-bold text-zinc-200">Next status<select className={fieldClass} name="status" defaultValue={moderationCase.status}>{moderationStatuses.map((status) => <option key={status} value={status}>{status.replace("_", " ")}</option>)}</select></label><label className="mt-3 block text-sm font-bold text-zinc-200">Status note <span className="font-normal text-zinc-500">(optional)</span><textarea className={`${fieldClass} resize-y`} name="note" maxLength={500} rows={2} /></label><button type="submit" disabled={changingStatus} className={`${buttonClass} mt-3`}>{changingStatus ? "Recording status…" : "Record status change"}</button><ActionMessage state={statusState} /></form>
    </div>

    <details className="mt-5 rounded-xl border border-white/10 p-4"><summary className="cursor-pointer text-sm font-extrabold text-cyan-100">Edit case details</summary><form action={editAction} className="mt-5"><CaseFields moderationCase={moderationCase} /><button type="submit" disabled={editing} className={`${buttonClass} mt-5`}>{editing ? "Saving…" : "Save case details"}</button><ActionMessage state={editState} /></form></details>
    <details className="mt-4 rounded-xl border border-white/10 p-4"><summary className="cursor-pointer text-sm font-extrabold text-cyan-100">Status history ({history.length})</summary><ol className="mt-4 grid gap-3">{history.map((event) => <li key={event.id} className="border-l border-white/15 pl-4"><p className="text-sm font-bold text-zinc-200">{event.from_status ? `${event.from_status.replace("_", " ")} → ` : "Created as "}{event.to_status.replace("_", " ")}</p><p className="mt-1 text-xs text-zinc-500">{formatDate(event.changed_at)} · {event.changed_by_label}</p>{event.note ? <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-400">{event.note}</p> : null}</li>)}</ol></details>
    {isAdmin && moderationCase.status === "archived" ? <form action={deleteAction} className="mt-4 border-t border-white/10 pt-4" onSubmit={(event) => { if (!window.confirm(`Permanently delete “${moderationCase.title}”? The case history will be removed; the audit reference remains.`)) event.preventDefault(); }}><button type="submit" disabled={deleting} className="min-h-11 rounded-xl border border-rose-300/30 px-4 py-2 text-sm font-extrabold text-rose-100 disabled:opacity-40">{deleting ? "Deleting…" : "Permanently delete archived case"}</button><ActionMessage state={deleteState} /></form> : null}
  </article>;
}
