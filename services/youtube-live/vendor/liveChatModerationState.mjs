export const MAX_SHARED_LIVE_CHATS = 10
export const MAX_SHARED_DELETION_EVENTS = 1000

function safeModerator(account) {
  if (!account) return null
  return {
    channelId: account.channelId || null,
    displayName: account.displayName || account.title || null,
    profileImageUrl: account.profileImageUrl || account.thumbnailUrl || null,
    isChatOwner: Boolean(account.isChatOwner),
    isChatModerator: Boolean(account.isChatModerator),
  }
}

function safeTimestamp(value) {
  const timestamp = Date.parse(value)
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : new Date().toISOString()
}

export function createLiveChatModerationState({
  maximumChats = MAX_SHARED_LIVE_CHATS,
  maximumDeletionEvents = MAX_SHARED_DELETION_EVENTS,
} = {}) {
  const chats = new Map()

  function getChat(liveChatId, create = false) {
    let chat = chats.get(liveChatId)
    if (!chat && create) {
      chat = { deletionEvents: new Map() }
      chats.set(liveChatId, chat)
      while (chats.size > maximumChats) chats.delete(chats.keys().next().value)
    }
    return chat
  }

  function hasDeletion(liveChatId, messageId) {
    return Boolean(getChat(liveChatId)?.deletionEvents.has(messageId))
  }

  function recordDeletion({ liveChatId, messageId, moderator, deletedAt = new Date().toISOString() }) {
    const chat = getChat(liveChatId, true)
    const existing = chat.deletionEvents.get(messageId)
    if (existing) return structuredClone(existing)

    const timestamp = safeTimestamp(deletedAt)
    const event = {
      id: `hub-delete:${messageId}`,
      deletionEventId: `hub-delete:${messageId}`,
      deletedMessageId: messageId,
      type: 'messageDeletedEvent',
      isReal: true,
      deletionEvent: true,
      deletionSource: 'hub',
      deletedAt: timestamp,
      publishedAt: timestamp,
      deletedBy: safeModerator(moderator),
    }
    chat.deletionEvents.set(messageId, event)
    while (chat.deletionEvents.size > maximumDeletionEvents) {
      chat.deletionEvents.delete(chat.deletionEvents.keys().next().value)
    }
    return structuredClone(event)
  }

  function listDeletionEvents(liveChatId) {
    const chat = getChat(liveChatId)
    return chat ? [...chat.deletionEvents.values()].map((event) => structuredClone(event)) : []
  }

  return Object.freeze({ hasDeletion, recordDeletion, listDeletionEvents })
}


