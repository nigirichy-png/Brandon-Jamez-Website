import "server-only";

import type { Role } from "@/types";
import type { StaffAccessDecision, StaffAccessReason, StaffScenario } from "./types";

function evaluate(state: StaffScenario, acceptedRoles: Role[], missingRoleReason: StaffAccessReason): StaffAccessDecision {
  if (!state.authenticated) return { allowed: false, reason: "not_authenticated" };
  if (state.accountBlocked) return { allowed: false, reason: "account_blocked" };
  if (!acceptedRoles.some((role) => state.roles.includes(role))) return { allowed: false, reason: missingRoleReason };
  return { allowed: true, reason: "allowed" };
}

export const evaluateModeratorAccess = (state: StaffScenario) => evaluate(state, ["moderator", "admin"], "moderator_role_required");
export const evaluateContentManagerAccess = (state: StaffScenario) => evaluate(state, ["content_manager", "admin"], "content_manager_role_required");
export const evaluateAdminAccess = (state: StaffScenario) => evaluate(state, ["admin"], "admin_role_required");
