export function SummaryCard({ label, value, detail, accent = "text-cyan-200" }: { label: string; value: string | number; detail: string; accent?: string }) {
  return (
    <article className="rounded-2xl border border-white/10 bg-[#12151c] p-5">
      <p className="text-xs font-extrabold uppercase tracking-[0.13em] text-zinc-500">{label}</p>
      <p className={`font-display mt-3 text-3xl font-bold ${accent}`}>{value}</p>
      <p className="mt-2 text-sm leading-6 text-zinc-400">{detail}</p>
    </article>
  );
}
