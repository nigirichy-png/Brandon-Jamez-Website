export type LiveSession = {
  id: string;
  title: string;
  source: "youtube" | "direct";
  status: "offline" | "scheduled" | "live" | "ended";
  youtubeVideoId: string | null;
  directPlaybackProvider: string | null;
  directPlaybackReference: string | null;
  updatedAt: string;
};

export type LiveChatMessage = {
  id: number;
  sessionId: string;
  authorKey: string;
  authorDisplayName: string;
  body: string;
  status: "visible" | "deleted";
  createdAt: string;
  updatedAt: string;
};

