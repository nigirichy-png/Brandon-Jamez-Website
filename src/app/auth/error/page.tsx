import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Authentication Error" };

export default function AuthErrorPage() {
  return <main id="main-content" className="platform-page platform-auth-error flex flex-1 items-center py-10 sm:py-14"><section className="platform-shell border border-[var(--public-rule)] bg-[var(--public-surface)] p-6 sm:p-9"><p className="platform-kicker text-rose-300">Authentication could not continue</p><h1 className="platform-title">The authentication link was not accepted.</h1><p className="platform-copy">The link may be invalid, expired, already used, or this environment may not be configured. No callback details were retained or displayed.</p><div className="mt-6 flex flex-wrap gap-3"><Link href="/login" className="public-action-primary">Return to sign in</Link><Link href="/forgot-password" className="public-action-secondary">Reset password</Link><Link href="/signup" className="public-action-secondary">Create account</Link></div></section></main>;
}
