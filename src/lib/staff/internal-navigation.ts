import "server-only";

import type { StaffAccessState } from "./types";

type InternalNavItem = { href: string; label: string; group: string };

const moderatorItems: InternalNavItem[] = [
  { href: "/mod", label: "Moderation overview", group: "Moderation" },
  { href: "/mod/review", label: "Review queue", group: "Moderation" },
];
const contentItems: InternalNavItem[] = [
  { href: "/content", label: "Content overview", group: "Content" },
  { href: "/content/videos", label: "Video records", group: "Content" },
  { href: "/content/events", label: "Event records", group: "Content" },
];
const adminItems: InternalNavItem[] = [
  { href: "/admin", label: "Control center", group: "Administration" },
  { href: "/admin/users", label: "User summaries", group: "Administration" },
  { href: "/admin/content", label: "Content oversight", group: "Administration" },
  { href: "/admin/audit", label: "Audit preview", group: "Administration" },
];

export function getInternalNavigation(state: StaffAccessState): InternalNavItem[] {
  if (!state.authenticated || state.accountBlocked) return [];
  if (state.roles.includes("admin")) return [...moderatorItems, ...contentItems, ...adminItems];
  if (state.roles.includes("moderator")) return moderatorItems;
  if (state.roles.includes("content_manager")) return contentItems;
  return [];
}

export function withStaffScenario(href: string, scenarioId: StaffAccessState["scenarioId"]) {
  return scenarioId ? `${href}?staffDemo=${scenarioId}` : href;
}
