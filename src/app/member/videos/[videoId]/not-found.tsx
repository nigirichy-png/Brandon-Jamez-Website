import Link from "next/link";

export default function VideoNotFound() {
  return (
    <main id="main-content" className="page-shell flex flex-1 items-center py-20">
      <div className="w-full rounded-[var(--radius-xl)] border border-white/10 bg-[var(--surface)] p-8 sm:p-12">
        <p className="eyebrow text-fuchsia-300">404 · Mock library</p>
        <h1 className="font-display mt-4 text-5xl font-bold tracking-tight text-white">Video record not found</h1>
        <p className="mt-4 max-w-xl leading-7 text-zinc-400">That ID does not match a development-only subscriber video record.</p>
        <Link href="/member" className="mt-7 inline-flex min-h-12 items-center rounded-full bg-fuchsia-500 px-6 py-3 text-sm font-extrabold text-white hover:bg-fuchsia-400">Return to member demo</Link>
      </div>
    </main>
  );
}
