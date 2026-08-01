import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Authentication Error" };

export default function AuthErrorPage() {
  return <main id="main-content" className="page-shell flex flex-1 items-center py-16"><section className="w-full rounded-[var(--radius-xl)] border border-rose-300/15 bg-[var(--surface)] p-7 sm:p-10 lg:p-14"><p className="eyebrow text-rose-300">Authentication could not continue</p><h1 className="font-display mt-4 max-w-3xl text-4xl font-bold tracking-tight text-white sm:text-6xl">The confirmation link was not accepted.</h1><p className="mt-5 max-w-2xl leading-7 text-zinc-400">The link may be invalid, expired, already used, or this environment may not be configured. No token details were retained or displayed.</p><div className="mt-7 flex flex-wrap gap-3"><Link href="/login" className="inline-flex min-h-12 items-center rounded-full bg-fuchsia-500 px-6 text-sm font-extrabold text-white hover:bg-fuchsia-400">Return to sign in</Link><Link href="/signup" className="inline-flex min-h-12 items-center rounded-full border border-white/15 px-6 text-sm font-extrabold text-white hover:bg-white/[0.05]">Create account</Link></div></section></main>;
}
