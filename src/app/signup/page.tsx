import type { Metadata } from "next";
import Link from "next/link";

import { AuthShell } from "@/components/auth/auth-shell";
import { SubmitButton } from "@/components/auth/submit-button";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { signupAction } from "./actions";

export const metadata: Metadata = { title: "Create Account" };
const errors = { invalid_email: "Enter a valid email address.", weak_password: "Use 12–128 characters with uppercase, lowercase, number, and symbol.", password_mismatch: "The password confirmation does not match.", signup_failed: "Account creation could not be completed. Try again later.", not_configured: "Authentication is not configured in this environment." } as const;

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ error?: string | string[]; status?: string | string[] }> }) {
  const query = await searchParams;
  const configured = isSupabaseConfigured();
  const error = typeof query.error === "string" && query.error in errors ? errors[query.error as keyof typeof errors] : null;
  const checkEmail = query.status === "check_email";
  return <AuthShell eyebrow="Secure account creation" title="Start with identity, not privilege." description="A new account receives no staff role, subscription, or age-verification state. Those remain independent trusted workflows.">
    <span className={`eyebrow inline-flex rounded-full border px-3 py-2 ${configured ? "border-emerald-300/25 bg-emerald-300/10 text-emerald-200" : "border-amber-300/25 bg-amber-300/10 text-amber-200"}`}>{configured ? "Supabase Auth connected" : "Not configured"}</span>
    <h2 className="font-display mt-5 text-4xl font-bold tracking-tight text-white">Create account</h2>
    <p className="mt-3 leading-7 text-zinc-400">Email confirmation is expected. Passwords are handled by Supabase Auth and are never stored by this application.</p>
    {error ? <p role="alert" className="mt-5 rounded-xl border border-rose-300/20 bg-rose-300/[0.06] p-4 text-sm text-rose-100">{error}</p> : null}
    {checkEmail ? <div role="status" className="mt-5 rounded-xl border border-emerald-300/20 bg-emerald-300/[0.06] p-4"><p className="font-bold text-emerald-100">Check your email</p><p className="mt-1 text-sm leading-6 text-emerald-100/70">If signup was accepted, use the confirmation message to finish creating your session.</p></div> : null}
    <form action={signupAction} className="mt-7 space-y-5">
      <div><label htmlFor="email" className="mb-2 block text-sm font-bold text-zinc-300">Email address</label><input id="email" name="email" type="email" autoComplete="email" required maxLength={254} disabled={!configured} className="min-h-13 w-full rounded-[var(--radius-sm)] border border-white/10 bg-black/25 px-4 text-base text-white disabled:cursor-not-allowed disabled:text-zinc-500" /></div>
      <div><label htmlFor="password" className="mb-2 block text-sm font-bold text-zinc-300">Password</label><input id="password" name="password" type="password" autoComplete="new-password" required minLength={12} maxLength={128} aria-describedby="password-help" disabled={!configured} className="min-h-13 w-full rounded-[var(--radius-sm)] border border-white/10 bg-black/25 px-4 text-base text-white disabled:cursor-not-allowed disabled:text-zinc-500" /><p id="password-help" className="mt-2 text-xs leading-5 text-zinc-500">12–128 characters with uppercase, lowercase, number, and symbol.</p></div>
      <div><label htmlFor="passwordConfirmation" className="mb-2 block text-sm font-bold text-zinc-300">Confirm password</label><input id="passwordConfirmation" name="passwordConfirmation" type="password" autoComplete="new-password" required minLength={12} maxLength={128} disabled={!configured} className="min-h-13 w-full rounded-[var(--radius-sm)] border border-white/10 bg-black/25 px-4 text-base text-white disabled:cursor-not-allowed disabled:text-zinc-500" /></div>
      <SubmitButton idleLabel="Create account" pendingLabel="Creating account…" disabled={!configured} />
    </form>
    <p className="mt-5 text-sm text-zinc-400">Already registered? <Link href="/login" className="font-extrabold text-cyan-300 hover:text-cyan-200">Sign in</Link></p>
  </AuthShell>;
}
