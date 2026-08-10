import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ModerationHubShell } from "@/components/live/moderation-hub-shell";
import { YouTubeModerationPanel } from "@/components/live/youtube-moderation-panel";
import { loadRealAccountState } from "@/lib/auth/access-state";
import { getCurrentLiveSession } from "@/lib/live/data";
import { isPublicModerationHubPreviewEnabled } from "@/lib/live/moderation-hub-preview";

export const metadata: Metadata = { title: "Moderation Hub Preview", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function PublicModerationHubPreviewPage() {
  if (!isPublicModerationHubPreviewEnabled()) notFound();
  const [session, account] = await Promise.all([getCurrentLiveSession().catch(() => null), loadRealAccountState()]);
  const staffAccess = Boolean(account.user && !account.accessLoadFailed && !account.accountBlocked && (account.roles.includes("admin") || account.roles.includes("moderator")));
  const isAdmin = staffAccess && account.roles.includes("admin");
  const publicPreview = !staffAccess;
  return <ModerationHubShell operatorName={staffAccess ? account.displayName ?? (isAdmin ? "Website administrator" : "Website moderator") : "Public viewer"} accessLabel={staffAccess ? isAdmin ? "Administrator" : "Moderator" : "No backend access"} publicPreview={publicPreview}>
    <YouTubeModerationPanel key={session?.updatedAt ?? "no-session"} videoId={session?.source === "youtube" ? session.youtubeVideoId : null} canModerate={staffAccess} canSend={isAdmin} canSelectStream={staffAccess} streamTitle={session?.title ?? null} sessionStatus={session?.status ?? "offline"} endpoint={staffAccess ? "/api/mod/live/youtube" : "/api/live/youtube"} publicPreview={publicPreview} fullScreen releaseClient={staffAccess} />
  </ModerationHubShell>;
}
