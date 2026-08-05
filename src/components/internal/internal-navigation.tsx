import Link from "next/link";

import { getInternalNavigation, withStaffScenario } from "@/lib/staff/internal-navigation";
import type { StaffAccessState } from "@/lib/staff/types";

export function InternalNavigation({ state, currentPath, compact = false }: { state: StaffAccessState; currentPath: string; compact?: boolean }) {
  const items = getInternalNavigation(state);
  return (
    <nav aria-label="Internal operations navigation">
      <p className={`${compact ? "mb-2" : "mb-3"} text-[0.68rem] font-extrabold uppercase tracking-[0.15em] text-zinc-600`}>Authorized previews</p>
      {items.length ? <ul className="grid gap-1.5 min-[520px]:grid-cols-2 lg:grid-cols-1">{items.map((item) => {
        const active = currentPath === item.href;
        return <li key={item.href}><Link href={withStaffScenario(item.href, state.scenarioId)} aria-current={active ? "page" : undefined} className={`flex items-center justify-between px-3 text-sm font-bold transition-colors ${compact ? "min-h-10 rounded-lg py-1.5" : "min-h-11 rounded-xl py-2"} ${active ? "bg-cyan-300/10 text-cyan-100" : "text-zinc-400 hover:bg-white/[0.05] hover:text-white"}`}><span>{item.label}</span>{active ? <span className="text-[0.65rem] uppercase tracking-wider text-cyan-300">Current</span> : <span aria-hidden="true" className="text-zinc-700">→</span>}</Link></li>;
      })}</ul> : <p className="rounded-xl border border-white/10 bg-black/15 p-3 text-sm leading-6 text-zinc-500">Choose an authorized staff scenario to reveal relevant internal navigation.</p>}
    </nav>
  );
}
