import "server-only";

import { staffScenarioIds, type StaffScenario, type StaffScenarioId } from "./types";

const scenarios: Record<StaffScenarioId, StaffScenario> = {
  guest: { scenarioId: "guest", label: "Guest", displayName: null, simulatedRoleLabel: "No staff role", accountStatusLabel: "Guest", authenticated: false, ageVerified: false, subscriptionActive: false, accountBlocked: false, roles: ["visitor"] },
  subscriber_only: { scenarioId: "subscriber_only", label: "Subscriber only", displayName: "Subscriber Preview", simulatedRoleLabel: "Subscriber (not staff)", accountStatusLabel: "Active mock account", authenticated: true, ageVerified: true, subscriptionActive: true, accountBlocked: false, roles: ["subscriber"] },
  moderator: { scenarioId: "moderator", label: "Moderator", displayName: "Morgan Moderator", simulatedRoleLabel: "Moderator", accountStatusLabel: "Active mock account", authenticated: true, ageVerified: false, subscriptionActive: false, accountBlocked: false, roles: ["moderator"] },
  content_manager: { scenarioId: "content_manager", label: "Content manager", displayName: "Casey Content", simulatedRoleLabel: "Content manager", accountStatusLabel: "Active mock account", authenticated: true, ageVerified: false, subscriptionActive: false, accountBlocked: false, roles: ["content_manager"] },
  admin: { scenarioId: "admin", label: "Admin", displayName: "Avery Admin", simulatedRoleLabel: "Administrator", accountStatusLabel: "Active mock account", authenticated: true, ageVerified: false, subscriptionActive: false, accountBlocked: false, roles: ["admin"] },
  blocked_moderator: { scenarioId: "blocked_moderator", label: "Blocked moderator", displayName: "Blocked Staff Preview", simulatedRoleLabel: "Moderator", accountStatusLabel: "Blocked mock account", authenticated: true, ageVerified: false, subscriptionActive: false, accountBlocked: true, roles: ["moderator"] },
  blocked_admin: { scenarioId: "blocked_admin", label: "Blocked admin", displayName: "Blocked Staff Preview", simulatedRoleLabel: "Administrator", accountStatusLabel: "Blocked mock account", authenticated: true, ageVerified: false, subscriptionActive: false, accountBlocked: true, roles: ["admin"] },
};

export function parseStaffScenario(value: string | string[] | undefined): StaffScenarioId {
  if (typeof value !== "string") return "guest";
  return staffScenarioIds.find((scenarioId) => scenarioId === value) ?? "guest";
}

export function getMockStaffScenario(value: string | string[] | undefined): StaffScenario {
  return scenarios[parseStaffScenario(value)];
}

export const staffScenarioOptions = staffScenarioIds.map((scenarioId) => ({ scenarioId, label: scenarios[scenarioId].label }));
