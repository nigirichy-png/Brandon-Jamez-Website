import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AccessGate } from "@/components/member/access-gate";
import { AccessSummary } from "@/components/member/access-summary";
import { ScenarioSwitcher } from "@/components/member/scenario-switcher";
import { SubscriberVideoCard } from "@/components/member/subscriber-video-card";
import { subscriberVideos } from "@/data/mock-data";
import { evaluateMemberAccess } from "@/lib/entitlements/evaluate-member-access";
import { resolveMemberAccessState } from "@/lib/auth/access-state";

export const metadata: Metadata = { title: "Member Library Demo" };

type MemberPageProps = {
  searchParams: Promise<{ demo?: string | string[] }>;
};

export default async function MemberPage({ searchParams }: MemberPageProps) {
  const query = await searchParams;
  const state = await resolveMemberAccessState(query.demo);
  if (!state.developmentPreview && !state.authenticated) redirect("/login?next=/member");
  const decision = evaluateMemberAccess(state);
  const featured = subscriberVideos.find((video) => video.featured) ?? subscriberVideos[0];
  const continueWatching = subscriberVideos.filter((video) => video.progressPercent > 0 && video.id !== featured.id);
  const recent = subscriberVideos.filter((video) => video.id !== featured.id);

  return (
    <main id="main-content" className="flex-1">
      <section className="page-shell pb-10 pt-10 sm:pb-14 sm:pt-14 lg:pb-16 lg:pt-20">
        <div className="grid items-end gap-8 lg:grid-cols-[1fr_.82fr] lg:gap-14">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="eyebrow text-fuchsia-300">Member experience</span>
              <span className={`rounded-full border px-3 py-1 text-xs font-extrabold uppercase tracking-[0.12em] ${state.developmentPreview ? "border-amber-300/25 bg-amber-300/10 text-amber-200" : "border-emerald-300/25 bg-emerald-300/10 text-emerald-200"}`}>{state.developmentPreview ? "Development preview" : "Validated account"}</span>
            </div>
            <h1 className="font-display mt-5 max-w-4xl text-[clamp(3rem,9vw,6.5rem)] font-bold leading-[0.9] tracking-[-0.065em] text-white">A realistic library. <span className="gradient-text">No real access.</span></h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-zinc-300 sm:text-lg">{state.developmentPreview ? "This server-rendered demo shows how account, verification, subscription, and blocking states shape the member experience." : "This server-rendered page evaluates your current account, verification, subscription, and blocking state through Supabase and RLS-protected records."}</p>
          </div>
          <p className="border-l-2 border-cyan-300/40 pl-5 text-sm leading-6 text-zinc-400">{state.developmentPreview ? <>Scenario state comes only from the allowlisted <code className="rounded bg-white/[0.06] px-1.5 py-1 text-cyan-200">?demo=</code> query. It is not authentication and is never stored.</> : "Identity comes from the validated cookie-backed session; account state comes from RLS-protected records and fails closed."}</p>
        </div>
      </section>

      <section className="page-shell pb-10 sm:pb-14"><ScenarioSwitcher activeScenario={state.scenarioId} /></section>
      <section className="page-shell pb-12 sm:pb-16"><AccessSummary state={state} decision={decision} /></section>

      {!decision.allowed ? (
        <section className="page-shell pb-[var(--section-space)]"><AccessGate decision={decision} /></section>
      ) : (
        <>
          <section className="page-shell pb-14 sm:pb-20">
            <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
              <div><p className="eyebrow text-fuchsia-300">Featured exclusive</p><h2 className="font-display mt-3 text-4xl font-bold tracking-tight text-white sm:text-5xl">Welcome back, {state.displayName}</h2></div>
              <span className="rounded-full border border-emerald-300/25 bg-emerald-300/10 px-3 py-2 text-xs font-extrabold text-emerald-200">{state.developmentPreview ? "Mock entitlement active" : "Entitlement active"}</span>
            </div>
            <SubscriberVideoCard video={featured} scenarioId={state.scenarioId} featured />
          </section>

          {continueWatching.length > 0 ? (
            <section className="border-y border-white/10 bg-[var(--page-deep)]">
              <div className="page-shell py-14 sm:py-20">
                <p className="eyebrow text-cyan-300">Your progress</p>
                <h2 className="font-display mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">Continue watching</h2>
                <div className="mt-7 grid gap-5 md:grid-cols-2">{continueWatching.map((video) => <SubscriberVideoCard key={video.id} video={video} scenarioId={state.scenarioId} />)}</div>
              </div>
            </section>
          ) : null}

          <section className="page-shell section-space">
            <div className="mb-8 flex flex-wrap items-end justify-between gap-5">
              <div><p className="eyebrow text-fuchsia-300">Member library</p><h2 className="font-display mt-3 text-4xl font-bold tracking-tight text-white sm:text-5xl">Recently added</h2></div>
              <div className="flex flex-wrap gap-2" aria-label="Mock library categories"><span className="rounded-full bg-white/[0.07] px-3 py-2 text-xs font-bold text-zinc-200">All</span><span className="rounded-full border border-white/10 px-3 py-2 text-xs font-bold text-zinc-400">Stories</span><span className="rounded-full border border-white/10 px-3 py-2 text-xs font-bold text-zinc-400">Studio</span></div>
            </div>
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">{recent.map((video) => <SubscriberVideoCard key={video.id} video={video} scenarioId={state.scenarioId} />)}</div>
          </section>
        </>
      )}
    </main>
  );
}
