import Link from "next/link";

import { BrandMark } from "@/components/ui/brand-mark";
import type { StaffAccessDecision, StaffAccessState } from "@/lib/staff/types";
import { InternalNavigation } from "./internal-navigation";
import { StaffScenarioSwitcher } from "./staff-scenario-switcher";
import { StatusLabel } from "./status-label";

export function InternalShell({ state, decision, currentPath, eyebrow, title, description, children }: { state: StaffAccessState; decision: StaffAccessDecision; currentPath: string; eyebrow: string; title: string; description: string; children: React.ReactNode }) {
  const accountTone = state.accountBlocked ? "danger" : state.authenticated ? "positive" : "neutral";
  return (
    <main id="main-content" className="flex-1 bg-[#090b10]">
      <section className="border-b border-white/10 bg-[#0d1016]">
        <div className="page-shell flex flex-wrap items-center justify-between gap-4 py-5">
          <div className="flex items-center gap-3"><BrandMark /><span className="hidden h-7 w-px bg-white/15 min-[430px]:block" aria-hidden="true" /><span className="font-display text-xs font-bold uppercase tracking-[0.17em] text-cyan-200">Internal operations</span></div>
          <div className="flex flex-wrap items-center gap-2"><StatusLabel tone={state.developmentPreview ? "warning" : "positive"}>{state.developmentPreview ? "Development preview" : "Validated account"}</StatusLabel><Link href="/" className="inline-flex min-h-10 items-center rounded-lg px-3 text-sm font-bold text-zinc-400 hover:bg-white/[0.05] hover:text-white">Public website <span className="ml-1.5" aria-hidden="true">↗</span></Link></div>
        </div>
      </section>

      <div className="page-shell grid gap-6 py-8 lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-8 lg:py-10">
        <aside className="self-start rounded-2xl border border-white/10 bg-[#10131a] p-4 lg:sticky lg:top-24">
          <p className="text-xs font-extrabold uppercase tracking-[0.13em] text-zinc-600">{state.developmentPreview ? "Simulated operator" : "Account operator"}</p>
          <p className="font-display mt-2 text-lg font-bold text-white">{state.displayName ?? "No signed-in operator"}</p>
          <p className="mt-1 text-sm text-zinc-400">{state.simulatedRoleLabel}</p>
          <div className="my-4"><StatusLabel tone={accountTone}>{state.accountStatusLabel}</StatusLabel></div>
          <div className="border-t border-white/10 pt-4"><InternalNavigation state={state} currentPath={currentPath} /></div>
        </aside>

        <div className="min-w-0">
          <header className="border-b border-white/10 pb-7">
            <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-xs font-extrabold uppercase tracking-[0.15em] text-fuchsia-300">{eyebrow}</p><StatusLabel tone={decision.allowed ? "positive" : "danger"}>{decision.allowed ? state.developmentPreview ? "Preview authorized" : "Access authorized" : state.developmentPreview ? "Preview denied" : "Access denied"}</StatusLabel></div>
            <h1 className="font-display mt-4 max-w-4xl text-[clamp(2.4rem,7vw,5rem)] font-bold leading-[0.96] tracking-[-0.055em] text-white">{title}</h1>
            <p className="mt-4 max-w-3xl leading-7 text-zinc-400 sm:text-lg">{description}</p>
          </header>
          <div className="my-6">{!state.developmentPreview ? <p className="mb-3 rounded-xl border border-emerald-300/15 bg-emerald-300/[0.035] p-3 text-sm text-emerald-100">Authorization below uses the validated Supabase account. Development scenarios remain available for explicit UI previews only.</p> : null}<StaffScenarioSwitcher activeScenario={state.scenarioId} currentPath={currentPath} /></div>
          {children}
        </div>
      </div>
    </main>
  );
}
