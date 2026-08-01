"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { resetPasswordAction, type ResetPasswordState } from "@/app/reset-password/actions";
import { passwordRequirements } from "@/lib/validation/auth-credentials";

const initialState: ResetPasswordState = { status: "idle", message: "" };

function ResetButton() {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending} className="min-h-12 rounded-full bg-fuchsia-500 px-6 text-sm font-extrabold text-white hover:bg-fuchsia-400 disabled:cursor-wait disabled:opacity-60">{pending ? "Changing password…" : "Change password"}</button>;
}

export function ResetPasswordForm({ recoveryValid }: { recoveryValid: boolean }) {
  const [state, action] = useActionState(resetPasswordAction, initialState);
  if (!recoveryValid) return <div className="space-y-3"><p role="alert" className="rounded-xl border border-rose-300/20 bg-rose-300/[0.06] p-4 text-sm text-rose-100">This recovery session is invalid or expired.</p><Link href="/forgot-password" className="inline-flex min-h-12 items-center rounded-full bg-fuchsia-500 px-6 text-sm font-extrabold text-white hover:bg-fuchsia-400">Request a new reset link</Link></div>;

  return <form action={action} className="space-y-5">
    <div><label htmlFor="reset-password" className="mb-2 block text-sm font-bold text-zinc-300">New password</label><input id="reset-password" name="password" type="password" autoComplete="new-password" minLength={12} maxLength={128} required aria-describedby="reset-password-help reset-password-status" className="min-h-13 w-full rounded-[var(--radius-sm)] border border-white/10 bg-black/25 px-4 text-white outline-none focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/20" /><p id="reset-password-help" className="mt-2 text-xs leading-5 text-zinc-500">{passwordRequirements}</p></div>
    <div><label htmlFor="reset-password-confirmation" className="mb-2 block text-sm font-bold text-zinc-300">Confirm new password</label><input id="reset-password-confirmation" name="passwordConfirmation" type="password" autoComplete="new-password" minLength={12} maxLength={128} required className="min-h-13 w-full rounded-[var(--radius-sm)] border border-white/10 bg-black/25 px-4 text-white outline-none focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/20" /></div>
    <div className="flex flex-wrap items-center gap-4"><ResetButton /><Link href="/login" className="text-sm font-extrabold text-cyan-300 hover:text-cyan-200">Return to sign in</Link></div>
    <p id="reset-password-status" role="status" aria-live="polite" className="text-sm leading-6 text-rose-100">{state.message}</p>
  </form>;
}
