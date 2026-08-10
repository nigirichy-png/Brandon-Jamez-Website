export function SummaryCard({ label, value, detail, accent = "text-cyan-200" }: { label: string; value: string | number; detail: string; accent?: string }) {
  return (
    <article className="grid min-w-0 grid-cols-[minmax(7rem,0.7fr)_minmax(0,1.3fr)] items-center gap-4 border-b border-white/10 py-3">
      <div><p className="text-xs font-medium text-zinc-500">{label}</p><p className={`mt-0.5 text-xl font-semibold ${accent}`}>{value}</p></div>
      <p className="text-xs leading-5 text-zinc-500">{detail}</p>
    </article>
  );
}
