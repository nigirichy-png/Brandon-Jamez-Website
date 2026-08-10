import type { AccessState, Role, VideoAccessLevel } from "@/types";

export const staffScenarioIds = [
  "guest",
  "subscriber_only",
  "moderator",
  "content_manager",
  "admin",
  "blocked_moderator",
  "blocked_admin",
] as const;

export type StaffScenarioId = (typeof staffScenarioIds)[number];
export type StaffArea = "moderator" | "content" | "admin";
export type StaffAccessState = AccessState & {
  scenarioId: StaffScenarioId | null;
  label: string;
  displayName: string | null;
  simulatedRoleLabel: string;
  accountStatusLabel: "Guest" | "Active mock account" | "Blocked mock account" | "Active account" | "Account unavailable";
  developmentPreview: boolean;
  accessLoadFailed?: boolean;
};

export type StaffScenario = StaffAccessState & {
  scenarioId: StaffScenarioId;
  developmentPreview: true;
};

export type StaffAccessReason =
  | "not_authenticated"
  | "account_blocked"
  | "moderator_role_required"
  | "content_viewer_role_required"
  | "content_manager_role_required"
  | "admin_role_required"
  | "allowed";

export type StaffAccessDecision = { allowed: boolean; reason: StaffAccessReason };

export type ModerationReviewItem = {
  id: string;
  title: string;
  sourceType: string;
  submittedAt: string;
  submittedByLabel: string;
  category: string;
  severity: "low" | "medium" | "high";
  status: "pending" | "in_review" | "escalated" | "reviewed";
  summary: string;
  evidenceReference: string;
  assignedToLabel: string;
};

export type ContentPublicationStatus = "draft" | "scheduled" | "published" | "archived";
export type ContentManagementRecord = {
  id: string;
  title: string;
  contentType: "video";
  accessLevel: VideoAccessLevel;
  publicationStatus: ContentPublicationStatus;
  category: string;
  publishedDate: string;
  featured: boolean;
  duration: string;
  mockAssetState: string;
};

export type EventManagementRecord = {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  publicationStatus: ContentPublicationStatus;
  eventStatus: string;
  featured: boolean;
};

export type AdminUserSummary = {
  id: string;
  displayName: string;
  accountStatus: "active" | "blocked";
  roles: Role[];
  ageVerificationStatus: "not_started" | "verified";
  subscriptionStatus: "none" | "active" | "expired";
  createdAt: string;
  lastActivityLabel: string;
};

export type AuditEvent = {
  id: string;
  timestamp: string;
  actorLabel: string;
  actorRole: Exclude<Role, "visitor" | "subscriber">;
  action: string;
  targetType: string;
  targetLabel: string;
  result: "previewed" | "reviewed" | "escalated";
  metadataSummary: string;
};

export type IntegrationStatus = {
  id: string;
  label: string;
  status: "Not configured";
  detail: string;
};
