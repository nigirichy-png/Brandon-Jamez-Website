import "server-only";

import { mockScenarioIds, type MockAccessScenario, type MockScenarioId } from "./types";

const scenarios: Record<MockScenarioId, MockAccessScenario> = {
  guest: {
    scenarioId: "guest",
    label: "Guest",
    displayName: null,
    authenticated: false,
    ageVerified: false,
    subscriptionActive: false,
    accountBlocked: false,
    roles: ["visitor"],
    verificationStatus: "not_started",
    subscriptionStatus: "none",
    subscriptionSummary: "No subscription",
    developmentPreview: true,
  },
  signed_in_unverified: {
    scenarioId: "signed_in_unverified",
    label: "Signed in, unverified",
    displayName: "Demo Member",
    authenticated: true,
    ageVerified: false,
    subscriptionActive: false,
    accountBlocked: false,
    roles: ["visitor"],
    verificationStatus: "not_started",
    subscriptionStatus: "none",
    subscriptionSummary: "Waiting for age verification",
    developmentPreview: true,
  },
  age_verified_no_subscription: {
    scenarioId: "age_verified_no_subscription",
    label: "Verified, no subscription",
    displayName: "Demo Member",
    authenticated: true,
    ageVerified: true,
    subscriptionActive: false,
    accountBlocked: false,
    roles: ["visitor"],
    verificationStatus: "verified",
    subscriptionStatus: "none",
    subscriptionSummary: "No active subscription",
    developmentPreview: true,
  },
  active_subscriber: {
    scenarioId: "active_subscriber",
    label: "Active subscriber",
    displayName: "Demo Member",
    authenticated: true,
    ageVerified: true,
    subscriptionActive: true,
    accountBlocked: false,
    roles: ["subscriber"],
    verificationStatus: "verified",
    subscriptionStatus: "active",
    subscriptionSummary: "Active through September 30, 2026 (mock)",
    developmentPreview: true,
  },
  blocked_subscriber: {
    scenarioId: "blocked_subscriber",
    label: "Blocked subscriber",
    displayName: "Demo Member",
    authenticated: true,
    ageVerified: true,
    subscriptionActive: true,
    accountBlocked: true,
    roles: ["subscriber"],
    verificationStatus: "verified",
    subscriptionStatus: "active",
    subscriptionSummary: "Active, access paused by account status",
    developmentPreview: true,
  },
  expired_subscriber: {
    scenarioId: "expired_subscriber",
    label: "Expired subscriber",
    displayName: "Demo Member",
    authenticated: true,
    ageVerified: true,
    subscriptionActive: false,
    accountBlocked: false,
    roles: ["subscriber"],
    verificationStatus: "verified",
    subscriptionStatus: "expired",
    subscriptionSummary: "Expired July 15, 2026 (mock)",
    developmentPreview: true,
  },
};

export function parseMockScenario(value: string | string[] | undefined): MockScenarioId {
  if (typeof value !== "string") return "guest";
  return mockScenarioIds.find((scenarioId) => scenarioId === value) ?? "guest";
}

export function isMockScenario(value: string | string[] | undefined): value is MockScenarioId {
  return typeof value === "string" && mockScenarioIds.some((scenarioId) => scenarioId === value);
}

export function getMockScenario(value: string | string[] | undefined): MockAccessScenario {
  return scenarios[parseMockScenario(value)];
}

export const mockScenarioOptions = mockScenarioIds.map((scenarioId) => ({
  scenarioId,
  label: scenarios[scenarioId].label,
}));
