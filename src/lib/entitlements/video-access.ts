import "server-only";

import { randomUUID } from "node:crypto";

import { subscriberVideos } from "@/data/mock-data";

import { evaluateMemberAccess } from "./evaluate-member-access";
import type { MemberAccessState, MockPlaybackDecision } from "./types";

export function getSubscriberVideo(videoId: string) {
  return subscriberVideos.find((video) => video.id === videoId);
}

export function authorizeMockPlayback(
  state: MemberAccessState,
  videoId: string,
  now = new Date(),
): MockPlaybackDecision {
  if (!getSubscriberVideo(videoId)) {
    return { allowed: false, reason: "video_not_found", developmentOnly: true };
  }

  const entitlement = evaluateMemberAccess(state);
  if (!entitlement.allowed && entitlement.reason !== "allowed") {
    return { allowed: false, reason: entitlement.reason, developmentOnly: true };
  }

  return {
    allowed: true,
    reason: "allowed",
    playbackReference: `mock-playback:${videoId}:${randomUUID()}`,
    expiresAt: new Date(now.getTime() + 5 * 60 * 1000).toISOString(),
    developmentOnly: true,
  };
}
