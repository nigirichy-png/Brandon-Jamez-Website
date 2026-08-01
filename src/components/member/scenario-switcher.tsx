import Link from "next/link";

import { mockScenarioOptions } from "@/lib/entitlements/mock-scenarios";
import type { MockScenarioId } from "@/lib/entitlements/types";

export function ScenarioSwitcher({ activeScenario }: { activeScenario: MockScenarioId | null }) {
  return (
    <nav aria-label="Development access scenarios" className="rounded-[var(--radius-lg)] border border-amber-300/20 bg-amber-300/[0.045] p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p className="eyebrow text-amber-200">Development scenario</p>
        <span className="rounded-full border border-amber-200/20 px-2.5 py-1 text-xs font-bold text-amber-100/70">URL-only mock state</span>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {mockScenarioOptions.map(({ scenarioId, label }) => {
          const active = scenarioId === activeScenario;
          return (
            <Link
              key={scenarioId}
              href={`/member?demo=${scenarioId}`}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-12 items-center rounded-xl border px-4 py-3 text-sm font-extrabold transition-colors ${active ? "border-cyan-300/55 bg-cyan-300/10 text-cyan-100" : "border-white/10 bg-black/15 text-zinc-300 hover:border-white/25 hover:text-white"}`}
            >
              <span aria-hidden="true" className="mr-2 text-base">{active ? "●" : "○"}</span>
              {label}
            </Link>
          );
        })}
      </div>
      <p className="mt-4 text-xs leading-5 text-amber-100/55">Changing this query parameter does not authenticate, verify, subscribe, or store anything.</p>
    </nav>
  );
}
