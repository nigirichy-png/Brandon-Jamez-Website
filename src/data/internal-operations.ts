import "server-only";

import { publicVideos, subscriberVideos, upcomingEvents } from "@/data/mock-data";
import type { AdminUserSummary, AuditEvent, ContentManagementRecord, EventManagementRecord, IntegrationStatus, ModerationReviewItem } from "@/lib/staff/types";

export const moderationReviewItems: ModerationReviewItem[] = [
  { id: "review-mock-101", title: "Event listing context check", sourceType: "Internal submission", submittedAt: "August 1, 2026 · 09:20", submittedByLabel: "Community desk preview", category: "Context", severity: "medium", status: "pending", summary: "Review whether a development event card makes its unconfirmed venue clear enough.", evidenceReference: "Mock reference MR-101", assignedToLabel: "Unassigned" },
  { id: "review-mock-102", title: "Thumbnail labeling review", sourceType: "Editorial handoff", submittedAt: "August 1, 2026 · 08:10", submittedByLabel: "Content desk preview", category: "Labeling", severity: "low", status: "in_review", summary: "Confirm that subscriber artwork is consistently labeled as a development preview.", evidenceReference: "Mock reference MR-102", assignedToLabel: "Moderator preview" },
  { id: "review-mock-103", title: "Publication boundary escalation", sourceType: "Internal quality check", submittedAt: "July 31, 2026 · 17:45", submittedByLabel: "Quality desk preview", category: "Publication", severity: "high", status: "escalated", summary: "A draft concept needs administrative review before it can appear in a future publication workflow.", evidenceReference: "Mock reference MR-103", assignedToLabel: "Admin preview" },
  { id: "review-mock-104", title: "Duplicate submission note", sourceType: "Internal submission", submittedAt: "July 31, 2026 · 14:05", submittedByLabel: "Community desk preview", category: "Duplicate", severity: "low", status: "reviewed", summary: "Two fictional submissions describe the same internal content record.", evidenceReference: "Mock reference MR-104", assignedToLabel: "Moderator preview" },
];

const publicationById: Record<string, ContentManagementRecord["publicationStatus"]> = {
  "public-001": "published", "public-002": "published", "public-003": "scheduled", "public-004": "draft",
  "neon-city-after-hours": "published", "weekend-extended-cut": "scheduled", "pattaya-midnight-notes": "draft", "studio-session-one": "archived",
};

export const videoContentRecords: ContentManagementRecord[] = [
  ...publicVideos.map((video, index) => ({ id: video.id, title: video.title, contentType: "video" as const, accessLevel: video.accessLevel, publicationStatus: publicationById[video.id], category: video.category, publishedDate: video.publishedAt, featured: index === 0, duration: video.duration, mockAssetState: "Abstract public preview only" })),
  ...subscriberVideos.map((video) => ({ id: video.id, title: video.title, contentType: "video" as const, accessLevel: video.accessLevel, publicationStatus: publicationById[video.id], category: video.category, publishedDate: video.publishedAt, featured: video.featured, duration: video.duration, mockAssetState: "Subscriber metadata only" })),
];

export const eventManagementRecords: EventManagementRecord[] = upcomingEvents.map((event, index) => ({ id: event.id, title: event.title, date: event.date, time: event.time, location: event.location, publicationStatus: index === 0 ? "published" : index === 1 ? "draft" : "scheduled", eventStatus: event.status, featured: index === 0 }));

export const adminUserSummaries: AdminUserSummary[] = [
  { id: "mock-user-001", displayName: "Avery Admin Preview", accountStatus: "active", roles: ["admin"], ageVerificationStatus: "not_started", subscriptionStatus: "none", createdAt: "June 2, 2026", lastActivityLabel: "Configuration review preview" },
  { id: "mock-user-002", displayName: "Morgan Moderator Preview", accountStatus: "active", roles: ["moderator"], ageVerificationStatus: "not_started", subscriptionStatus: "none", createdAt: "June 12, 2026", lastActivityLabel: "Review queue preview" },
  { id: "mock-user-003", displayName: "Casey Content Preview", accountStatus: "active", roles: ["content_manager"], ageVerificationStatus: "not_started", subscriptionStatus: "none", createdAt: "June 18, 2026", lastActivityLabel: "Metadata review preview" },
  { id: "mock-user-004", displayName: "Taylor Subscriber Preview", accountStatus: "active", roles: ["subscriber"], ageVerificationStatus: "verified", subscriptionStatus: "active", createdAt: "July 1, 2026", lastActivityLabel: "Member-library preview" },
  { id: "mock-user-005", displayName: "Jordan Restricted Preview", accountStatus: "blocked", roles: ["subscriber"], ageVerificationStatus: "verified", subscriptionStatus: "expired", createdAt: "July 6, 2026", lastActivityLabel: "Account review preview" },
];

export const auditEvents: AuditEvent[] = [
  { id: "audit-mock-001", timestamp: "August 1, 2026 · 10:05", actorLabel: "Avery Admin Preview", actorRole: "admin", action: "Configuration review previewed", targetType: "System configuration", targetLabel: "Integration readiness", result: "reviewed", metadataSummary: "Safe status labels only; no environment values." },
  { id: "audit-mock-002", timestamp: "August 1, 2026 · 09:42", actorLabel: "Casey Content Preview", actorRole: "content_manager", action: "Publication previewed", targetType: "Content record", targetLabel: "Neon Nights: City Walk", result: "previewed", metadataSummary: "Non-persistent publication workflow demonstration." },
  { id: "audit-mock-003", timestamp: "July 31, 2026 · 17:48", actorLabel: "Morgan Moderator Preview", actorRole: "moderator", action: "Escalation previewed", targetType: "Moderation review", targetLabel: "Publication boundary escalation", result: "escalated", metadataSummary: "Internal fictional record only; no external platform action." },
  { id: "audit-mock-004", timestamp: "July 31, 2026 · 15:30", actorLabel: "Avery Admin Preview", actorRole: "admin", action: "Role assignment previewed", targetType: "Mock user", targetLabel: "Casey Content Preview", result: "previewed", metadataSummary: "Browser-visible demonstration; no role mutation occurred." },
];

export const integrationStatuses: IntegrationStatus[] = [
  { id: "supabase", label: "Supabase", status: "Not configured", detail: "No project or database request" },
  { id: "payments", label: "Payments", status: "Not configured", detail: "No checkout or webhook connection" },
  { id: "age", label: "Age verification", status: "Not configured", detail: "No provider session or identity collection" },
  { id: "video", label: "Video provider", status: "Not configured", detail: "No upload or playback integration" },
];
