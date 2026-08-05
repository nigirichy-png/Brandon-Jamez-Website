import type { ComponentType } from "react";

import type { CmsVideoPlatform } from "@/lib/cms/video-model";

type PlatformIconProps = { className?: string };

export type VideoPlatformIdentity = {
  key: string;
  label: string;
  accessibleLabel: string;
  icon: ComponentType<PlatformIconProps>;
  badgeClass: string;
  previewClass: string;
  watchButtonClass: string;
  watchLabel: string;
  sourceLabel?: string;
};

function YouTubeIcon({ className = "" }: PlatformIconProps) {
  return <svg viewBox="0 0 24 24" className={className} aria-hidden="true" focusable="false"><path fill="currentColor" fillRule="evenodd" d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8ZM9.6 15.6v-7.2l6.2 3.6-6.2 3.6Z" /></svg>;
}

function RumbleIcon({ className = "" }: PlatformIconProps) {
  return <svg viewBox="0 0 24 24" className={className} aria-hidden="true" focusable="false"><path fill="currentColor" fillRule="evenodd" d="M4.2 2.8a2 2 0 0 1 2.2-.1l14.1 7.6a2 2 0 0 1 0 3.4L6.4 21.3a2 2 0 0 1-2.9-1.8v-15a2 2 0 0 1 .7-1.7Zm4 5.1v8.2l7.6-4.1-7.6-4.1Z" /></svg>;
}

function KickIcon({ className = "" }: PlatformIconProps) {
  return <svg viewBox="0 0 24 24" className={className} aria-hidden="true" focusable="false"><path fill="currentColor" d="M3 3h6v6h2V7h2V5h2V3h6v6h-2v2h-2v2h2v2h2v6h-6v-2h-2v-2h-2v-2H9v6H3V3Z" /></svg>;
}

function BjVideoIcon({ className = "" }: PlatformIconProps) {
  return <span className={`inline-flex items-center justify-center rounded-[0.3em] bg-gradient-to-br from-fuchsia-500 to-cyan-300 font-display text-[0.55em] font-black tracking-[-0.08em] text-white ${className}`} aria-hidden="true">BJ</span>;
}

export const currentVideoPlatforms: readonly CmsVideoPlatform[] = ["youtube", "rumble", "kick"];

export const videoPlatformIdentities: Record<CmsVideoPlatform, VideoPlatformIdentity> = {
  youtube: {
    key: "youtube",
    label: "YouTube",
    accessibleLabel: "YouTube video platform",
    icon: YouTubeIcon,
    badgeClass: "border-red-400/35 bg-red-500/10 text-red-200",
    previewClass: "from-[#ff0033]/75 via-[#4d0714] to-[#09090d]",
    watchButtonClass: "border-red-400/45 bg-red-600 text-white shadow-[0_16px_45px_rgba(220,38,38,0.2)] hover:bg-red-500",
    watchLabel: "Watch on YouTube",
  },
  rumble: {
    key: "rumble",
    label: "Rumble",
    accessibleLabel: "Rumble video platform",
    icon: RumbleIcon,
    badgeClass: "border-emerald-300/35 bg-emerald-400/10 text-emerald-200",
    previewClass: "from-emerald-500/75 via-[#064e3b] to-[#07110d]",
    watchButtonClass: "border-emerald-300/45 bg-emerald-500 text-emerald-950 shadow-[0_16px_45px_rgba(16,185,129,0.16)] hover:bg-emerald-400",
    watchLabel: "Watch on Rumble",
  },
  kick: {
    key: "kick",
    label: "Kick",
    accessibleLabel: "Kick video platform",
    icon: KickIcon,
    badgeClass: "border-lime-300/35 bg-lime-300/10 text-lime-200",
    previewClass: "from-[#53fc18]/70 via-[#245c0b] to-[#081006]",
    watchButtonClass: "border-lime-300/50 bg-[#53fc18] text-[#0a1905] shadow-[0_16px_45px_rgba(83,252,24,0.14)] hover:bg-lime-300",
    watchLabel: "Watch on Kick",
  },
};

// Dormant extension point only. This is intentionally not part of
// videoPlatformIdentities or currentVideoPlatforms, so it cannot enter the CMS
// until a future media/source model explicitly supports hosted video.
export const futureHostedVideoIdentity: VideoPlatformIdentity = {
  key: "hosted",
  label: "BJ Video",
  accessibleLabel: "Brandon Jamez hosted video",
  icon: BjVideoIcon,
  badgeClass: "border-cyan-300/35 bg-gradient-to-r from-fuchsia-400/10 to-cyan-300/10 text-cyan-100",
  previewClass: "from-fuchsia-500/70 via-violet-950 to-cyan-950",
  watchButtonClass: "border-cyan-300/40 bg-gradient-to-r from-fuchsia-500 to-cyan-400 text-white shadow-[var(--shadow-accent)] hover:brightness-110",
  watchLabel: "Watch video",
  sourceLabel: "Exclusive",
};

export function VideoIdentityBadge({ identity, className = "", label = identity.label }: { identity: VideoPlatformIdentity; className?: string; label?: string }) {
  const Icon = identity.icon;
  return <span aria-label={identity.accessibleLabel} className={`inline-flex min-h-7 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-extrabold tracking-[0.08em] ${identity.badgeClass} ${className}`}><Icon className="size-4 shrink-0" /><span>{label}</span></span>;
}

export function VideoPlatformBadge({ platform, className = "", label }: { platform: CmsVideoPlatform; className?: string; label?: string }) {
  return <VideoIdentityBadge identity={videoPlatformIdentities[platform]} className={className} label={label} />;
}

export function VideoPlatformIcon({ platform, className = "" }: { platform: CmsVideoPlatform; className?: string }) {
  const Icon = videoPlatformIdentities[platform].icon;
  return <Icon className={className} />;
}
