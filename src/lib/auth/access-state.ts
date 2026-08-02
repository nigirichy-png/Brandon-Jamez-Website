import "server-only";

import type { User } from "@supabase/supabase-js";

import type { MemberAccessState, SubscriptionStatus, VerificationStatus } from "@/lib/entitlements/types";
import { isMockScenario, getMockScenario } from "@/lib/entitlements/mock-scenarios";
import type { StaffAccessState } from "@/lib/staff/types";
import { getMockStaffScenario, isStaffScenario } from "@/lib/staff/mock-staff-scenarios";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Role } from "@/types";

const trustedRoles = new Set<Role>(["subscriber", "moderator", "content_manager", "admin"]);

export type RealAccountState = {
  user: User | null;
  displayName: string | null;
  createdAt: string | null;
  roles: Role[];
  accountBlocked: boolean;
  ageVerified: boolean;
  verificationStatus: VerificationStatus;
  subscriptionActive: boolean;
  subscriptionStatus: SubscriptionStatus;
  subscriptionPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  accessLoadFailed: boolean;
};

export async function loadRealAccountState(): Promise<RealAccountState> {
  if (!isSupabaseConfigured()) return { user: null, displayName: null, createdAt: null, roles: [], accountBlocked: false, ageVerified: false, verificationStatus: "not_started", subscriptionActive: false, subscriptionStatus: "none", subscriptionPeriodEnd: null, cancelAtPeriodEnd: false, accessLoadFailed: false };

  const supabase = await createServerSupabaseClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  const user = userError ? null : userData.user;
  if (!user) return { user: null, displayName: null, createdAt: null, roles: [], accountBlocked: false, ageVerified: false, verificationStatus: "not_started", subscriptionActive: false, subscriptionStatus: "none", subscriptionPeriodEnd: null, cancelAtPeriodEnd: false, accessLoadFailed: false };

  const [profile, roleRows, restriction, verification, subscription, paidEntitlement] = await Promise.all([
    supabase.from("profiles").select("display_name, created_at").eq("id", user.id).limit(1),
    supabase.from("user_roles").select("role").eq("user_id", user.id),
    supabase.from("account_restrictions").select("blocked").eq("user_id", user.id).limit(1),
    supabase.from("age_verifications").select("age_verified, status").eq("user_id", user.id).limit(1),
    supabase.from("subscriptions").select("status, current_period_end, cancel_at_period_end").eq("user_id", user.id).limit(1),
    supabase.rpc("has_active_paid_subscription"),
  ]);

  const profileRow = profile.data?.[0] ?? null;
  const restrictionRow = restriction.data?.[0] ?? null;
  const verificationRow = verification.data?.[0] ?? null;
  const subscriptionRow = subscription.data?.[0] ?? null;
  const queryFailed = Boolean(profile.error || roleRows.error || restriction.error || verification.error || subscription.error || paidEntitlement.error);
  const accessLoadFailed = queryFailed || !profileRow;
  const roles = accessLoadFailed ? [] : (roleRows.data ?? []).map((row) => row.role as Role).filter((role) => trustedRoles.has(role));
  const rawSubscriptionStatus = subscriptionRow?.status;
  const subscriptionStatus: SubscriptionStatus = rawSubscriptionStatus ?? "none";

  return {
    user,
    displayName: profileRow?.display_name ?? null,
    createdAt: profileRow?.created_at ?? user.created_at,
    roles,
    accountBlocked: accessLoadFailed || Boolean(restrictionRow?.blocked),
    ageVerified: !accessLoadFailed && Boolean(verificationRow?.age_verified && verificationRow.status === "verified"),
    verificationStatus: !accessLoadFailed && verificationRow?.status === "verified" ? "verified" : "not_started",
    subscriptionActive: !accessLoadFailed && paidEntitlement.data === true,
    subscriptionStatus: accessLoadFailed ? "none" : subscriptionStatus,
    subscriptionPeriodEnd: accessLoadFailed ? null : subscriptionRow?.current_period_end ?? null,
    cancelAtPeriodEnd: !accessLoadFailed && Boolean(subscriptionRow?.cancel_at_period_end),
    accessLoadFailed,
  };
}

export async function resolveMemberAccessState(value: string | string[] | undefined): Promise<MemberAccessState> {
  if (process.env.NODE_ENV === "development" && isMockScenario(value)) return getMockScenario(value);
  const real = await loadRealAccountState();
  return {
    scenarioId: null,
    label: "Real account",
    displayName: real.displayName,
    authenticated: Boolean(real.user),
    ageVerified: real.ageVerified,
    subscriptionActive: real.subscriptionActive,
    accountBlocked: real.accountBlocked,
    roles: real.roles,
    verificationStatus: real.verificationStatus,
    subscriptionStatus: real.subscriptionStatus,
    subscriptionSummary: real.subscriptionActive
      ? real.cancelAtPeriodEnd ? "Active until the current paid period ends" : "Active paid subscription"
      : ["canceled", "expired", "incomplete_expired"].includes(real.subscriptionStatus) ? "Subscription ended" : "No active paid subscription",
    developmentPreview: false,
    accessLoadFailed: real.accessLoadFailed,
  };
}

export async function resolveStaffAccessState(value: string | string[] | undefined): Promise<StaffAccessState> {
  if (process.env.NODE_ENV === "development" && isStaffScenario(value)) return getMockStaffScenario(value);
  const real = await loadRealAccountState();
  const staffRole = real.roles.includes("admin") ? "Administrator" : real.roles.includes("content_manager") ? "Content manager" : real.roles.includes("moderator") ? "Moderator" : real.roles.includes("subscriber") ? "Subscriber (not staff)" : "No staff role";
  return {
    scenarioId: null,
    label: "Real account",
    displayName: real.displayName ?? (real.user ? "Authenticated account" : null),
    simulatedRoleLabel: staffRole,
    accountStatusLabel: !real.user ? "Guest" : real.accountBlocked ? "Account unavailable" : "Active account",
    authenticated: Boolean(real.user),
    ageVerified: real.ageVerified,
    subscriptionActive: real.subscriptionActive,
    accountBlocked: real.accountBlocked,
    roles: real.roles,
    developmentPreview: false,
    accessLoadFailed: real.accessLoadFailed,
  };
}
