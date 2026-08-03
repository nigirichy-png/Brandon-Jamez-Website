import type { MemberAccessDecision, MemberAccessState } from "./types";

export function evaluateMemberAccessPolicy(
  state: MemberAccessState,
): MemberAccessDecision {
  if (!state.authenticated) return { allowed: false, reason: "not_authenticated" };
  if (state.accountBlocked) return { allowed: false, reason: "account_blocked" };
  if (["canceled", "expired", "incomplete_expired"].includes(state.subscriptionStatus)) {
    return { allowed: false, reason: "subscription_expired" };
  }
  if (!state.subscriptionActive) return { allowed: false, reason: "subscription_required" };
  return { allowed: true, reason: "allowed" };
}
