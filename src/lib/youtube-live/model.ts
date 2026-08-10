export type YouTubeChatMessage = {
  id: string;
  initials?: string;
  username: string;
  text: string;
  timestamp?: string;
  publishedAt: string | null;
  badges?: string[];
  mention?: boolean;
  category?: "all" | "members" | "mentions";
  tone?: "blue" | "violet" | "green" | "orange" | "red" | "cyan" | "amber" | "pink";
  deleteEligible: boolean;
  hideEligible: boolean;
  userHidden?: boolean;
  isReal?: boolean;
  deletionEvent?: boolean;
  deletionEventId?: string;
  deletedMessageId?: string | null;
  deletedAt?: string | null;
  deletionSource?: "hub" | "youtube";
  deletedBy?: YouTubeChatAuthor | null;
  authorDetails: YouTubeChatAuthor;
};

export type YouTubeChatAuthor = {
    channelId: string | null;
    displayName: string;
    profileImageUrl?: string | null;
    isChatOwner: boolean;
    isChatModerator: boolean;
    isChatSponsor?: boolean;
    isVerified?: boolean;
};

export type YouTubeDeletionEvent = {
  id?: string;
  deletionEventId?: string;
  deletedMessageId: string | null;
  deletionSource?: "hub" | "youtube";
  deletedAt?: string | null;
  publishedAt?: string | null;
  deletedBy?: YouTubeChatAuthor | null;
};

export type YouTubeChatEvent = YouTubeChatMessage | (YouTubeDeletionEvent & { deletionEvent: true });

export type YouTubeChatSnapshot = {
  videoId: string;
  liveChatId: string;
  title: string;
  messages: YouTubeChatEvent[];
  sharedDeletionEvents: YouTubeDeletionEvent[];
  pollingIntervalMillis: number;
  streamStatus: string;
  lifecycleState: string;
  scheduledRetryAt: string | null;
  reconnectAttempt: number;
  transport: "streamList";
  rateLimit: { kind: string; retryAfterMs: number; autoRetry: boolean } | null;
};

export type YouTubeModerationInput = {
  videoId: string;
  action: "delete" | "timeout" | "hide" | "send";
  messageId?: string;
  channelId?: string;
  durationSeconds?: number;
  text?: string;
};
