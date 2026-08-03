import assert from "node:assert/strict";
import test from "node:test";

import { evaluateMemberAccessPolicy } from "../src/lib/entitlements/member-access-policy.ts";
import type { MemberAccessState, SubscriptionStatus } from "../src/lib/entitlements/types.ts";

function accountState(overrides: Partial<MemberAccessState> = {}): MemberAccessState {
  return {
    scenarioId: null,
    label: "Test account",
    displayName: "Test Subscriber",
    authenticated: true,
    ageVerified: false,
    subscriptionActive: true,
    accountBlocked: false,
    roles: ["subscriber"],
    verificationStatus: "not_started",
    subscriptionStatus: "active",
    subscriptionSummary: "Active paid subscription",
    developmentPreview: false,
    ...overrides,
  };
}

test("anonymous users are denied", () => {
  const decision = evaluateMemberAccessPolicy(accountState({ authenticated: false, subscriptionActive: false }));

  assert.deepEqual(decision, { allowed: false, reason: "not_authenticated" });
});

test("active subscribers are allowed", () => {
  const decision = evaluateMemberAccessPolicy(accountState());

  assert.deepEqual(decision, { allowed: true, reason: "allowed" });
});

test("subscribers canceled at period end retain access while still entitled", () => {
  const canceledAtPeriodEndState = {
    ...accountState({ subscriptionSummary: "Active until the current paid period ends" }),
    cancelAtPeriodEnd: true,
  };
  const decision = evaluateMemberAccessPolicy(canceledAtPeriodEndState);

  assert.deepEqual(decision, { allowed: true, reason: "allowed" });
});

test("ended and inactive subscribers are denied", async (context) => {
  const cases: Array<{ status: SubscriptionStatus; reason: "subscription_expired" | "subscription_required" }> = [
    { status: "canceled", reason: "subscription_expired" },
    { status: "expired", reason: "subscription_expired" },
    { status: "inactive", reason: "subscription_required" },
  ];

  for (const item of cases) {
    await context.test(item.status, () => {
      const decision = evaluateMemberAccessPolicy(accountState({ subscriptionActive: false, subscriptionStatus: item.status }));
      assert.deepEqual(decision, { allowed: false, reason: item.reason });
    });
  }
});

test("blocked subscribers are denied even with an active entitlement", () => {
  const decision = evaluateMemberAccessPolicy(accountState({ accountBlocked: true }));

  assert.deepEqual(decision, { allowed: false, reason: "account_blocked" });
});
