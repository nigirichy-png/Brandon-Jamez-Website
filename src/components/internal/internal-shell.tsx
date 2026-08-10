import Link from "next/link";

import type { StaffAccessDecision, StaffAccessState } from "@/lib/staff/types";
import { InternalNavigation } from "./internal-navigation";
import { StaffScenarioSwitcher } from "./staff-scenario-switcher";
import { StatusLabel } from "./status-label";

export function InternalShell({ state, decision, currentPath, eyebrow, title, description, children }: { state: StaffAccessState; decision: StaffAccessDecision; currentPath: string; eyebrow: string; title: string; description: string; children: React.ReactNode }) {
  const accountTone = state.accountBlocked ? "danger" : state.authenticated ? "positive" : "neutral";
  return (
    <main id="main-content" className="internal-console flex-1 bg-[#0b0d10]">
      <section className="border-b border-white/10 bg-[#111419]">
        <div className="flex min-h-14 flex-wrap items-center justify-between gap-3 px-4 py-2 lg:px-5">
          <div className="flex items-center gap-3">
            <strong className="text-sm font-semibold text-zinc-100">Internal administration</strong>
            <span className="hidden text-xs text-zinc-600 sm:inline">/</span>
            <span className="hidden text-xs text-zinc-400 sm:inline">{state.developmentPreview ? "Development preview" : "Live account"}</span>
          </div>
          <Link href="/" className="text-sm font-medium text-zinc-400 underline decoration-zinc-700 underline-offset-4 hover:text-white">View website</Link>
        </div>
      </section>

      <div className="grid lg:min-h-[calc(100vh-3.5rem)] lg:grid-cols-[15rem_minmax(0,1fr)]">
        <details className="group mx-3 mt-3 border-b border-white/10 lg:hidden">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-3 text-sm marker:hidden">
            <span><strong className="font-semibold text-white">Menu</strong><span className="ml-2 text-zinc-500">{state.displayName ?? "No operator"}</span></span>
            <span aria-hidden="true" className="text-zinc-500 transition-transform group-open:rotate-180">⌄</span>
          </summary>
          <div className="border-t border-white/10 p-3"><InternalNavigation state={state} currentPath={currentPath} compact /></div>
        </details>

        <aside className="hidden border-r border-white/10 bg-[#0e1115] px-3 py-5 lg:sticky lg:top-0 lg:block lg:h-screen lg:overflow-y-auto">
          <div className="border-b border-white/10 px-2 pb-4">
            <p className="truncate text-sm font-semibold text-white">{state.displayName ?? "No signed-in operator"}</p>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-500"><span>{state.simulatedRoleLabel}</span><StatusLabel tone={accountTone}>{state.accountStatusLabel}</StatusLabel></div>
          </div>
          <div className="pt-3"><InternalNavigation state={state} currentPath={currentPath} compact /></div>
        </aside>

        <div className="min-w-0 px-4 py-5 lg:max-w-[78rem] lg:px-8 lg:py-7">
          <header className="border-b border-white/10 pb-5">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-zinc-500">{eyebrow}</p>
            <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
              <h1 className="text-[clamp(1.6rem,4vw,2rem)] font-semibold leading-tight tracking-[-0.02em] text-white">{title}</h1>
              {!decision.allowed ? <StatusLabel tone="danger">Access denied</StatusLabel> : null}
            </div>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">{description}</p>
          </header>
          {process.env.NODE_ENV === "development" ? <div className="my-4"><StaffScenarioSwitcher activeScenario={state.scenarioId} currentPath={currentPath} collapsedByDefault /></div> : <div className="h-5" />}
          {children}
        </div>
      </div>
    </main>
  );
}
