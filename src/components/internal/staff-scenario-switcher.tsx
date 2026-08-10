import Link from "next/link";

import { staffScenarioOptions } from "@/lib/staff/mock-staff-scenarios";
import type { StaffScenarioId } from "@/lib/staff/types";

export function StaffScenarioSwitcher({ activeScenario, currentPath, collapsedByDefault = false }: { activeScenario: StaffScenarioId | null; currentPath: string; collapsedByDefault?: boolean }) {
  return (
    <details open={!collapsedByDefault} className="group border border-white/10 bg-[#111419]">
      <summary className="flex min-h-10 cursor-pointer list-none flex-wrap items-center justify-between gap-2 px-3 py-2 text-xs font-semibold text-zinc-400 marker:hidden">
        <span id="staff-scenario-title">Development access preview</span>
        <span className="flex items-center gap-2"><span className="font-normal text-zinc-600">URL only</span><span aria-hidden="true" className="transition-transform group-open:rotate-180">⌄</span></span>
      </summary>
      <section aria-labelledby="staff-scenario-title" className="border-t border-white/10 p-3">
        <div className="grid gap-2 min-[430px]:grid-cols-2 xl:grid-cols-4">
          {staffScenarioOptions.map(({ scenarioId, label }) => {
            const active = activeScenario === scenarioId;
            return <Link key={scenarioId} href={`${currentPath}?staffDemo=${scenarioId}`} aria-current={active ? "page" : undefined} className={`flex min-h-9 items-center border px-3 py-1.5 text-xs font-medium transition-colors ${active ? "border-zinc-400 bg-white/[0.07] text-white" : "border-white/10 bg-black/15 text-zinc-400 hover:border-white/25 hover:text-white"}`}><span aria-hidden="true" className="mr-2">{active ? "●" : "○"}</span><span>{label}{active ? <span className="sr-only"> (current)</span> : null}</span></Link>;
          })}
        </div>
        <p className="mt-2 text-xs leading-5 text-zinc-600">Preview links do not authenticate users or change stored permissions.</p>
      </section>
    </details>
  );
}
