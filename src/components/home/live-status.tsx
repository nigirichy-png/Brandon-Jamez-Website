import { liveStatus } from "@/data/mock-data";
import type { LiveStatus as LiveStatusType } from "@/types";

const statusDesign: Record<LiveStatusType["status"], { label: string; dot: string; badge: string }> = {
  live: { label: "Live now", dot: "bg-emerald-300 motion-safe:animate-pulse", badge: "border-emerald-300/25 bg-emerald-300/10 text-emerald-200" },
  offline: { label: "Currently offline", dot: "bg-zinc-500", badge: "border-white/10 bg-white/[0.04] text-zinc-300" },
  scheduled: { label: "Session scheduled", dot: "bg-amber-300", badge: "border-amber-300/25 bg-amber-300/10 text-amber-200" },
};

export function LiveStatus() {
  const design = statusDesign[liveStatus.status];

  return (
    <section className="page-shell py-5 sm:py-7" aria-labelledby="live-status-title">
      <div className="grid gap-4 border-y border-white/10 py-5 sm:grid-cols-[auto_1fr_auto] sm:items-center sm:gap-5">
        <div className={`flex min-h-9 w-fit items-center gap-2 rounded-full border px-3 py-2 text-xs font-extrabold ${design.badge}`}>
          <span className={`size-2 rounded-full ${design.dot}`} aria-hidden="true" />
          {design.label}
        </div>
        <div>
          <p className="eyebrow text-zinc-500">Mock live status</p>
          <h2 id="live-status-title" className="font-display mt-1 text-xl font-bold tracking-tight text-white sm:text-2xl">{liveStatus.title}</h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-zinc-400">{liveStatus.message}</p>
        </div>
        <div className="text-left sm:text-right">
          {liveStatus.scheduledFor ? <p className="text-sm font-bold text-zinc-200">{liveStatus.scheduledFor}</p> : null}
          <p className="mt-1 text-xs text-zinc-500">{liveStatus.updatedAt}</p>
        </div>
      </div>
    </section>
  );
}
