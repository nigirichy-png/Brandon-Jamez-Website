import "server-only";

import type { MemberAccessDecision, MemberAccessState } from "./types";

export function evaluateMemberAccess(state: MemberAccessState): MemberAccessDecision {
  if (!state.authenticated) return { allowed: false, reason: "not_authenticated" };
  if (state.accountBlocked) return { allowed: false, reason: "account_blocked" };
  if (!state.ageVerified) return { allowed: false, reason: "age_verification_required" };
  if (state.subscriptionStatus === "expired") return { allowed: false, reason: "subscription_expired" };
  if (!state.subscriptionActive) return { allowed: false, reason: "subscription_required" };
  return { allowed: true, reason: "allowed" };
}
