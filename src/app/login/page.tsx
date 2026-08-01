import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Sign In" };

export default function LoginPage() {
  return (
    <main id="main-content" className="page-shell flex flex-1 items-center py-10 sm:py-16 lg:py-24">
      <div className="mx-auto grid w-full max-w-6xl overflow-hidden rounded-[var(--radius-xl)] border border-white/10 bg-[var(--surface)] shadow-[var(--shadow-card)] lg:grid-cols-[.9fr_1.1fr]">
        <div className="relative min-h-56 overflow-hidden border-b border-white/10 bg-gradient-to-br from-fuchsia-600/55 via-violet-950 to-cyan-950 p-7 sm:min-h-72 sm:p-10 lg:min-h-[38rem] lg:border-b-0 lg:border-r lg:p-12">
          <div className="absolute -right-20 -top-24 size-72 rounded-full border-[44px] border-white/10" aria-hidden="true" />
          <div className="absolute -bottom-20 -left-14 size-52 rounded-full bg-cyan-300/10 blur-2xl" aria-hidden="true" />
          <div className="relative flex h-full min-h-[inherit] flex-col justify-end">
            <p className="eyebrow text-cyan-200">Brandon Jamez access</p>
            <h1 className="font-display mt-3 max-w-lg text-[clamp(2.5rem,10vw,5rem)] font-bold leading-[0.95] tracking-[-0.055em] text-white">Your access starts here—later.</h1>
            <p className="mt-4 max-w-md leading-7 text-white/70">A polished preview of the future account entry point, without simulating a real sign-in.</p>
          </div>
        </div>
        <div className="p-7 sm:p-10 lg:p-14">
          <span className="eyebrow inline-flex rounded-full border border-amber-300/25 bg-amber-300/10 px-3 py-2 text-amber-200">Not connected</span>
          <h2 className="font-display mt-6 text-4xl font-bold tracking-tight text-white sm:text-5xl">Sign in</h2>
          <p className="mt-3 max-w-lg leading-7 text-zinc-400">Authentication is not connected. These disabled fields do not collect or submit information.</p>
          <form className="mt-8 space-y-5" aria-label="Disabled sign-in preview">
            <div><label htmlFor="email" className="mb-2 block text-sm font-bold text-zinc-300">Email address</label><input id="email" type="email" disabled placeholder="you@example.com" className="min-h-13 w-full cursor-not-allowed rounded-[var(--radius-sm)] border border-white/10 bg-black/25 px-4 text-base text-zinc-500 placeholder:text-zinc-600 disabled:opacity-70" /></div>
            <div><label htmlFor="password" className="mb-2 block text-sm font-bold text-zinc-300">Password</label><input id="password" type="password" disabled placeholder="Password unavailable" className="min-h-13 w-full cursor-not-allowed rounded-[var(--radius-sm)] border border-white/10 bg-black/25 px-4 text-base text-zinc-500 placeholder:text-zinc-600 disabled:opacity-70" /></div>
            <button type="button" disabled className="min-h-13 w-full cursor-not-allowed rounded-full bg-zinc-700 px-5 font-extrabold text-zinc-400">Sign in unavailable</button>
          </form>
          <p className="mt-6 text-sm leading-6 text-zinc-500">Future authentication will use validated server-side sessions. A visible form alone will never grant access.</p>
          <div className="mt-7 rounded-[var(--radius-md)] border border-amber-300/20 bg-amber-300/[0.05] p-4">
            <p className="text-sm font-bold text-amber-100">Developer preview</p>
            <p className="mt-1 text-xs leading-5 text-amber-100/60">The member demo uses allowlisted URL scenarios. It does not sign you in or save account state.</p>
            <Link href="/member" className="mt-3 inline-flex min-h-11 items-center rounded text-sm font-extrabold text-cyan-300 hover:text-cyan-200">Open member-state demo <span className="ml-2" aria-hidden="true">→</span></Link>
          </div>
          <Link href="/" className="mt-5 inline-flex min-h-11 items-center rounded text-sm font-extrabold text-cyan-300 hover:text-cyan-200"><span aria-hidden="true" className="mr-2">←</span> Return home</Link>
        </div>
      </div>
    </main>
  );
}
