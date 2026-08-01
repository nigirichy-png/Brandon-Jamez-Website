import type { AccessState, Role } from "@/types";

/**
 * Preliminary application logic for planning UI states only.
 * These helpers do not protect routes or data. Production access must rely on
 * validated server-side sessions, server-side authorization, and database RLS.
 */
const hasRole = (state: AccessState, roles: Role[]) =>
  roles.some((role) => state.roles.includes(role));

export const canAccessSubscriberArea = (state: AccessState) =>
  state.authenticated &&
  state.ageVerified &&
  state.subscriptionActive &&
  !state.accountBlocked;

export const canAccessModeratorArea = (state: AccessState) =>
  state.authenticated &&
  !state.accountBlocked &&
  hasRole(state, ["moderator", "admin"]);

export const canManageContent = (state: AccessState) =>
  state.authenticated &&
  !state.accountBlocked &&
  hasRole(state, ["content_manager", "admin"]);

export const canAccessAdminArea = (state: AccessState) =>
  state.authenticated && !state.accountBlocked && hasRole(state, ["admin"]);
