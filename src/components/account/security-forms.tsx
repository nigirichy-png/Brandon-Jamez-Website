"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { changePasswordAction, requestEmailChangeAction, type SecurityActionState } from "@/app/account/security/actions";
import { passwordRequirements } from "@/lib/validation/auth-credentials";

const initialState: SecurityActionState = { status: "idle", message: "" };

function ActionButton({ idle, pending }: { idle: string; pending: string }) {
  const status = useFormStatus();
  return <button type="submit" disabled={status.pending} className="min-h-11 rounded-xl bg-cyan-400 px-5 text-sm font-extrabold text-slate-950 hover:bg-cyan-300 disabled:cursor-wait disabled:opacity-60">{status.pending ? pending : idle}</button>;
}

function ActionMessage({ state, id }: { state: SecurityActionState; id: string }) {
  return <p id={id} role="status" aria-live="polite" className={`text-sm leading-6 ${state.status === "error" ? "text-rose-200" : "text-emerald-200"}`}>{state.message}</p>;
}

export function PasswordChangeForm() {
  const [state, action] = useActionState(changePasswordAction, initialState);
  return <form action={action} className="mt-6 space-y-5">
    <div><label htmlFor="current-password" className="mb-2 block text-sm font-bold text-zinc-200">Current password</label><input id="current-password" name="currentPassword" type="password" autoComplete="current-password" required maxLength={128} className="min-h-12 w-full rounded-xl border border-white/15 bg-black/20 px-4 text-white outline-none focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/20" /></div>
    <div><label htmlFor="new-password" className="mb-2 block text-sm font-bold text-zinc-200">New password</label><input id="new-password" name="newPassword" type="password" autoComplete="new-password" required minLength={12} maxLength={128} aria-describedby="password-policy password-change-status" className="min-h-12 w-full rounded-xl border border-white/15 bg-black/20 px-4 text-white outline-none focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/20" /><p id="password-policy" className="mt-2 text-xs leading-5 text-zinc-500">{passwordRequirements}</p></div>
    <div><label htmlFor="new-password-confirmation" className="mb-2 block text-sm font-bold text-zinc-200">Confirm new password</label><input id="new-password-confirmation" name="passwordConfirmation" type="password" autoComplete="new-password" required minLength={12} maxLength={128} className="min-h-12 w-full rounded-xl border border-white/15 bg-black/20 px-4 text-white outline-none focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/20" /></div>
    <ActionButton idle="Change password" pending="Changing password…" /><ActionMessage state={state} id="password-change-status" />
  </form>;
}

export function EmailChangeForm() {
  const [state, action] = useActionState(requestEmailChangeAction, initialState);
  return <form action={action} className="mt-6 space-y-5">
    <div><label htmlFor="new-email" className="mb-2 block text-sm font-bold text-zinc-200">New email address</label><input id="new-email" name="newEmail" type="email" autoComplete="email" required maxLength={254} aria-describedby="email-change-help email-change-status" className="min-h-12 w-full rounded-xl border border-white/15 bg-black/20 px-4 text-white outline-none focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/20" /><p id="email-change-help" className="mt-2 text-xs leading-5 text-zinc-500">Supabase may require confirmation from both your current and new addresses. The new address is not treated as trusted until confirmation completes.</p></div>
    <ActionButton idle="Request email change" pending="Requesting change…" /><ActionMessage state={state} id="email-change-status" />
  </form>;
}
