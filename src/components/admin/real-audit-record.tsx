import { StatusLabel } from "@/components/internal/status-label";
import type { SafeAuditEvent } from "@/lib/admin/data";

const actionLabels: Record<string, string> = {
  "profile.display_name_updated": "Display name updated",
  "role.assigned": "Role assigned",
  "role.removed": "Role removed",
  "account.blocked": "Account blocked",
  "account.restored": "Account restored",
};

export function RealAuditRecord({ event }: { event: SafeAuditEvent }) {
  const timestamp = new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(new Date(event.occurredAt));
  return <article className="grid min-w-0 gap-4 rounded-2xl border border-white/10 bg-[#12151c] p-5 sm:p-6 lg:grid-cols-[11rem_1fr_12rem]">
    <div><p className="text-xs font-extrabold uppercase tracking-[0.12em] text-zinc-600">Timestamp (UTC)</p><time dateTime={event.occurredAt} className="mt-2 block text-sm font-bold leading-5 text-zinc-300">{timestamp}</time></div>
    <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h2 className="font-display text-lg font-bold text-white">{actionLabels[event.action] ?? "Administrative activity"}</h2><StatusLabel tone="positive">{event.result}</StatusLabel></div><p className="mt-2 break-words text-sm text-zinc-400">{event.targetType}: <span className="font-bold text-zinc-300">{event.targetLabel}</span></p></div>
    <div className="lg:text-right"><p className="text-xs font-extrabold uppercase tracking-[0.12em] text-zinc-600">Actor</p><p className="mt-2 break-words text-sm font-bold text-zinc-300">{event.actorLabel}</p><p className="mt-1 text-xs text-zinc-500">{event.actorRoles.length ? event.actorRoles.map((role) => role.replace("_", " ")).join(", ") : "No role snapshot"}</p></div>
  </article>;
}
