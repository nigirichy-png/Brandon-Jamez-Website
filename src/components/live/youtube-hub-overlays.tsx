"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { YouTubeChatMessage } from "@/lib/youtube-live/model";
import type { DisplayedChatMessage, HubAction, ModeratorNotes } from "./youtube-hub-utils";
import { deriveModeratorActivity, messageChannelId, originalMessage, relativeTime, saveModeratorNote } from "./youtube-hub-utils";
import styles from "./youtube-moderation-panel.module.css";

export type PendingModeration = { action: "delete" | "timeout" | "hide"; message: YouTubeChatMessage; durationSeconds?: number };

export function ModerationConfirmation({ request, onCancel, onConfirm }: { request: PendingModeration; onCancel: () => void; onConfirm: () => void }) {
  const cancelRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => { cancelRef.current?.focus(); }, []);
  const displayName = request.message.authorDetails.displayName || request.message.username;
  const title = request.action === "timeout" ? `Timeout ${displayName}?` : request.action === "hide" ? `Permanently ban ${displayName} from live chat?` : `Delete this message from ${displayName}?`;
  const detail = request.action === "timeout" ? `The user will be unable to participate for ${formatDuration(request.durationSeconds || 300)}.` : request.action === "hide" ? "This permanently hides the user from the YouTube live chat and cannot be undone here." : "The selected YouTube chat message will be deleted.";
  const dialog = <div className={styles.dialogBackdrop} onMouseDown={(event) => event.target === event.currentTarget && onCancel()}>
    <div className={styles.dialog} role="alertdialog" aria-modal="true" aria-labelledby="moderation-confirmation-title" onKeyDown={(event) => { if (event.key === "Escape") onCancel(); }}>
      <span className={styles.dialogIcon} aria-hidden="true">{request.action === "delete" ? "⌫" : request.action === "timeout" ? "◷" : "⊘"}</span>
      <h2 id="moderation-confirmation-title">{title}</h2><p>{detail}</p>
      <div className={styles.dialogButtons}><button ref={cancelRef} type="button" onClick={onCancel}>Cancel</button><button type="button" data-danger={request.action !== "timeout"} onClick={onConfirm}>Confirm {request.action}</button></div>
    </div>
  </div>;
  return typeof document === "undefined" ? dialog : createPortal(dialog, document.body);
}

export function ModeratorActivity({ messages, actions }: { messages: DisplayedChatMessage[]; actions: HubAction[] }) {
  const [open, setOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const entries = useMemo(() => {
    const observed = deriveModeratorActivity(messages);
    const latestStaffAction = actions.find((action) => action.action !== "send");
    return latestStaffAction ? [{ author: { channelId: "website-staff", displayName: latestStaffAction.moderator || "Website staff", isChatOwner: false, isChatModerator: true }, at: latestStaffAction.occurredAt, action: latestStaffAction.action }, ...observed] : observed;
  }, [actions, messages]);
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 30_000); return () => clearInterval(timer); }, []);
  const recentCount = entries.filter((entry) => now - Date.parse(entry.at) <= 20 * 60_000).length;
  return <div className={styles.activityControl}><button type="button" className={styles.activityTrigger} aria-expanded={open} onClick={() => setOpen((value) => !value)}>Mods seen: {recentCount}</button>{open ? <section className={styles.activityPanel}>
    <div className={styles.activityHeading}><h3>Moderator activity</h3><button type="button" aria-label="Close moderator activity" onClick={() => setOpen(false)}>×</button></div>
    <p>Based on observed chat activity. Silent moderators cannot be detected.</p>
    {entries.length ? <ul>{entries.map((entry) => <li key={entry.author.channelId}><span className={styles.activityAvatar}>{initials(entry.author.displayName)}</span><span><strong>@{entry.author.displayName}</strong><small>{entry.author.isChatOwner ? "Owner" : "Moderator"}</small></span><span><b>{now - Date.parse(entry.at) <= 5 * 60_000 ? "Active now" : now - Date.parse(entry.at) <= 20 * 60_000 ? "Seen recently" : "Inactive"}</b><small>{entry.action === "deletion" ? "Last deletion" : "Last message"} {relativeTime(entry.at, now)}</small></span></li>)}</ul> : <div className={styles.activityEmpty}>No moderator activity observed yet.</div>}
  </section> : null}</div>;
}

