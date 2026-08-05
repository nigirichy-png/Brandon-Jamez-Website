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
  return <main id="main-content" className="public-account flex-1 py-10 sm:py-14"><header className="public-account-header"><div><p className="platform-kicker">Account</p><h1 className="public-account-title">Security</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--public-muted)]">Update your sign-in credentials through the existing secure account flow.</p></div><Link href="/account" className="public-action-secondary">← Back to account</Link></header>{unavailable ? <p role="alert" className="mt-6 border-l-2 border-rose-300/50 px-4 py-3 text-sm text-rose-100">Account security changes are unavailable for this account.</p> : <div className="divide-y divide-[var(--public-rule)]"><section className="grid gap-6 py-7 lg:grid-cols-[15rem_minmax(0,1fr)]"><div><p className="public-account-label">Password</p><h2 className="font-display mt-2 text-2xl font-bold">Change password</h2><p className="mt-2 text-sm leading-6 text-[var(--public-muted)]">A successful change signs out all sessions.</p></div><PasswordChangeForm /></section><section className="grid gap-6 py-7 lg:grid-cols-[15rem_minmax(0,1fr)]"><div><p className="public-account-label">Email</p><h2 className="font-display mt-2 text-2xl font-bold">Change email</h2><p className="mt-2 text-sm leading-6 text-[var(--public-muted)]">Roles, restrictions, verification and subscription state remain separate.</p></div><EmailChangeForm /></section></div>}</main>;
}
