import Link from "next/link";

import { getInternalNavigation, withStaffScenario } from "@/lib/staff/internal-navigation";
import type { StaffAccessState } from "@/lib/staff/types";

export function InternalNavigation({ state, currentPath }: { state: StaffAccessState; currentPath: string; compact?: boolean }) {
  const items = getInternalNavigation(state);
  const groups = Array.from(new Set(items.map((item) => item.group)));
  return (
    <nav aria-label="Internal operations navigation">
      {items.length ? <div className="space-y-4">{groups.map((group) => <section key={group}>
        <p className="mb-1.5 px-2 text-[0.65rem] font-semibold uppercase tracking-[0.1em] text-zinc-600">{group}</p>
        <ul className="grid gap-0.5 min-[520px]:grid-cols-2 lg:grid-cols-1">{items.filter((item) => item.group === group).map((item) => {
          const active = currentPath === item.href;
          return <li key={item.href}><Link href={withStaffScenario(item.href, state.scenarioId)} aria-current={active ? "page" : undefined} className={`flex min-h-9 items-center border-l-2 px-2.5 py-1.5 text-sm transition-colors ${active ? "border-zinc-100 bg-white/[0.06] font-semibold text-white" : "border-transparent text-zinc-400 hover:bg-white/[0.035] hover:text-zinc-200"}`}>{item.label}</Link></li>;
        })}</ul>
      </section>)}</div> : <p className="border border-white/10 bg-black/15 p-3 text-sm leading-6 text-zinc-500">Select an authorized staff preview to show navigation.</p>}
    </nav>
  );
}
