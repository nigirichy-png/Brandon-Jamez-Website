"use client";

import { useActionState } from "react";

import { requestPasswordResetAction, type ForgotPasswordState } from "@/app/forgot-password/actions";
import { SubmitButton } from "@/components/auth/submit-button";

const initialState: ForgotPasswordState = { submitted: false, message: "" };

export function ForgotPasswordForm({ configured }: { configured: boolean }) {
  const [state, action] = useActionState(requestPasswordResetAction, initialState);
  return <form action={action} className="mt-7 space-y-5">
    <div><label htmlFor="recovery-email" className="mb-2 block text-sm font-bold text-zinc-300">Email address</label><input id="recovery-email" name="email" type="email" autoComplete="email" required maxLength={254} disabled={!configured} aria-describedby="recovery-help recovery-status" className="min-h-13 w-full rounded-[var(--radius-sm)] border border-white/10 bg-black/25 px-4 text-base text-white outline-none focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/20 disabled:cursor-not-allowed disabled:text-zinc-500" /><p id="recovery-help" className="mt-2 text-xs leading-5 text-zinc-500">For privacy, the response is identical whether or not an account exists.</p></div>
    <SubmitButton idleLabel="Send reset instructions" pendingLabel="Sending…" disabled={!configured} />
    <p id="recovery-status" role="status" aria-live="polite" className="text-sm leading-6 text-emerald-100">{state.message}</p>
  </form>;
}
