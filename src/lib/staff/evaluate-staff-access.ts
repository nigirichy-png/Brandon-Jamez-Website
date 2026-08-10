import "server-only";

import type { Role } from "@/types";
import type { StaffAccessDecision, StaffAccessReason, StaffAccessState } from "./types";

function evaluate(state: StaffAccessState, acceptedRoles: Role[], missingRoleReason: StaffAccessReason): StaffAccessDecision {
  if (!state.authenticated) return { allowed: false, reason: "not_authenticated" };
  if (state.accountBlocked) return { allowed: false, reason: "account_blocked" };
  if (!acceptedRoles.some((role) => state.roles.includes(role))) return { allowed: false, reason: missingRoleReason };
  return { allowed: true, reason: "allowed" };
}

export const evaluateModeratorAccess = (state: StaffAccessState) => evaluate(state, ["moderator", "admin"], "moderator_role_required");
export const evaluateContentViewerAccess = (state: StaffAccessState) => evaluate(state, ["moderator", "content_manager", "admin"], "content_viewer_role_required");
export const evaluateContentManagerAccess = (state: StaffAccessState) => evaluate(state, ["content_manager", "admin"], "content_manager_role_required");
export const evaluateAdminAccess = (state: StaffAccessState) => evaluate(state, ["admin"], "admin_role_required");
