import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AccessGate } from "@/components/member/access-gate";
import { AccessSummary } from "@/components/member/access-summary";
import { ScenarioSwitcher } from "@/components/member/scenario-switcher";
import { evaluateMemberAccess } from "@/lib/entitlements/evaluate-member-access";
import { getMockScenario } from "@/lib/entitlements/mock-scenarios";
import { authorizeMockPlayback, getSubscriberVideo } from "@/lib/entitlements/video-access";

export const metadata: Metadata = { title: "Member Video Demo" };

type VideoPageProps = {
  params: Promise<{ videoId: string }>;
  searchParams: Promise<{ demo?: string | string[] }>;
};

export default async function MemberVideoPage({ params, searchParams }: VideoPageProps) {
  const [{ videoId }, query] = await Promise.all([params, searchParams]);
  const video = getSubscriberVideo(videoId);
  if (!video) notFound();

  const state = getMockScenario(query.demo);
  const decision = evaluateMemberAccess(state);
  const playback = authorizeMockPlayback(state, video.id);
  const backHref = `/member?demo=${state.scenarioId}`;

  return (
    <main id="main-content" className="flex-1">
      <section className="page-shell py-10 sm:py-14 lg:py-16">
        <Link href={backHref} className="inline-flex min-h-11 items-center rounded text-sm font-extrabold text-cyan-300 hover:text-cyan-200"><span className="mr-2" aria-hidden="true">←</span> Back to member library</Link>
        <div className="mt-7"><ScenarioSwitcher activeScenario={state.scenarioId} /></div>
      </section>
      <section className="page-shell pb-12 sm:pb-16"><AccessSummary state={state} decision={decision} /></section>

      {!decision.allowed || !playback.allowed ? (
        <section className="page-shell pb-[var(--section-space)]">
          <div className="mb-7 rounded-[var(--radius-lg)] border border-white/10 bg-[var(--surface)] p-6 sm:p-8">
            <p className="eyebrow text-zinc-500">Subscriber video</p>
            <h1 className="font-display mt-3 text-4xl font-bold tracking-tight text-white sm:text-5xl">Playback details are gated</h1>
            <p className="mt-4 max-w-2xl leading-7 text-zinc-400">Subscriber metadata and mock playback decisions appear only after every server-side demo check passes.</p>
          </div>
          <AccessGate decision={decision} />
        </section>
      ) : (
        <article className="page-shell pb-[var(--section-space)]">
          <div className="relative aspect-video overflow-hidden rounded-[var(--radius-xl)] border border-white/10 bg-gradient-to-br from-violet-600/50 via-fuchsia-950 to-black shadow-[var(--shadow-card)]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_65%_25%,rgba(94,232,237,.16),transparent_30%)]" aria-hidden="true" />
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
              <span className="flex size-16 items-center justify-center rounded-full border border-white/20 bg-black/30 text-2xl text-white" aria-hidden="true">◇</span>
              <p className="font-display mt-5 text-2xl font-bold text-white sm:text-3xl">Playback is not connected</p>
              <p className="mt-2 max-w-lg text-sm leading-6 text-white/65">The server issued a short-lived, obviously fake authorization decision. No media URL, token, asset, or provider request exists.</p>
            </div>
            <span className="absolute left-4 top-4 rounded-full border border-amber-200/20 bg-black/45 px-3 py-2 text-[0.68rem] font-extrabold uppercase tracking-[0.12em] text-amber-100 backdrop-blur sm:left-6 sm:top-6">Development player</span>
          </div>

          <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_20rem] lg:gap-14">
            <div>
              <p className="eyebrow text-fuchsia-300">{video.series} · {video.episode}</p>
              <h1 className="font-display mt-4 text-[clamp(2.75rem,7vw,5rem)] font-bold leading-[0.95] tracking-[-0.055em] text-white">{video.title}</h1>
              <p className="mt-5 max-w-3xl text-lg leading-8 text-zinc-300">{video.description}</p>
            </div>
            <dl className="divide-y divide-white/10 rounded-[var(--radius-lg)] border border-white/10 bg-[var(--surface)] px-5">
              <div className="flex justify-between gap-4 py-4"><dt className="text-sm text-zinc-500">Duration</dt><dd className="text-sm font-bold text-white">{video.duration}</dd></div>
              <div className="flex justify-between gap-4 py-4"><dt className="text-sm text-zinc-500">Published</dt><dd className="text-right text-sm font-bold text-white">{video.publishedAt}</dd></div>
              <div className="flex justify-between gap-4 py-4"><dt className="text-sm text-zinc-500">Rating</dt><dd className="text-sm font-bold text-white">{video.contentRating}</dd></div>
              <div className="py-4"><dt className="text-sm text-zinc-500">Mock authorization</dt><dd className="mt-1 text-sm font-bold text-emerald-200">Allowed for 5 minutes</dd></div>
            </dl>
          </div>

          <aside className="mt-10 rounded-[var(--radius-lg)] border border-cyan-300/20 bg-cyan-300/[0.045] p-6 sm:p-8">
            <p className="eyebrow text-cyan-300">Future production boundary</p>
            <p className="mt-3 max-w-4xl leading-7 text-zinc-300">A production request would validate the session and repeat blocking, age, subscription, and video checks immediately before asking a professional provider for short-lived playback authorization. This page performs only an in-memory simulation.</p>
          </aside>
        </article>
      )}
    </main>
  );
}
