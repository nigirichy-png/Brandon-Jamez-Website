import type { AccessState } from "@/types";

export const mockScenarioIds = [
  "guest",
  "signed_in_unverified",
  "age_verified_no_subscription",
  "active_subscriber",
  "blocked_subscriber",
  "expired_subscriber",
] as const;

export type MockScenarioId = (typeof mockScenarioIds)[number];
export type VerificationStatus = "not_started" | "verified";
export type SubscriptionStatus = "none" | "active" | "expired";

export type MockAccessScenario = AccessState & {
  scenarioId: MockScenarioId;
  label: string;
  displayName: string | null;
  verificationStatus: VerificationStatus;
  subscriptionStatus: SubscriptionStatus;
  subscriptionSummary: string;
};

export type MemberAccessReason =
  | "not_authenticated"
  | "account_blocked"
  | "age_verification_required"
  | "subscription_required"
  | "subscription_expired"
  | "allowed";

export type MemberAccessDecision = {
  allowed: boolean;
  reason: MemberAccessReason;
};

export type MockPlaybackDecision =
  | {
      allowed: true;
      reason: "allowed";
      playbackReference: string;
      expiresAt: string;
      developmentOnly: true;
    }
  | {
      allowed: false;
      reason: Exclude<MemberAccessReason, "allowed"> | "video_not_found";
      developmentOnly: true;
    };
