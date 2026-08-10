export function isPublicModerationHubPreviewEnabled() {
  return process.env.NODE_ENV === "development" || process.env.MODERATION_HUB_PUBLIC_PREVIEW_ENABLED === "true";
}
