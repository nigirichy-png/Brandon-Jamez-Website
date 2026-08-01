import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { EmailChangeForm, PasswordChangeForm } from "@/components/account/security-forms";
import { loadRealAccountState } from "@/lib/auth/access-state";

export const metadata: Metadata = { title: "Account Security" };

export default async function AccountSecurityPage() {
  const state = await loadRealAccountState();
  if (!state.user) redirect("/login?next=/account/security");
  const unavailable = state.accessLoadFailed || state.accountBlocked;
  return <main id="main-content" className="page-shell flex-1 py-12 sm:py-16 lg:py-20"><div className="border-b border-white/10 pb-8"><p className="eyebrow text-cyan-300">Authenticated account controls</p><h1 className="font-display mt-3 text-5xl font-bold tracking-tight text-white sm:text-6xl">Account security</h1><p className="mt-4 max-w-2xl leading-7 text-zinc-400">Change sign-in credentials through server-side actions with generic provider errors and no credential logging.</p><Link href="/account" className="mt-5 inline-flex min-h-11 items-center text-sm font-extrabold text-cyan-300 hover:text-cyan-200">← Return to account</Link></div>
    {unavailable ? <p role="alert" className="mt-8 rounded-xl border border-rose-300/20 bg-rose-300/[0.06] p-4 text-sm text-rose-100">Account security changes are unavailable for this account.</p> : <div className="mt-8 grid gap-6 lg:grid-cols-2"><section className="rounded-[var(--radius-lg)] border border-white/10 bg-[var(--surface)] p-6 sm:p-8"><p className="eyebrow text-fuchsia-300">Password</p><h2 className="font-display mt-3 text-3xl font-bold text-white">Change password</h2><p className="mt-3 text-sm leading-6 text-zinc-400">Your current password is required. A successful change signs out all sessions so you can sign in again securely.</p><PasswordChangeForm /></section><section className="rounded-[var(--radius-lg)] border border-white/10 bg-[var(--surface)] p-6 sm:p-8"><p className="eyebrow text-cyan-300">Email</p><h2 className="font-display mt-3 text-3xl font-bold text-white">Change email</h2><p className="mt-3 text-sm leading-6 text-zinc-400">A request does not change trusted roles, restrictions, age verification, or subscription state.</p><EmailChangeForm /></section></div>}
  </main>;
}
