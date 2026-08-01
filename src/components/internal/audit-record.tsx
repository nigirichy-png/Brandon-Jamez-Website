import type { AuditEvent } from "@/lib/staff/types";
import { StatusLabel } from "./status-label";

export function AuditRecord({ event }: { event: AuditEvent }) {
  return (
    <article className="grid gap-4 rounded-2xl border border-white/10 bg-[#12151c] p-5 sm:p-6 lg:grid-cols-[11rem_1fr_12rem]">
      <div><p className="text-xs font-extrabold uppercase tracking-[0.12em] text-zinc-600">Timestamp</p><time className="mt-2 block text-sm font-bold leading-5 text-zinc-300">{event.timestamp}</time></div>
      <div><div className="flex flex-wrap items-center gap-2"><h3 className="font-display text-lg font-bold text-white">{event.action}</h3><StatusLabel tone={event.result === "escalated" ? "warning" : "info"}>{event.result}</StatusLabel></div><p className="mt-2 text-sm text-zinc-400">{event.targetType}: <span className="font-bold text-zinc-300">{event.targetLabel}</span></p><p className="mt-2 text-sm leading-6 text-zinc-500">{event.metadataSummary}</p></div>
      <div className="lg:text-right"><p className="text-xs font-extrabold uppercase tracking-[0.12em] text-zinc-600">Mock actor</p><p className="mt-2 text-sm font-bold text-zinc-300">{event.actorLabel}</p><p className="mt-1 text-xs text-zinc-500">{event.actorRole.replace("_", " ")}</p></div>
    </article>
  );
}
