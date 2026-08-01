"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { updateDisplayNameAction, type DisplayNameActionState } from "@/app/account/actions";

const initialState: DisplayNameActionState = { status: "idle", message: "" };

function SaveButton() {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending} className="min-h-11 rounded-xl bg-cyan-400 px-5 text-sm font-extrabold text-slate-950 hover:bg-cyan-300 disabled:cursor-wait disabled:opacity-60">{pending ? "Saving…" : "Save display name"}</button>;
}

export function DisplayNameForm({ currentName }: { currentName: string | null }) {
  const [state, action] = useActionState(updateDisplayNameAction, initialState);
  return <form action={action} className="mt-4 space-y-3">
    <div><label htmlFor="display-name" className="block text-sm font-bold text-zinc-200">Display name</label><p id="display-name-help" className="mt-1 text-xs leading-5 text-zinc-500">Use 2–50 letters, numbers, spaces, hyphens, or apostrophes.</p></div>
    <input id="display-name" name="displayName" defaultValue={currentName ?? ""} minLength={2} maxLength={50} required autoComplete="name" aria-describedby="display-name-help display-name-status" className="min-h-11 w-full rounded-xl border border-white/15 bg-black/20 px-4 text-white outline-none focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/20" />
    <div className="flex flex-wrap items-center gap-3"><SaveButton /><p id="display-name-status" aria-live="polite" className={`text-sm ${state.status === "error" ? "text-rose-200" : "text-emerald-200"}`}>{state.message}</p></div>
  </form>;
}
