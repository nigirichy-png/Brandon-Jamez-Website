import type { Metadata } from "next";
import Link from "next/link";

import { AuthShell } from "@/components/auth/auth-shell";
import { SubmitButton } from "@/components/auth/submit-button";
import { getSafeNextPath } from "@/lib/auth/redirects";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { loginAction } from "./actions";

export const metadata: Metadata = { title: "Sign In" };
const errors = { invalid_credentials: "Sign-in failed. Check your credentials and try again.", not_configured: "Authentication is not configured in this environment." } as const;

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string | string[]; status?: string | string[]; next?: string | string[] }> }) {
  const query = await searchParams;
  const configured = isSupabaseConfigured();
  const error = typeof query.error === "string" && query.error in errors ? errors[query.error as keyof typeof errors] : null;
  const signedOut = query.status === "signed_out";
  const passwordUpdated = query.status === "password_reset" || query.status === "password_changed";
  const next = getSafeNextPath(typeof query.next === "string" ? query.next : null);
  return <AuthShell eyebrow="Brandon Jamez account" title="Welcome back." description="Sign in through the server-rendered Supabase authentication flow. Sessions are stored through the existing SSR cookie boundary.">
    <span className={`eyebrow inline-flex rounded-full border px-3 py-2 ${configured ? "border-emerald-300/25 bg-emerald-300/10 text-emerald-200" : "border-amber-300/25 bg-amber-300/10 text-amber-200"}`}>{configured ? "Authentication connected" : "Not configured"}</span>
    <h2 className="font-display mt-5 text-4xl font-bold tracking-tight text-white">Sign in</h2>
    <p className="mt-3 leading-7 text-zinc-400">Credentials are sent only to the server action and Supabase Auth. They are never placed in URLs or local storage.</p>
    {error ? <p role="alert" className="mt-5 rounded-xl border border-rose-300/20 bg-rose-300/[0.06] p-4 text-sm text-rose-100">{error}</p> : null}
    {signedOut ? <p role="status" className="mt-5 rounded-xl border border-emerald-300/20 bg-emerald-300/[0.06] p-4 text-sm text-emerald-100">You have been signed out.</p> : null}
    {passwordUpdated ? <p role="status" className="mt-5 rounded-xl border border-emerald-300/20 bg-emerald-300/[0.06] p-4 text-sm text-emerald-100">Your password was changed. Sign in with the new password.</p> : null}
    <form action={loginAction} className="mt-7 space-y-5">
      <input type="hidden" name="next" value={next} />
      <div><label htmlFor="email" className="mb-2 block text-sm font-bold text-zinc-300">Email address</label><input id="email" name="email" type="email" autoComplete="email" required maxLength={254} disabled={!configured} className="min-h-13 w-full rounded-[var(--radius-sm)] border border-white/10 bg-black/25 px-4 text-base text-white disabled:cursor-not-allowed disabled:text-zinc-500" /></div>
      <div><div className="mb-2 flex flex-wrap items-center justify-between gap-2"><label htmlFor="password" className="block text-sm font-bold text-zinc-300">Password</label><Link href="/forgot-password" className="text-sm font-extrabold text-cyan-300 hover:text-cyan-200">Forgot password?</Link></div><input id="password" name="password" type="password" autoComplete="current-password" required maxLength={128} disabled={!configured} className="min-h-13 w-full rounded-[var(--radius-sm)] border border-white/10 bg-black/25 px-4 text-base text-white disabled:cursor-not-allowed disabled:text-zinc-500" /></div>
      <SubmitButton idleLabel="Sign in securely" pendingLabel="Signing in…" disabled={!configured} />
    </form>
    <p className="mt-5 text-sm text-zinc-400">Need an account? <Link href="/signup" className="font-extrabold text-cyan-300 hover:text-cyan-200">Create one</Link></p>
    {process.env.NODE_ENV === "development" ? <div className="mt-7 rounded-[var(--radius-md)] border border-amber-300/20 bg-amber-300/[0.05] p-4"><p className="text-sm font-bold text-amber-100">Development previews</p><p className="mt-1 text-xs leading-5 text-amber-100/60">These links explicitly select isolated mock scenarios. They do not upgrade a real session.</p><div className="mt-3 grid gap-2 min-[430px]:grid-cols-2"><Link href="/member?demo=active_subscriber" className="flex min-h-11 items-center rounded-lg px-2 text-sm font-extrabold text-cyan-300 hover:bg-white/[0.04]">Subscriber demo <span className="ml-auto" aria-hidden="true">→</span></Link><Link href="/mod?staffDemo=moderator" className="flex min-h-11 items-center rounded-lg px-2 text-sm font-extrabold text-cyan-300 hover:bg-white/[0.04]">Moderator demo <span className="ml-auto" aria-hidden="true">→</span></Link><Link href="/content?staffDemo=content_manager" className="flex min-h-11 items-center rounded-lg px-2 text-sm font-extrabold text-cyan-300 hover:bg-white/[0.04]">Content demo <span className="ml-auto" aria-hidden="true">→</span></Link><Link href="/admin?staffDemo=admin" className="flex min-h-11 items-center rounded-lg px-2 text-sm font-extrabold text-cyan-300 hover:bg-white/[0.04]">Admin demo <span className="ml-auto" aria-hidden="true">→</span></Link></div></div> : null}
  </AuthShell>;
}
