import Link from "next/link";

import { staffScenarioOptions } from "@/lib/staff/mock-staff-scenarios";
import type { StaffScenarioId } from "@/lib/staff/types";

export function StaffScenarioSwitcher({ activeScenario, currentPath }: { activeScenario: StaffScenarioId; currentPath: string }) {
  return (
    <section aria-labelledby="staff-scenario-title" className="rounded-2xl border border-amber-300/20 bg-amber-300/[0.035] p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 id="staff-scenario-title" className="text-xs font-extrabold uppercase tracking-[0.14em] text-amber-200">Development preview selector</h2>
        <span className="text-xs font-bold text-amber-100/55">URL-only · never stored</span>
      </div>
      <div className="grid gap-2 min-[430px]:grid-cols-2 xl:grid-cols-4">
        {staffScenarioOptions.map(({ scenarioId, label }) => {
          const active = activeScenario === scenarioId;
          return <Link key={scenarioId} href={`${currentPath}?staffDemo=${scenarioId}`} aria-current={active ? "page" : undefined} className={`flex min-h-12 items-center rounded-xl border px-3 py-2.5 text-sm font-extrabold transition-colors ${active ? "border-cyan-300/55 bg-cyan-300/10 text-cyan-100" : "border-white/10 bg-black/15 text-zinc-300 hover:border-white/25 hover:text-white"}`}><span aria-hidden="true" className="mr-2">{active ? "●" : "○"}</span><span>{label}{active ? <span className="sr-only"> (current)</span> : null}</span></Link>;
        })}
      </div>
      <p className="mt-4 text-xs leading-5 text-amber-100/55">These links do not authenticate anyone, change roles, set cookies, or create a staff session.</p>
    </section>
  );
}