export function UserDetailsPanel({ selected, messages, actions, notes, canModerate, onNotesChange, onClose, onRequestAction }: { selected: YouTubeChatMessage; messages: DisplayedChatMessage[]; actions: HubAction[]; notes: ModeratorNotes; canModerate: boolean; onNotesChange: (notes: ModeratorNotes) => void; onClose: () => void; onRequestAction: (request: PendingModeration) => void }) {
  const [localNotes, setLocalNotes] = useState(() => ({ ...notes, ...loadLocalNotes() }));
  const channelId = selected.authorDetails.channelId;
  const related = useMemo(() => messages.filter((message) => channelId && messageChannelId(message) === channelId).slice().reverse(), [channelId, messages]);
  const history = useMemo(() => actions.filter((action) => channelId && action.targetChannelId === channelId), [actions, channelId]);
  const noteKey = channelId ? `real:${channelId}` : "";
  const savedNote = localNotes[noteKey];
  const [draft, setDraft] = useState(savedNote?.text || "");
  const [feedback, setFeedback] = useState("");
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const protectedAccount = selected.authorDetails.isChatOwner || selected.authorDetails.isChatModerator;
  const eligible = Boolean(canModerate && channelId && selected.hideEligible && !selected.userHidden && !protectedAccount);
  const dirty = draft.trim() !== (savedNote?.text || "");

  useEffect(() => { closeRef.current?.focus(); const overflow = document.body.style.overflow; document.body.style.overflow = "hidden"; return () => { document.body.style.overflow = overflow; }; }, []);
  function requestClose() { if (dirty) setConfirmDiscard(true); else onClose(); }
  function save() { if (!channelId) return; try { const next = saveModeratorNote(localNotes, channelId, draft); setLocalNotes(next); onNotesChange(next); setFeedback(draft.trim() ? "Moderator note saved locally." : "Moderator note removed."); } catch (error) { setFeedback(error instanceof Error ? error.message : "The note could not be saved."); } }
  function removeNote() { if (!channelId) return; try { const next = saveModeratorNote(localNotes, channelId, ""); setLocalNotes(next); onNotesChange(next); setDraft(""); setFeedback("Moderator note removed."); } finally { setConfirmRemove(false); } }

  const panel = <div className={styles.detailsBackdrop} onMouseDown={(event) => event.target === event.currentTarget && requestClose()}>
    <aside className={styles.detailsPanel} role="dialog" aria-modal="true" aria-labelledby="youtube-user-details-title" onKeyDown={(event) => { if (event.key === "Escape") requestClose(); }}>
      <header className={styles.detailsHeader}><div className={styles.detailsIdentity}><span className={styles.detailsAvatar}>{initials(selected.authorDetails.displayName)}</span><div><span>User details · Real chat</span><h2 id="youtube-user-details-title">{selected.authorDetails.displayName}</h2><div>{protectedAccount ? <b>Protected account</b> : <b>{eligible ? "Eligible for moderation" : "Moderation unavailable"}</b>}{selected.badges?.map((badge) => <i key={badge}>{badge}</i>)}</div></div></div><button ref={closeRef} type="button" aria-label="Close user details" onClick={requestClose}>×</button></header>
      <div className={styles.detailsScroll}>
        <div className={styles.detailsStats}><div><span>Messages observed</span><strong>{related.length}</strong></div><div><span>First observed</span><strong>{formatMessageTime(related.at(-1))}</strong></div><div><span>Last observed</span><strong>{formatMessageTime(related[0])}</strong></div></div>
        {channelId ? <a className={styles.channelLink} href={`https://www.youtube.com/channel/${encodeURIComponent(channelId)}`} target="_blank" rel="noopener noreferrer">Open YouTube channel ↗</a> : null}
        <section className={styles.noteSection}><div className={styles.sectionHeading}><h3>Moderator note</h3><span>Local · Private to this browser</span></div><label htmlFor="youtube-moderator-note">Internal note for {selected.authorDetails.displayName}</label><textarea id="youtube-moderator-note" value={draft} maxLength={500} onChange={(event) => { setDraft(event.target.value); setFeedback(""); }} /><div className={styles.noteMeta}><span>{savedNote ? `Updated ${new Date(savedNote.updatedAt).toLocaleString()}` : "Not yet saved"}</span><span>{draft.length}/500</span></div><p role="status">{feedback}</p><div className={styles.noteButtons}>{savedNote ? <button type="button" onClick={() => setConfirmRemove(true)}>Remove note</button> : null}<button type="button" disabled={!dirty} onClick={save}>Save note</button></div></section>
        <section className={styles.detailsSection}><div className={styles.sectionHeading}><h3>Recent messages</h3><span>Newest first</span></div>{related.length ? <div className={styles.recentMessages}>{related.slice(0, 6).map((row) => { const message = originalMessage(row); return <article key={row.id} data-deleted={"deleted" in row}><span>{formatMessageTime(row)}{"deleted" in row ? " · Deleted" : ""}</span><p>{message?.text || "Original message unavailable"}</p>{message && !("deleted" in row) && canModerate ? <button type="button" disabled={!message.deleteEligible || protectedAccount} onClick={() => onRequestAction({ action: "delete", message })}>Delete</button> : null}</article>; })}</div> : <p className={styles.detailsEmpty}>No recent messages observed.</p>}</section>
        <section className={styles.detailsSection}><div className={styles.sectionHeading}><h3>Prior moderation</h3><span>Local session</span></div>{history.length ? <ul className={styles.history}>{history.map((action) => <li key={action.id}><span><strong>{actionName(action.action)}</strong><small>{action.detail}</small></span><time>{new Date(action.occurredAt).toLocaleTimeString()}</time></li>)}</ul> : <p className={styles.detailsEmpty}>No moderation actions recorded for this user.</p>}</section>
      </div>
      <footer className={styles.detailsActions}><select aria-label="Timeout duration" defaultValue="300" id="details-timeout-duration"><option value="10">10 seconds</option><option value="30">30 seconds</option><option value="60">1 minute</option><option value="300">5 minutes</option><option value="600">10 minutes</option><option value="1800">30 minutes</option></select><button type="button" disabled={!eligible} onClick={() => { const select = document.getElementById("details-timeout-duration") as HTMLSelectElement | null; onRequestAction({ action: "timeout", message: selected, durationSeconds: Number(select?.value || 300) }); }}>Timeout</button><button type="button" data-danger="true" disabled={!eligible} onClick={() => onRequestAction({ action: "hide", message: selected })}>Ban user</button></footer>
    </aside>
    {confirmDiscard ? <div className={styles.nestedConfirm} role="alertdialog" aria-modal="true"><div><h2>Discard unsaved note changes?</h2><p>Your edits have not been saved to this browser.</p><span><button type="button" onClick={() => setConfirmDiscard(false)}>Cancel</button><button type="button" onClick={onClose}>Discard changes</button></span></div></div> : null}
    {confirmRemove ? <div className={styles.nestedConfirm} role="alertdialog" aria-modal="true"><div><h2>Remove moderator note?</h2><p>This permanently removes the local note from this browser profile.</p><span><button type="button" onClick={() => setConfirmRemove(false)}>Cancel</button><button type="button" onClick={removeNote}>Remove note</button></span></div></div> : null}
  </div>;
  return typeof document === "undefined" ? panel : createPortal(panel, document.body);
}

function initials(name: string) { return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "YT"; }
function loadLocalNotes() { try { const raw = localStorage.getItem("brandon-moderator-notes:v1"); if (!raw) return {}; const parsed = JSON.parse(raw) as { notes?: ModeratorNotes }; return parsed.notes && typeof parsed.notes === "object" ? parsed.notes : {}; } catch { return {}; } }
function formatDuration(seconds: number) { return seconds < 60 ? `${seconds} seconds` : `${seconds / 60} ${seconds === 60 ? "minute" : "minutes"}`; }
function actionName(action: HubAction["action"]) { return ({ delete: "Deleted message", "external-delete": "Deleted message", timeout: "Timeout", hide: "Banned user", send: "Sent message" })[action]; }
function formatMessageTime(row?: DisplayedChatMessage) { const message = row ? originalMessage(row) : null; const value = message?.publishedAt || (row && "deleted" in row ? row.event.deletedAt : null); return value ? new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Unavailable"; }
