"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import type { YouTubeChatMessage, YouTubeChatSnapshot } from "@/lib/youtube-live/model";
import { createYouTubePlayerSession, loadYouTubeIframeApi, type LivePlayerDrift, type LivePlayerSession } from "@/lib/youtube-live/vendor/youtubeLivePlayer.js";
import { ModerationConfirmation, ModeratorActivity, type PendingModeration, UserDetailsPanel } from "./youtube-hub-overlays";
import { createDeletionActions, extractYouTubeVideoId, isProtectedMessage, originalMessage, reconcileChatEvents, type DisplayedChatMessage, type HubAction, type ModeratorNotes } from "./youtube-hub-utils";
import styles from "./youtube-moderation-panel.module.css";

type Filter = "all" | "mentions" | "members" | "moderators";
type Panel = "chat" | "actions";
type ModerationAction = "delete" | "timeout" | "hide" | "send";

const filters: { id: Filter; label: string }[] = [{ id: "all", label: "All" }, { id: "mentions", label: "Mentions" }, { id: "members", label: "Members" }, { id: "moderators", label: "Moderators" }];
const timeoutOptions = [[10, "10 sec"], [30, "30 sec"], [60, "1 min"], [300, "5 min"], [600, "10 min"], [1800, "30 min"]] as const;

function connectionLabel(snapshot: YouTubeChatSnapshot | null, loading: boolean) {
  if (loading && !snapshot) return "Connecting";
  if (!snapshot) return "Not connected";
  if (snapshot.rateLimit) return snapshot.rateLimit.kind === "quota" ? "Quota paused" : "Rate limited";
  if (snapshot.lifecycleState === "reconnecting" || snapshot.reconnectAttempt > 0) return `Reconnecting · attempt ${snapshot.reconnectAttempt}`;
  if (snapshot.streamStatus === "connected") return "Live chat connected";
  if (snapshot.streamStatus === "connecting") return "Connecting";
  return snapshot.streamStatus || "Unavailable";
}

function formatMessageTime(message: YouTubeChatMessage) {
  if (message.timestamp) return message.timestamp;
  return message.publishedAt ? new Intl.DateTimeFormat("en", { hour: "2-digit", minute: "2-digit" }).format(new Date(message.publishedAt)) : "";
}

function matchesFilter(row: DisplayedChatMessage, filter: Filter) {
  const message = originalMessage(row);
  if (!message || filter === "all") return true;
  if (filter === "mentions") return Boolean(message.mention || message.category === "mentions");
  if (filter === "members") return Boolean(message.authorDetails.isChatSponsor || message.badges?.includes("Member") || message.category === "members");
  return Boolean(message.authorDetails.isChatOwner || message.authorDetails.isChatModerator || message.badges?.some((badge: string) => badge === "Owner" || badge === "Moderator"));
}

function actionLabel(action: HubAction["action"]) {
  return ({ delete: "Message deleted", "external-delete": "Message deleted", timeout: "User timed out", hide: "User permanently banned", send: "Chat message sent" })[action];
}

function getYouTubeEmbedUrl(videoId: string, origin: string) {
  const parameters = new URLSearchParams({ autoplay: "0", rel: "0", playsinline: "1", enablejsapi: "1" });
  parameters.set("origin", origin);
  return `https://www.youtube-nocookie.com/embed/${videoId}?${parameters}`;
}

function subscribeToBrowserOrigin() { return () => undefined; }
function getBrowserOrigin() { return window.location.origin; }
function getServerOrigin() { return ""; }

