import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { StaffAccessGate } from "@/components/internal/staff-access-gate";
import { LiveChatModeration, LiveConfigurationForm, LiveStatusForm } from "@/components/live/live-moderation-panel";
import { ModerationHubShell } from "@/components/live/moderation-hub-shell";
import { YouTubeModerationPanel } from "@/components/live/youtube-moderation-panel";
import { resolveStaffAccessState } from "@/lib/auth/access-state";
import { getCurrentLiveSession, listLiveChatMessages } from "@/lib/live/data";
import { evaluateModeratorAccess } from "@/lib/staff/evaluate-staff-access";

export const metadata: Metadata = { title: "Live moderation" };
export const dynamic = "force-dynamic";

export default async function LiveModerationPage({ searchParams }: { searchParams: Promise<{ staffDemo?: string | string[] }> }) {
  const state = await resolveStaffAccessState((await searchParams).staffDemo);
  if (!state.developmentPreview && !state.authenticated) redirect("/login?next=/mod/live");
  const decision = evaluateModeratorAccess(state);
  const realAccess = decision.allowed && !state.developmentPreview;
  const session = realAccess ? await getCurrentLiveSession().catch(() => null) : null;
  const messages = session ? await listLiveChatMessages(session.id).catch(() => []) : [];
  const isAdmin = state.roles.includes("admin");
  const operatorName = state.displayName ?? (isAdmin ? "Website administrator" : "Website moderator");

  if (!decision.allowed || state.developmentPreview) return <ModerationHubShell operatorName={operatorName} accessLabel="Access status"><div className="mx-auto mt-10 w-[min(42rem,calc(100%-2rem))]">{!decision.allowed ? <StaffAccessGate decision={decision} area="moderator" /> : <p className="border border-white/10 p-6 text-zinc-400">A real active staff session is required.</p>}</div></ModerationHubShell>;

  const tools = <div className="space-y-8">
    {isAdmin ? <section><LiveConfigurationForm session={session} />{session ? <LiveStatusForm session={session} /> : null}</section>
      : <section><h2 className="font-display text-2xl font-bold text-white">Stream configuration</h2><p className="mt-3 text-sm text-zinc-400">Read-only for moderators. Only administrators can change the source or status.</p>{session ? <dl className="mt-4 text-sm text-zinc-300"><dt>Source</dt><dd className="font-bold text-white">{session.source}</dd><dt className="mt-2">Status</dt><dd className="font-bold text-white">{session.status}</dd></dl> : null}</section>}
    <section className="border-t border-white/10 pt-6">{session ? <LiveChatModeration session={session} messages={messages} /> : <p className="text-zinc-500">Configure a live session before moderating website chat.</p>}</section>
  </div>;

  return <ModerationHubShell operatorName={operatorName} accessLabel={isAdmin ? "Administrator" : "Moderator"} settings={tools}>
    <YouTubeModerationPanel key={session?.updatedAt ?? "no-session"} videoId={session?.source === "youtube" ? session.youtubeVideoId : null} canModerate canSend={isAdmin} canSelectStream streamTitle={session?.title ?? null} sessionStatus={session?.status ?? "offline"} fullScreen />
  </ModerationHubShell>;
}
