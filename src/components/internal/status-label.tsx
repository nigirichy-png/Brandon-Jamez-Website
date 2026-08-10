type Tone = "neutral" | "positive" | "warning" | "danger" | "info";

const tones: Record<Tone, string> = {
  neutral: "border-white/12 bg-white/[0.05] text-zinc-300",
  positive: "border-emerald-300/25 bg-emerald-300/[0.08] text-emerald-200",
  warning: "border-amber-300/25 bg-amber-300/[0.08] text-amber-200",
  danger: "border-rose-300/25 bg-rose-300/[0.08] text-rose-200",
  info: "border-cyan-300/25 bg-cyan-300/[0.08] text-cyan-200",
};

export function StatusLabel({ children, tone = "neutral" }: { children: React.ReactNode; tone?: Tone }) {
  return <span className={`inline-flex min-h-6 items-center rounded border px-2 py-0.5 text-[0.7rem] font-semibold ${tones[tone]}`}>{children}</span>;
}
