import { isPublicModerationHubPreviewEnabled } from "@/lib/live/moderation-hub-preview";

import { HeaderNavigation } from "./header-navigation";

export function Header() {
  return <HeaderNavigation moderationHubPreview={isPublicModerationHubPreviewEnabled()} />;
}
