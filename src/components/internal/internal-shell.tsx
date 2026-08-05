import Link from "next/link";

import { BrandMark } from "@/components/ui/brand-mark";
import type { StaffAccessDecision, StaffAccessState } from "@/lib/staff/types";
import { InternalNavigation } from "./internal-navigation";
import { StaffScenarioSwitcher } from "./staff-scenario-switcher";
import { StatusLabel } from "./status-label";

export function InternalShell({ state, decision, currentPath, eyebrow, title, description, children }: { state: StaffAccessState; decision: StaffAccessDecision; currentPath: string; eyebrow: string; title: string; description: string; children: React.ReactNode }) {
  const accountTone = state.accountBlocked ? "danger" : state.authenticated ? "positive" : "neutral";
  const isAdmin = currentPath.startsWith("/admin");
  return (
    <main id="main-content" className="flex-1 bg-[#090b10]">
      <section className="border-b border-white/10 bg-[#0d1016]">
        <div className={`page-shell flex flex-wrap items-center justify-between ${isAdmin ? "gap-2 py-3" : "gap-4 py-5"}`}>
          <div className="flex min-w-0 items-center gap-3"><BrandMark /><span className="hidden h-7 w-px bg-white/15 min-[430px]:block" aria-hidden="true" /><span className="font-display hidden text-xs font-bold uppercase tracking-[0.17em] text-cyan-200 min-[390px]:inline">Internal operations</span></div>
          <div className="flex flex-wrap items-center gap-2"><StatusLabel tone={state.developmentPreview ? "warning" : "positive"}>{state.developmentPreview ? "Development preview" : "Validated account"}</StatusLabel><Link href="/" className="inline-flex min-h-10 items-center rounded-lg px-3 text-sm font-bold text-zinc-400 hover:bg-white/[0.05] hover:text-white">Public website <span className="ml-1.5" aria-hidden="true">↗</span></Link></div>
        </div>
      </section>

      <div className={`page-shell grid ${isAdmin ? "gap-4 py-4 lg:grid-cols-[13.75rem_minmax(0,1fr)] lg:gap-5 lg:py-5" : "gap-6 py-8 lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-8 lg:py-10"}`}>
        <aside className={`self-start border border-white/10 bg-[#10131a] lg:sticky ${isAdmin ? "rounded-xl p-3 lg:top-20" : "rounded-2xl p-4 lg:top-24"}`}>
          <p className="text-xs font-extrabold uppercase tracking-[0.13em] text-zinc-600">{state.developmentPreview ? "Simulated operator" : "Account operator"}</p>
          <p className={`font-display font-bold text-white ${isAdmin ? "mt-1.5 text-base" : "mt-2 text-lg"}`}>{state.displayName ?? "No signed-in operator"}</p>
          <p className={`${isAdmin ? "mt-0.5 text-xs" : "mt-1 text-sm"} text-zinc-400`}>{state.simulatedRoleLabel}</p>
          <div className={isAdmin ? "my-2.5" : "my-4"}><StatusLabel tone={accountTone}>{state.accountStatusLabel}</StatusLabel></div>
          <div className={`border-t border-white/10 ${isAdmin ? "pt-2.5" : "pt-4"}`}><InternalNavigation state={state} currentPath={currentPath} compact={isAdmin} /></div>
        </aside>

        <div className="min-w-0">
          <header className={`border-b border-white/10 ${isAdmin ? "pb-4" : "pb-7"}`}>
            <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-xs font-extrabold uppercase tracking-[0.15em] text-fuchsia-300">{eyebrow}</p><StatusLabel tone={decision.allowed ? "positive" : "danger"}>{decision.allowed ? state.developmentPreview ? "Preview authorized" : "Access authorized" : state.developmentPreview ? "Preview denied" : "Access denied"}</StatusLabel></div>
            <h1 className={`font-display max-w-4xl font-bold text-white ${isAdmin ? "mt-2 text-[clamp(1.75rem,4vw,2rem)] leading-tight tracking-[-0.025em]" : "mt-4 text-[clamp(2.4rem,7vw,5rem)] leading-[0.96] tracking-[-0.055em]"}`}>{title}</h1>
            <p className={`max-w-3xl text-zinc-400 ${isAdmin ? "mt-1.5 text-sm leading-6" : "mt-4 leading-7 sm:text-lg"}`}>{description}</p>
          </header>
          <div className={isAdmin ? "my-4" : "my-6"}>{!state.developmentPreview ? <p className={`${isAdmin ? "mb-2 rounded-lg px-3 py-2" : "mb-3 rounded-xl p-3"} border border-emerald-300/15 bg-emerald-300/[0.035] text-sm text-emerald-100`}>Authorization below uses the validated Supabase account.</p> : null}{process.env.NODE_ENV === "development" ? <StaffScenarioSwitcher activeScenario={state.scenarioId} currentPath={currentPath} collapsedByDefault={isAdmin} /> : null}</div>
          {children}
        </div>
      </div>
    </main>
  );
}