export function YouTubeModerationPanel({ videoId, canModerate, canSend, canSelectStream = false, streamTitle, sessionStatus, publicPreview = false, endpoint = "/api/mod/live/youtube", fullScreen = false, releaseClient = true }: { videoId: string | null; canModerate: boolean; canSend: boolean; canSelectStream?: boolean; streamTitle: string | null; sessionStatus: string; publicPreview?: boolean; endpoint?: string; fullScreen?: boolean; releaseClient?: boolean }) {
  const [activeVideoId, setActiveVideoId] = useState(videoId);
  const [streamInput, setStreamInput] = useState(videoId || "");
  const [streamError, setStreamError] = useState("");
  const [messages, setMessages] = useState<DisplayedChatMessage[]>([]);
  const [snapshot, setSnapshot] = useState<YouTubeChatSnapshot | null>(null);
  const [notice, setNotice] = useState("");
  const [composer, setComposer] = useState("");
  const [timeoutDuration, setTimeoutDuration] = useState(300);
  const [activePanel, setActivePanel] = useState<Panel>("chat");
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [paused, setPaused] = useState(false);
  const [loading, setLoading] = useState(Boolean(activeVideoId));
  const [pendingAction, setPendingAction] = useState("");
  const [recentActions, setRecentActions] = useState<HubAction[]>([]);
  const [confirmation, setConfirmation] = useState<PendingModeration | null>(null);
  const [selectedUser, setSelectedUser] = useState<YouTubeChatMessage | null>(null);
  const [notes, setNotes] = useState<ModeratorNotes>({});
  const playerOrigin = useSyncExternalStore(subscribeToBrowserOrigin, getBrowserOrigin, getServerOrigin);
  const [playerReady, setPlayerReady] = useState(false);
  const [drift, setDrift] = useState<LivePlayerDrift | null>(null);
  const [showJump, setShowJump] = useState(false);
  const [mobileView, setMobileView] = useState<"stream" | "moderate">("stream");
  const liveChatId = useRef<string | null>(null);
  const pausedRef = useRef(false);
  const followLatestRef = useRef(true);
  const observedMessages = useRef(new Map<string, YouTubeChatMessage>());
  const bufferedMessages = useRef<DisplayedChatMessage[]>([]);
  const messageListRef = useRef<HTMLDivElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const playerSessionRef = useRef<LivePlayerSession | null>(null);
  const composerRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => { pausedRef.current = paused; }, [paused]);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!activeVideoId || !playerOrigin || !iframe) return;
    let disposed = false;
    setPlayerReady(false); setDrift(null);
    void loadYouTubeIframeApi().then((YT) => {
      if (disposed || iframeRef.current !== iframe) return;
      playerSessionRef.current = createYouTubePlayerSession({ YT, iframe, onReadyChange: (ready) => !disposed && setPlayerReady(ready), onDriftChange: (next) => !disposed && setDrift(next), controllerOptions: { development: process.env.NODE_ENV === "development" } });
    }).catch(() => { if (!disposed) setStreamError("The YouTube player API could not be loaded."); });
    return () => { disposed = true; playerSessionRef.current?.destroy(); playerSessionRef.current = null; };
  }, [activeVideoId, playerOrigin]);

  const load = useCallback(async (manualRetry = false) => {
    if (!activeVideoId) { setLoading(false); return 10_000; }
    setLoading(true);
    const queryParameters = new URLSearchParams({ videoId: activeVideoId, ...(manualRetry ? { manualRetry: "true" } : {}) });
    try {
      const response = await fetch(`${endpoint}?${queryParameters}`, { cache: "no-store" });
      const page = await response.json() as YouTubeChatSnapshot & { error?: string };
      if (!response.ok) { setNotice(page.error === "youtube_moderation_not_configured" ? "Server-side Google credentials or the YouTube moderation token are not configured." : "YouTube live chat is currently unavailable."); return 15_000; }
      liveChatId.current = page.liveChatId; setSnapshot(page);
      const reconciled = reconcileChatEvents(page.messages, page.sharedDeletionEvents, observedMessages.current).slice(-300);
      bufferedMessages.current = reconciled;
      if (!pausedRef.current) setMessages(reconciled);
      setNotice("");
      return page.pollingIntervalMillis;
    } catch { setNotice("The YouTube moderation service could not be reached."); return 15_000; }
    finally { setLoading(false); }
  }, [activeVideoId, endpoint]);

  useEffect(() => {
    let cancelled = false; let timer: ReturnType<typeof setTimeout>;
    async function poll() { const delay = await load(); if (!cancelled) timer = setTimeout(poll, delay); }
    void poll();
    return () => { cancelled = true; clearTimeout(timer); if (releaseClient && liveChatId.current) void fetch(`${endpoint}?${new URLSearchParams({ liveChatId: liveChatId.current })}`, { method: "DELETE", keepalive: true }); };
  }, [endpoint, load, releaseClient]);

  const allActions = useMemo(() => {
    const byId = new Map<string, HubAction>();
    [...createDeletionActions(messages), ...recentActions].forEach((action) => byId.set(action.id, action));
    return [...byId.values()].sort((left, right) => right.occurredAt.localeCompare(left.occurredAt));
  }, [messages, recentActions]);

  const visibleMessages = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return messages.filter((row) => {
      const message = originalMessage(row);
      const searchable = message ? `${message.username} ${message.text}` : "deleted message original unavailable";
      return matchesFilter(row, filter) && (!normalizedQuery || searchable.toLocaleLowerCase().includes(normalizedQuery));
    });
  }, [filter, messages, query]);

  useEffect(() => {
    if (!paused && activePanel === "chat" && !query && followLatestRef.current) requestAnimationFrame(() => messageListRef.current?.scrollTo({ top: messageListRef.current.scrollHeight }));
    else if (!paused && !followLatestRef.current) setShowJump(true);
  }, [activePanel, messages.length, paused, query]);

  function handleMessageScroll() {
    const list = messageListRef.current; if (!list) return;
    const nearBottom = list.scrollHeight - list.scrollTop - list.clientHeight < 80;
    followLatestRef.current = nearBottom; setShowJump(!nearBottom);
  }
  function jumpToLatest() { followLatestRef.current = true; setShowJump(false); messageListRef.current?.scrollTo({ top: messageListRef.current.scrollHeight, behavior: "smooth" }); }
  function togglePause() { const next = !paused; pausedRef.current = next; setPaused(next); if (!next) { setMessages(bufferedMessages.current); void load(); } }

  function configureStream(event: React.FormEvent) {
    event.preventDefault();
    const nextVideoId = extractYouTubeVideoId(streamInput);
    if (!nextVideoId) { setStreamError("Enter a valid YouTube watch, live, youtu.be URL, or 11-character video ID."); return; }
    setStreamError(""); setActiveVideoId(nextVideoId); setSnapshot(null); setMessages([]); setRecentActions([]); observedMessages.current.clear(); bufferedMessages.current = []; setStreamInput(nextVideoId);
  }

  function requestAction(request: PendingModeration) { if (request.action === "delete") void act(request.action, request.message, request.durationSeconds); else setConfirmation(request); }

  async function act(action: ModerationAction, message?: YouTubeChatMessage, durationSeconds = timeoutDuration) {
    if (!activeVideoId) return;
    const target = message?.authorDetails.displayName || message?.username || "Brandon";
    const actionKey = `${action}:${message?.id ?? "composer"}`; setPendingAction(actionKey); setNotice("");
    try {
      const response = await fetch(endpoint, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ videoId: activeVideoId, action, messageId: message?.id, channelId: message?.authorDetails.channelId, durationSeconds: action === "timeout" ? durationSeconds : undefined, text: action === "send" ? composer : undefined }) });
      if (!response.ok) { setNotice("YouTube rejected the moderation action."); return; }
      if (action === "delete" && message) {
        const deletion: DisplayedChatMessage = { id: message.id, deleted: true, original: message, event: { deletedMessageId: message.id, deletionSource: "hub", deletedAt: new Date().toISOString(), deletedBy: { channelId: null, displayName: "Website moderator", isChatOwner: false, isChatModerator: true } } };
        setMessages((current) => current.map((item) => item.id === message.id ? deletion : item));
      }
      if ((action === "hide" || action === "timeout") && message?.authorDetails.channelId) {
        const channelId = message.authorDetails.channelId;
        setMessages((current) => current.map((row) => { const item = originalMessage(row); return item?.authorDetails.channelId === channelId && !("deleted" in row) ? { ...item, hideEligible: action === "timeout", userHidden: action === "hide" || item.userHidden } : row; }));
      }
      const detail = action === "send" ? composer : message?.text || "";
      setRecentActions((current) => [{ id: crypto.randomUUID(), action, target, targetChannelId: message?.authorDetails.channelId, messageId: message?.id, detail, durationSeconds: action === "timeout" ? durationSeconds : undefined, occurredAt: new Date().toISOString(), moderator: "Website staff" }, ...current].slice(0, 100));
      if (action === "send") setComposer("");
      setNotice("YouTube action completed and recorded in the audit log.");
    } catch { setNotice("The moderation action could not be completed."); }
    finally { setPendingAction(""); setConfirmation(null); }
  }

  function mention(displayName: string) {
    if (!canSend) return;
    const textarea = composerRef.current; const mentionText = `@${displayName.replace(/^@/, "").trim()} `;
    const start = textarea?.selectionStart ?? composer.length; const end = textarea?.selectionEnd ?? start;
    const next = `${composer.slice(0, start)}${mentionText}${composer.slice(end)}`.slice(0, 200); setComposer(next);
    requestAnimationFrame(() => { textarea?.focus(); const cursor = Math.min(start + mentionText.length, next.length); textarea?.setSelectionRange(cursor, cursor); });
  }

  const connection = connectionLabel(snapshot, loading);
  const connectionState = snapshot?.streamStatus === "connected" ? "connected" : loading || snapshot?.lifecycleState === "reconnecting" ? "connecting" : "idle";
  const playerSyncLabel = drift?.syncState === "behind" && drift.lagSeconds ? `${Math.round(drift.lagSeconds)}s behind` : ({ ready: "Live sync ready", syncing: "Syncing to live", attention: "Live sync needs attention", paused: "Auto sync paused", checking: "Checking live edge" } as Record<string, string>)[drift?.syncState || ""] || (playerReady ? "Checking live edge" : "Manual start");

  return <div className={`${styles.workspace} ${fullScreen ? styles.fullScreen : ""} ${mobileView === "stream" ? styles.mobileStream : styles.mobileChat}`}>
    <nav className={styles.mobileNavigation} aria-label="Mobile Hub view"><button type="button" aria-pressed={mobileView === "stream"} onClick={() => setMobileView("stream")}>Stream</button><button type="button" aria-pressed={mobileView === "moderate"} onClick={() => setMobileView("moderate")}>Moderate</button></nav>
    <section className={styles.streamPanel} aria-label="YouTube stream monitor">
      <div className={styles.panelHeading}><div><p className={styles.sectionKicker}>Stream monitor</p><h2>Livestream player</h2></div><span className={styles.connection}><span className={styles.dot} data-state={sessionStatus === "live" ? "connected" : "idle"} />{activeVideoId ? "Stream loaded" : "Waiting for stream"}</span></div>
      {canSelectStream ? <div className={styles.streamSetup}><form className={styles.streamLoader} onSubmit={configureStream}><label><span className="sr-only">YouTube video or livestream URL</span><span aria-hidden="true">▶</span><input value={streamInput} onChange={(event) => setStreamInput(event.target.value)} placeholder="Paste YouTube livestream URL or video ID" /></label><button type="submit">Load stream</button></form><p role={streamError ? "alert" : undefined} data-error={Boolean(streamError)}>{streamError || "Local moderation source · supports watch, live, youtu.be links and raw 11-character video IDs."}</p></div> : null}
      {activeVideoId && playerReady && drift?.liveEdgeConfirmed ? <div className={styles.liveControls}>{drift.behind || drift.syncState === "paused" || drift.syncState === "attention" ? <span>{playerSyncLabel}</span> : null}<button type="button" onClick={() => playerSessionRef.current?.goLive()}><span />Go Live</button></div> : null}
      <div className={styles.playerFrame} onKeyDownCapture={(event) => { if (event.key === " ") playerSessionRef.current?.recordUserInteraction("keyboard-space"); if (event.key.toLowerCase() === "k") playerSessionRef.current?.recordUserInteraction("keyboard-k"); }} onMouseDownCapture={() => playerSessionRef.current?.recordUserInteraction("mouse")} onPointerDownCapture={() => playerSessionRef.current?.recordUserInteraction("pointer")} onTouchStartCapture={() => playerSessionRef.current?.recordUserInteraction("touch")}>
        {activeVideoId && playerOrigin ? <iframe key={activeVideoId} ref={iframeRef} src={getYouTubeEmbedUrl(activeVideoId, playerOrigin)} title={streamTitle || "YouTube livestream"} allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen /> : activeVideoId ? <div className={styles.playerEmpty} aria-hidden="true" /> : <div className={styles.playerEmpty}><strong>No stream loaded</strong><span>{canSelectStream ? "Paste a YouTube livestream URL above to begin monitoring." : "An administrator must configure a YouTube live source."}</span></div>}
      </div>
      <div className={styles.streamMeta}><div><span>Player</span><strong>{playerSyncLabel}</strong></div><div><span>Privacy</span><strong>youtube-nocookie.com</strong></div><div><span>Audio</span><strong>No autoplay</strong></div></div>
    </section>

    <section className={styles.chatPanel} aria-label="YouTube moderation workspace">
      <div className={styles.tabs} role="tablist" aria-label="Moderation panel view"><button type="button" className={styles.tab} role="tab" aria-selected={activePanel === "chat"} onClick={() => setActivePanel("chat")}><span className={styles.dot} data-state={connectionState} />Live Chat <span className={styles.tabCount}>{messages.length}</span></button><button type="button" className={styles.tab} role="tab" aria-selected={activePanel === "actions"} onClick={() => setActivePanel("actions")}>Recent Actions <span className={styles.tabCount}>{allActions.length}</span></button></div>
      {activePanel === "chat" ? <div className={styles.chatView} role="tabpanel">
        <div className={styles.chatHeader}><div><div className={styles.chatTitle}><h2>Moderation chat</h2><span className={styles.statusChip}>{publicPreview ? "Read-only preview" : canSend ? "Moderation enabled" : "Moderator"}</span></div><p>{connection}{snapshot?.reconnectAttempt ? ` · reconnect ${snapshot.reconnectAttempt}` : ""}</p></div><div className={styles.statusGroup}>{canModerate ? <a className={styles.studioLink} href={activeVideoId ? `https://studio.youtube.com/video/${activeVideoId}/livestreaming` : "https://studio.youtube.com/"} target="_blank" rel="noopener noreferrer">YouTube Studio ↗</a> : null}<button type="button" className={styles.pauseButton} aria-pressed={paused} onClick={togglePause}>{paused ? "Resume chat" : "Pause chat"}</button></div></div>
        <div className={styles.toolbar}><div className={styles.filters} role="group" aria-label="Filter chat messages">{filters.map((item) => <button type="button" key={item.id} aria-pressed={filter === item.id} onClick={() => setFilter(item.id)}>{item.label}</button>)}</div>{canModerate ? <ModeratorActivity messages={messages} actions={allActions} /> : null}<label className={styles.search}><span aria-hidden="true">⌕</span><span className="sr-only">Search YouTube chat</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search chat" /></label></div>
        {snapshot?.rateLimit ? <div className={`${styles.notice} ${styles.noticeRow}`} role="status"><span>{snapshot.rateLimit.kind === "quota" ? "YouTube quota reached. Polling is paused." : "YouTube rate limit reached. Polling will retry safely."}</span><button type="button" className={styles.retryButton} onClick={() => void load(true)}>Retry now</button></div> : null}
        {paused ? <div className={styles.pausedNotice} role="status">Chat display paused — incoming messages remain safely buffered.</div> : null}{notice ? <div className={styles.notice} role="status">{notice}</div> : null}
        <div className={styles.messageListShell}><div className={styles.messageList} aria-live="polite" ref={messageListRef} onScroll={handleMessageScroll}>
          {visibleMessages.length ? visibleMessages.map((row) => {
            if ("deleted" in row) return <article className={styles.deletedMessage} key={`deleted-${row.id}`}><span className={styles.deletedAvatar} aria-hidden="true">⌫</span><div><p>{row.original ? <><strong>@{row.original.username}:</strong> {row.original.text}</> : <strong>Deleted message</strong>}</p><small>Deleted by {row.event.deletedBy?.displayName ? `@${row.event.deletedBy.displayName}` : "a moderator"}{row.event.deletedAt ? ` · ${new Date(row.event.deletedAt).toLocaleTimeString()}` : ""}{!row.original ? " · Original content unavailable" : ""}</small></div></article>;
            const message = row; const protectedAccount = isProtectedMessage(message); const displayName = message.authorDetails.displayName || message.username; const channelPending = pendingAction.endsWith(`:${message.id}`);
            return <article className={styles.message} data-mention={message.mention || message.category === "mentions"} key={message.id}><span className={styles.avatar} data-tone={message.tone || "blue"} data-image={Boolean(message.authorDetails.profileImageUrl)} style={message.authorDetails.profileImageUrl ? { backgroundImage: `url(${JSON.stringify(message.authorDetails.profileImageUrl).slice(1, -1)})` } : undefined}>{message.authorDetails.profileImageUrl ? "" : message.initials || initials(displayName)}</span><div className={styles.messageBody}><div className={styles.messageMeta}>{canSend ? <button className={styles.authorButton} type="button" onClick={() => mention(displayName)} aria-label={`Mention ${displayName}`}>{displayName}</button> : <strong>{displayName}</strong>}{message.badges?.map((badge) => <span className={styles.badge} key={badge}>{badge}</span>)}{message.userHidden ? <span className={styles.badge}>Hidden</span> : null}{notes[`real:${message.authorDetails.channelId}`] ? <span className={styles.badge}>Note</span> : null}<time dateTime={message.publishedAt || undefined}>{formatMessageTime(message)}</time></div><p className={styles.messageText}>{message.text}</p>{canModerate ? <div className={styles.actions} aria-label={`Moderation controls for ${displayName}`}><button type="button" data-action="delete" title={protectedAccount ? "Protected accounts cannot be moderated" : "Delete message"} disabled={protectedAccount || !message.deleteEligible || channelPending} onClick={() => requestAction({ action: "delete", message })}>Delete</button><select className={styles.timeoutSelect} aria-label={`Timeout duration for ${displayName}`} value={timeoutDuration} onChange={(event) => setTimeoutDuration(Number(event.target.value))}>{timeoutOptions.map(([seconds, label]) => <option value={seconds} key={seconds}>{label}</option>)}</select><button type="button" data-action="timeout" disabled={protectedAccount || !message.hideEligible || channelPending} onClick={() => requestAction({ action: "timeout", message, durationSeconds: timeoutDuration })}>Timeout</button><button type="button" title="View user details" onClick={() => setSelectedUser(message)}>Details</button><button type="button" data-action="hide" disabled={protectedAccount || !message.hideEligible || message.userHidden || channelPending} onClick={() => requestAction({ action: "hide", message })}>Ban user</button></div> : null}</div></article>;
          }) : <div className={styles.empty}><strong>{loading ? "Connecting to live chat…" : "No messages found"}</strong><span>{query || filter !== "all" ? "Try another filter or search phrase." : "Messages will appear here when the YouTube chat is active."}</span></div>}
        </div>{showJump ? <button className={styles.jumpButton} type="button" onClick={jumpToLatest}>Jump to latest</button> : null}</div>
        {canSend ? <form className={styles.composer} onSubmit={(event) => { event.preventDefault(); void act("send"); }}><label htmlFor="youtube-chat-composer" className="sr-only">Send a YouTube chat message</label><textarea ref={composerRef} id="youtube-chat-composer" value={composer} onChange={(event) => setComposer(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); if (composer.trim()) void act("send"); } }} maxLength={200} required placeholder="Write a message to YouTube live chat" /><button type="submit" disabled={!composer.trim() || pendingAction === "send:composer"}>{pendingAction === "send:composer" ? "Sending…" : "Send"}</button><div className={styles.composerMeta}><span>Enter to send · Shift+Enter for a new line</span><span>{composer.length}/200</span></div></form> : <div className={styles.roleNotice}>{publicPreview ? <><strong>Public preview.</strong> No moderation, sending, configuration, or backend access.</> : <><strong>Moderator access.</strong> Delete, all Timeout durations, permanent Ban and user details are enabled. Sending and stream configuration remain admin-only.</>}</div>}
      </div> : <div className={styles.actionsView} role="tabpanel"><div className={styles.actionsHeader}><h2>Recent Actions</h2><p>Local session history plus observed YouTube deletion events. Website actions are also written to the server audit log.</p></div><div className={styles.actionList}>{allActions.length ? allActions.map((item) => <article className={styles.actionItem} key={item.id}><strong>{actionLabel(item.action)} · {item.target}</strong><time dateTime={item.occurredAt}>{new Intl.DateTimeFormat("en", { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date(item.occurredAt))}</time><span>{item.moderator ? `${item.moderator} · ` : ""}{item.action === "timeout" && item.durationSeconds ? `${item.durationSeconds < 60 ? `${item.durationSeconds}s` : `${item.durationSeconds / 60}m`} · ` : ""}{item.detail || "No message context available"}</span></article>) : <p className={styles.empty}>No moderation actions in this session yet.</p>}</div></div>}
    </section>
    {confirmation ? <ModerationConfirmation request={confirmation} onCancel={() => setConfirmation(null)} onConfirm={() => void act(confirmation.action, confirmation.message, confirmation.durationSeconds)} /> : null}
    {selectedUser ? <UserDetailsPanel selected={selectedUser} messages={messages} actions={allActions} notes={notes} canModerate={canModerate} onNotesChange={setNotes} onClose={() => setSelectedUser(null)} onRequestAction={(request) => { setSelectedUser(null); requestAction(request); }} /> : null}
  </div>;
}

function initials(name: string) { return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "YT"; }
