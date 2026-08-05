import Link from "next/link";

import { staffScenarioOptions } from "@/lib/staff/mock-staff-scenarios";
import type { StaffScenarioId } from "@/lib/staff/types";

export function StaffScenarioSwitcher({ activeScenario, currentPath, collapsedByDefault = false }: { activeScenario: StaffScenarioId | null; currentPath: string; collapsedByDefault?: boolean }) {
  return (
    <details open={!collapsedByDefault} className={`group border border-amber-300/20 bg-amber-300/[0.035] ${collapsedByDefault ? "rounded-lg" : "rounded-2xl"}`}>
      <summary className={`flex min-h-10 cursor-pointer list-none flex-wrap items-center justify-between gap-2 text-xs font-extrabold uppercase tracking-[0.14em] text-amber-200 marker:hidden ${collapsedByDefault ? "px-3 py-2" : "px-4 py-3 sm:px-5"}`}>
        <span id="staff-scenario-title">Development preview selector</span>
        <span className="flex items-center gap-3"><span className="normal-case tracking-normal text-amber-100/55">URL-only · never stored</span><span aria-hidden="true" className="text-base transition-transform group-open:rotate-180">⌄</span></span>
      </summary>
      <section aria-labelledby="staff-scenario-title" className={`border-t border-amber-300/15 ${collapsedByDefault ? "p-3" : "p-4 sm:p-5"}`}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-amber-100/55">Choose an access scenario for this preview.</p>
        </div>
      <div className="grid gap-2 min-[430px]:grid-cols-2 xl:grid-cols-4">
        {staffScenarioOptions.map(({ scenarioId, label }) => {
          const active = activeScenario === scenarioId;
          return <Link key={scenarioId} href={`${currentPath}?staffDemo=${scenarioId}`} aria-current={active ? "page" : undefined} className={`flex items-center border px-3 text-sm font-extrabold transition-colors ${collapsedByDefault ? "min-h-10 rounded-lg py-2" : "min-h-12 rounded-xl py-2.5"} ${active ? "border-cyan-300/55 bg-cyan-300/10 text-cyan-100" : "border-white/10 bg-black/15 text-zinc-300 hover:border-white/25 hover:text-white"}`}><span aria-hidden="true" className="mr-2">{active ? "●" : "○"}</span><span>{label}{active ? <span className="sr-only"> (current)</span> : null}</span></Link>;
        })}
      </div>
        <p className="mt-3 text-xs leading-5 text-amber-100/55">These links do not authenticate anyone, change roles, set cookies, or create a staff session.</p>
      </section>
    </details>
  );
}
