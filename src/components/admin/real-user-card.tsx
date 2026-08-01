import Link from "next/link";

import { StatusLabel } from "@/components/internal/status-label";
import type { Role } from "@/types";

type UserCard = {
  id: string;
  displayName: string;
  maskedEmail: string;
  createdAt: string;
  lastActivityAt: string | null;
  roles: Role[];
  blocked: boolean;
  ageStatus: string;
  subscriptionStatus: string;
};

function dateLabel(value: string | null) {
  return value ? new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(value)) : "No recorded sign-in";
}

export function RealUserCard({ user }: { user: UserCard }) {
  return <article className="min-w-0 rounded-2xl border border-white/10 bg-[#12151c] p-5 sm:p-6">
    <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><h2 className="font-display break-words text-xl font-bold text-white">{user.displayName}</h2><p className="mt-1 break-all text-sm text-zinc-500">{user.maskedEmail}</p></div><StatusLabel tone={user.blocked ? "danger" : "positive"}>{user.blocked ? "Restricted" : "Active"}</StatusLabel></div>
    <div className="mt-4 flex flex-wrap gap-2">{user.roles.length ? user.roles.map((role) => <StatusLabel key={role} tone="info">{role.replace("_", " ")}</StatusLabel>) : <StatusLabel>No role</StatusLabel>}</div>
    <dl className="mt-5 grid gap-3 border-y border-white/10 py-4 text-sm min-[430px]:grid-cols-2"><div><dt className="text-zinc-600">Age verification</dt><dd className="mt-1 font-bold text-zinc-300">{user.ageStatus.replace("_", " ")}</dd></div><div><dt className="text-zinc-600">Subscription</dt><dd className="mt-1 font-bold text-zinc-300">{user.subscriptionStatus.replace("_", " ")}</dd></div><div><dt className="text-zinc-600">Created</dt><dd className="mt-1 font-bold text-zinc-300">{dateLabel(user.createdAt)}</dd></div><div><dt className="text-zinc-600">Last activity</dt><dd className="mt-1 font-bold text-zinc-300">{dateLabel(user.lastActivityAt)}</dd></div></dl>
    <Link href={`/admin/users/${encodeURIComponent(user.id)}`} className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-cyan-400 px-5 text-sm font-extrabold text-slate-950 hover:bg-cyan-300">Review account</Link>
  </article>;
}
