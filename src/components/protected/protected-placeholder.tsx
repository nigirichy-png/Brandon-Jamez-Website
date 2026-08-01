import Link from "next/link";

type ProtectedPlaceholderProps = { area: string; eyebrow: string; description: string };

const requirements = [
  "Validated server-side sessions",
  "Server-side authorization for every request",
  "Supabase Row Level Security for database access",
  "Account-blocking and role checks on the server",
];

export function ProtectedPlaceholder({ area, eyebrow, description }: ProtectedPlaceholderProps) {
  return (
    <main id="main-content" className="page-shell flex-1 py-10 sm:py-16 lg:py-24">
      <div className="mx-auto max-w-5xl overflow-hidden rounded-[var(--radius-xl)] border border-amber-300/20 bg-[var(--surface)]">
        <div className="border-b border-amber-300/15 bg-amber-300/[0.06] px-6 py-4 sm:px-10">
          <div className="flex flex-wrap items-center gap-3"><span className="eyebrow rounded-full bg-amber-300 px-3 py-1.5 text-amber-950">Development placeholder</span><span className="text-sm font-bold text-amber-200">Not protected</span></div>
        </div>
        <div className="grid gap-10 p-6 sm:p-10 lg:grid-cols-[.9fr_1.1fr] lg:p-12">
          <div>
            <p className="eyebrow text-cyan-300">{eyebrow}</p>
            <h1 className="font-display mt-4 text-[clamp(2.75rem,9vw,5.5rem)] font-bold leading-[0.92] tracking-[-0.06em] text-white">{area}</h1>
            <p className="mt-5 text-lg leading-8 text-zinc-300">{description}</p>
            <p className="mt-6 text-sm leading-7 text-zinc-500">No private or subscriber-only content appears here. Application helpers alone will never be security enforcement.</p>
            <Link href="/" className="mt-7 inline-flex min-h-12 items-center rounded-full border border-white/15 px-5 text-sm font-extrabold text-white hover:bg-white/[0.06]">Return home</Link>
          </div>
          <section aria-labelledby="security-title" className="rounded-[var(--radius-md)] border border-white/10 bg-black/25 p-6 sm:p-8">
            <h2 id="security-title" className="font-display text-2xl font-bold text-white">Security is not connected</h2>
            <p className="mt-3 leading-7 text-zinc-400">Authentication is not connected. This route is a development placeholder and is not genuinely protected. Hiding links and frontend-only checks are not security.</p>
            <ul className="mt-6 grid gap-4">
              {requirements.map((requirement, index) => <li key={requirement} className="grid grid-cols-[2rem_1fr] gap-3 text-sm leading-6 text-zinc-300"><span className="font-display text-fuchsia-300" aria-hidden="true">0{index + 1}</span>{requirement}</li>)}
            </ul>
            <p className="mt-6 border-t border-white/10 pt-5 text-sm leading-6 text-zinc-500">Real authorization will be performed server-side, with Supabase Row Level Security protecting future database access.</p>
          </section>
        </div>
      </div>
    </main>
  );
}
