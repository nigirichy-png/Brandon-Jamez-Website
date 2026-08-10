import type { YouTubeChatAuthor, YouTubeChatEvent, YouTubeChatMessage, YouTubeDeletionEvent } from "@/lib/youtube-live/model";

export const MODERATOR_NOTE_STORAGE_KEY = "brandon-moderator-notes:v1";
export const MODERATOR_NOTE_MAX_LENGTH = 500;

export type HubAction = {
  id: string;
  action: "delete" | "timeout" | "hide" | "send" | "external-delete";
  target: string;
  targetChannelId?: string | null;
  messageId?: string | null;
  detail: string;
  durationSeconds?: number;
  occurredAt: string;
  moderator?: string | null;
};

export type DeletedChatMessage = {
  id: string;
  deleted: true;
  original: YouTubeChatMessage | null;
  event: YouTubeDeletionEvent;
};

export type DisplayedChatMessage = YouTubeChatMessage | DeletedChatMessage;

export type ModeratorNote = { text: string; createdAt: string; updatedAt: string };
export type ModeratorNotes = Record<string, ModeratorNote>;

export function isDeletionEvent(event: YouTubeChatEvent): event is YouTubeDeletionEvent & { deletionEvent: true } {
  return "deletionEvent" in event && event.deletionEvent === true;
}

export function isDeletedMessage(message: DisplayedChatMessage): message is DeletedChatMessage {
  return "deleted" in message && message.deleted === true;
}

export function extractYouTubeVideoId(value: string) {
  const input = value.trim();
  if (/^[A-Za-z0-9_-]{11}$/.test(input)) return input;
  try {
    const url = new URL(input);
    const host = url.hostname.replace(/^www\./, "");
    if (host === "youtu.be") return /^[A-Za-z0-9_-]{11}$/.test(url.pathname.slice(1)) ? url.pathname.slice(1) : null;
    if (!["youtube.com", "m.youtube.com", "music.youtube.com"].includes(host)) return null;
    const candidate = url.searchParams.get("v") || url.pathname.match(/^\/(?:live|embed|shorts)\/([A-Za-z0-9_-]{11})/)?.[1] || "";
    return /^[A-Za-z0-9_-]{11}$/.test(candidate) ? candidate : null;
  } catch { return null; }
}

export function reconcileChatEvents(events: YouTubeChatEvent[], sharedEvents: YouTubeDeletionEvent[], observed: Map<string, YouTubeChatMessage>) {
  const live = new Map<string, YouTubeChatMessage>();
  const deletions = new Map<string, YouTubeDeletionEvent>();
  for (const event of events) {
    if (isDeletionEvent(event)) { if (event.deletedMessageId) deletions.set(event.deletedMessageId, event); continue; }
    const message = event as YouTubeChatMessage;
    observed.set(message.id, message);
    live.set(message.id, message);
  }
  for (const event of sharedEvents) if (event.deletedMessageId) deletions.set(event.deletedMessageId, event);
  while (observed.size > 3000) { const oldest = observed.keys().next().value; if (!oldest) break; observed.delete(oldest); }
  const rows: DisplayedChatMessage[] = [...live.values()].filter((message) => !deletions.has(message.id));
  for (const [messageId, event] of deletions) rows.push({ id: messageId, deleted: true, original: observed.get(messageId) ?? null, event });
  return rows.sort((left, right) => publishedAt(left).localeCompare(publishedAt(right)));
}

export function publishedAt(message: DisplayedChatMessage) {
  return isDeletedMessage(message) ? message.original?.publishedAt || message.event.deletedAt || message.event.publishedAt || "" : message.publishedAt || "";
}

export function originalMessage(message: DisplayedChatMessage): YouTubeChatMessage | null { return isDeletedMessage(message) ? message.original : message; }

export function messageChannelId(message: DisplayedChatMessage) { return originalMessage(message)?.authorDetails.channelId ?? null; }

export function isProtectedMessage(message: YouTubeChatMessage) {
  return Boolean(message.authorDetails.isChatOwner || message.authorDetails.isChatModerator || message.badges?.some((badge) => badge === "Owner" || badge === "Moderator"));
}

export function createDeletionActions(rows: DisplayedChatMessage[]): HubAction[] {
  return rows.filter(isDeletedMessage).map((row) => ({
    id: `delete:${row.id}`,
    action: "external-delete",
    target: row.original?.authorDetails.displayName || row.original?.username || "Deleted message",
    targetChannelId: row.original?.authorDetails.channelId,
    messageId: row.id,
    detail: row.original?.text || "Original message unavailable",
    occurredAt: row.event.deletedAt || row.event.publishedAt || new Date().toISOString(),
    moderator: row.event.deletedBy?.displayName || (row.event.deletionSource === "hub" ? "Website moderator" : "YouTube moderator"),
  }));
}

export function deriveModeratorActivity(messages: DisplayedChatMessage[]) {
  const entries = new Map<string, { author: YouTubeChatAuthor; at: string; action: string }>();
  for (const row of messages) {
    const message = originalMessage(row);
    if (!message) continue;
    const author = message.authorDetails;
    if (!author.channelId || (!author.isChatOwner && !author.isChatModerator)) continue;
    const candidate = { author, at: message.publishedAt || new Date().toISOString(), action: isDeletedMessage(row) ? "deletion" : "message" };
    const current = entries.get(author.channelId);
    if (!current || candidate.at > current.at) entries.set(author.channelId, candidate);
  }
  return [...entries.values()].sort((left, right) => right.at.localeCompare(left.at));
}

export function loadModeratorNotes(): ModeratorNotes {
  try {
    const raw = localStorage.getItem(MODERATOR_NOTE_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as { version?: number; notes?: unknown };
    if (parsed.version !== 1 || !parsed.notes || typeof parsed.notes !== "object" || Array.isArray(parsed.notes)) return {};
    return Object.fromEntries(Object.entries(parsed.notes as ModeratorNotes).filter(([key, note]) => /^real:[A-Za-z0-9_-]{1,128}$/.test(key) && note && typeof note.text === "string" && note.text.length <= MODERATOR_NOTE_MAX_LENGTH));
  } catch { return {}; }
}

export function saveModeratorNote(notes: ModeratorNotes, channelId: string, value: string) {
  const text = value.replace(/\r\n?/g, "\n").trim();
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(channelId)) throw new Error("A stable YouTube channel identity is required.");
  if (text.length > MODERATOR_NOTE_MAX_LENGTH) throw new Error(`Moderator notes cannot exceed ${MODERATOR_NOTE_MAX_LENGTH} characters.`);
  const key = `real:${channelId}`;
  const next = { ...notes };
  if (!text) delete next[key];
  else {
    const now = new Date().toISOString();
    next[key] = { text, createdAt: notes[key]?.createdAt || now, updatedAt: now };
  }
  localStorage.setItem(MODERATOR_NOTE_STORAGE_KEY, JSON.stringify({ version: 1, notes: Object.fromEntries(Object.entries(next).sort(([, left], [, right]) => right.updatedAt.localeCompare(left.updatedAt)).slice(0, 500)) }));
  return next;
}

export function relativeTime(value: string, now = Date.now()) {
  const seconds = Math.max(0, Math.floor((now - Date.parse(value)) / 1000));
  if (seconds < 10) return "just now";
  if (seconds < 60) return `${seconds} sec ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  return `${Math.floor(minutes / 60)} hr ago`;
}
