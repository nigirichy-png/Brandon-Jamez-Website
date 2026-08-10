import { AppError } from './errors.mjs'

const VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/
export const LIVE_CHAT_MESSAGE_ID_PATTERN = /^[A-Za-z0-9._~-]{1,256}$/
export const YOUTUBE_CHANNEL_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/
export const LIVE_CHAT_TIMEOUT_DURATIONS = Object.freeze([10, 30, 60, 300, 600, 1800])
export const LIVE_CHAT_MESSAGE_MAX_LENGTH = 200

export function normalizePollingInterval(value) {
  const interval = Number(value)
  return Number.isFinite(interval) && interval > 0 ? Math.max(1000, interval) : 5000
}

const DEFAULT_RATE_LIMIT_RETRY_MS = 5 * 60 * 1000

function getResponseHeader(error, name) {
  const headers = error.response?.headers
  if (!headers) return null
  if (typeof headers.get === 'function') return headers.get(name)
  const normalizedName = name.toLowerCase()
  const entry = Object.entries(headers).find(([key]) => key.toLowerCase() === normalizedName)
  return entry?.[1] ?? null
}

export function parseRetryAfter(value, now = Date.now()) {
  if (value === null || value === undefined || value === '') return null
  const seconds = Number(value)
  if (Number.isFinite(seconds) && seconds >= 0) return Math.ceil(seconds * 1000)
  const retryAt = Date.parse(String(value))
  if (!Number.isFinite(retryAt)) return null
  return Math.max(0, retryAt - now)
}

function millisecondsUntilNextUtcDay(now) {
  const date = new Date(now)
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1, 0, 1) - now
}

function createReadLimitError(kind, retryAfterMs) {
  const quotaExhausted = kind === 'quota'
  return new AppError(
    429,
    quotaExhausted ? 'youtube_quota_exhausted' : 'youtube_rate_limited',
    quotaExhausted
      ? 'The YouTube API quota is currently exhausted. Automatic live chat polling is paused.'
      : 'YouTube is temporarily rate limiting live chat requests. Polling is paused.',
    {
      retryable: !quotaExhausted,
      retryAfterMs,
      rateLimitKind: kind,
    },
  )
}

function mapBadges(author = {}) {
  const badges = []
  if (author.isChatOwner) badges.push('Owner')
  if (author.isChatModerator) badges.push('Moderator')
  if (author.isChatSponsor) badges.push('Member')
  if (author.isVerified) badges.push('Verified')
  return badges
}

function initials(name = '') {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'YT'
}

function normalizeAuthor(author = {}) {
  return {
    channelId: author.channelId || null,
    displayName: author.displayName || null,
    profileImageUrl: author.profileImageUrl || null,
    badges: mapBadges(author),
    isChatOwner: Boolean(author.isChatOwner),
    isChatModerator: Boolean(author.isChatModerator),
    isChatSponsor: Boolean(author.isChatSponsor),
    isVerified: Boolean(author.isVerified),
  }
}

export function normalizeLiveChatMessage(item) {
  const author = item.authorDetails || {}
  const snippet = item.snippet || {}
  const displayName = author.displayName || 'YouTube user'
  const publishedAt = snippet.publishedAt || null
  const text = snippet.displayMessage || snippet.textMessageDetails?.messageText || ''
  const type = snippet.type || 'textMessageEvent'
  const normalizedAuthor = normalizeAuthor(author)

  if (type === 'messageDeletedEvent') {
    return {
      id: item.id,
      deletionEventId: item.id,
      deletedMessageId: snippet.messageDeletedDetails?.deletedMessageId || null,
      type,
      isReal: true,
      deletionEvent: true,
      deletedAt: publishedAt,
      publishedAt,
      timestamp: publishedAt ? new Date(publishedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }) : '',
      deletedBy: normalizedAuthor.displayName || normalizedAuthor.channelId ? normalizedAuthor : null,
    }
  }

  return {
    id: item.id,
    initials: initials(displayName),
    username: displayName,
    timestamp: publishedAt ? new Date(publishedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }) : '',
    publishedAt,
    text,
    isReal: true,
    deleteEligible: type === 'textMessageEvent' && LIVE_CHAT_MESSAGE_ID_PATTERN.test(item.id || ''),
    hideEligible: YOUTUBE_CHANNEL_ID_PATTERN.test(author.channelId || '') && !author.isChatOwner && !author.isChatModerator,
    type,
    badges: mapBadges(author),
    mention: text.toLowerCase().includes('@brandon'),
    category: author.isChatSponsor ? 'members' : text.toLowerCase().includes('@brandon') ? 'mentions' : 'all',
    tone: author.isChatModerator || author.isChatOwner ? 'green' : author.isChatSponsor ? 'violet' : 'blue',
    authorDetails: { ...normalizedAuthor, displayName },
  }
}

export function mapDeleteYouTubeError(error) {
  if (error instanceof AppError) return error
  const status = error.response?.status || error.code
  const reasons = error.response?.data?.error?.errors?.map((item) => item.reason) || []

  if (status === 401) return new AppError(401, 'authentication_required', 'The YouTube connection expired. Reconnect YouTube and try again.')
  if (reasons.includes('modificationNotAllowed')) {
    return new AppError(403, 'modification_not_allowed', 'YouTube does not allow this particular message to be deleted, possibly because of its author or message type.')
  }
  if (reasons.includes('liveChatMessageNotFound') || status === 404) {
    return new AppError(404, 'live_chat_message_not_found', 'The message was not found and may already have been removed.')
  }
  if (reasons.some((reason) => ['quotaExceeded', 'dailyLimitExceeded', 'rateLimitExceeded'].includes(reason)) || status === 429) {
    return new AppError(429, 'quota_or_rate_limited', 'YouTube is temporarily rate limited. Wait before trying another moderation action.')
  }
  if (status === 403 || reasons.some((reason) => ['forbidden', 'insufficientPermissions'].includes(reason))) {
    return new AppError(403, 'insufficient_moderation_permission', 'The signed-in account may not be a moderator for this live chat or lacks the required permission.')
  }
  return new AppError(502, 'youtube_delete_failed', 'YouTube could not delete the message because of a temporary API failure.')
}

export async function deleteLiveChatMessage(youtube, messageId) {
  if (!LIVE_CHAT_MESSAGE_ID_PATTERN.test(messageId || '')) {
    throw new AppError(400, 'invalid_live_chat_message_id', 'A valid YouTube live-chat message ID is required.')
  }

  try {
    await youtube.liveChatMessages.delete({ id: messageId })
  } catch (error) {
    throw mapDeleteYouTubeError(error)
  }
}

export function mapHideUserYouTubeError(error) {
  if (error instanceof AppError) return error
  const status = error.response?.status || error.code
  const reasons = error.response?.data?.error?.errors?.map((item) => item.reason) || []

  if (status === 401) return new AppError(401, 'authentication_required', 'The YouTube connection expired. Reconnect YouTube and try again.')
  if (reasons.includes('liveChatBanInsertionNotAllowed')) {
    return new AppError(409, 'hide_user_not_allowed', 'YouTube did not allow this user to be hidden. The user may already be hidden or may be the chat owner or a moderator.')
  }
  if (reasons.includes('invalidChannelId')) return new AppError(400, 'invalid_user_channel_id', 'YouTube did not recognize the selected user channel.')
  if (reasons.includes('invalidLiveChatId')) return new AppError(400, 'invalid_live_chat_id', 'YouTube did not recognize the active live chat.')
  if (reasons.includes('liveChatUserNotFound')) return new AppError(404, 'live_chat_user_not_found', 'The selected user is no longer available in this live chat.')
  if (reasons.includes('liveChatNotFound') || status === 404) return new AppError(404, 'chat_unavailable', 'The active YouTube live chat is no longer available.')
  if (reasons.some((reason) => ['quotaExceeded', 'dailyLimitExceeded', 'rateLimitExceeded'].includes(reason)) || status === 429) {
    return new AppError(429, 'quota_or_rate_limited', 'YouTube is temporarily rate limited. Wait before trying another moderation action.')
  }
  if (status === 403 || reasons.some((reason) => ['forbidden', 'insufficientPermissions'].includes(reason))) {
    return new AppError(403, 'insufficient_moderation_permission', 'The signed-in account may not be a moderator for this live chat or lacks permission to hide users.')
  }
  return new AppError(502, 'youtube_hide_user_failed', 'YouTube could not hide the user because of a temporary API or network failure.', { retryable: true })
}

export async function hideLiveChatUser(youtube, liveChatId, channelId) {
  if (!liveChatId || typeof liveChatId !== 'string') throw new AppError(400, 'invalid_live_chat_id', 'A valid active YouTube live-chat ID is required.')
  if (!YOUTUBE_CHANNEL_ID_PATTERN.test(channelId || '')) throw new AppError(400, 'invalid_user_channel_id', 'A valid YouTube user channel ID is required.')

  try {
    return await youtube.liveChatBans.insert({
      part: ['snippet'],
      requestBody: {
        snippet: {
          liveChatId,
          type: 'permanent',
          bannedUserDetails: { channelId },
        },
      },
    })
  } catch (error) {
    throw mapHideUserYouTubeError(error)
  }
}

export function mapTimeoutUserYouTubeError(error) {
  if (error instanceof AppError) return error
  const mapped = mapHideUserYouTubeError(error)
  const code = mapped.code === 'hide_user_not_allowed' ? 'timeout_user_not_allowed'
    : mapped.code === 'youtube_hide_user_failed' ? 'youtube_timeout_user_failed'
      : mapped.code
  const message = mapped.code === 'hide_user_not_allowed'
    ? 'YouTube did not allow this user to be timed out. The user may be protected or unavailable.'
    : mapped.code === 'youtube_hide_user_failed'
      ? 'YouTube could not time out the user because of a temporary API or network failure.'
      : mapped.message.replace(/hide users/g, 'time out users')
  return new AppError(mapped.status, code, message, { retryable: mapped.retryable })
}

export async function timeoutLiveChatUser(youtube, liveChatId, channelId, durationSeconds) {
  if (!liveChatId || typeof liveChatId !== 'string') throw new AppError(400, 'invalid_live_chat_id', 'A valid active YouTube live-chat ID is required.')
  if (!YOUTUBE_CHANNEL_ID_PATTERN.test(channelId || '')) throw new AppError(400, 'invalid_user_channel_id', 'A valid YouTube user channel ID is required.')
  if (!Number.isInteger(durationSeconds) || !LIVE_CHAT_TIMEOUT_DURATIONS.includes(durationSeconds)) {
    throw new AppError(400, 'invalid_timeout_duration', 'Select a supported timeout duration.')
  }

  try {
    return await youtube.liveChatBans.insert({
      part: ['snippet'],
      requestBody: {
        snippet: {
          liveChatId,
          type: 'temporary',
          banDurationSeconds: durationSeconds,
          bannedUserDetails: { channelId },
        },
      },
    })
  } catch (error) {
    throw mapTimeoutUserYouTubeError(error)
  }
}

export function normalizeOutgoingLiveChatMessage(messageText) {
  if (typeof messageText !== 'string') {
    throw new AppError(400, 'message_text_invalid', 'Enter a valid live-chat message.')
  }
  const normalized = messageText.trim()
  const characterCount = Array.from(normalized).length
  if (!normalized || characterCount > LIVE_CHAT_MESSAGE_MAX_LENGTH) {
    throw new AppError(
      400,
      'message_text_invalid',
      `Enter a live-chat message between 1 and ${LIVE_CHAT_MESSAGE_MAX_LENGTH} characters.`,
    )
  }
  return normalized
}

export function mapSendLiveChatMessageError(error) {
  if (error instanceof AppError) return error
  const status = error.response?.status || error.code
  const reasons = error.response?.data?.error?.errors?.map((item) => item.reason) || []

  if (status === 401 || reasons.includes('authError')) {
    return new AppError(401, 'authentication_required', 'The YouTube connection expired. Reconnect YouTube and try again.')
  }
  if (reasons.includes('liveChatEnded')) return new AppError(410, 'chat_ended', 'This live chat has ended.')
  if (reasons.includes('liveChatDisabled')) return new AppError(409, 'chat_disabled', 'Live chat is disabled for this stream.')
  if (reasons.includes('messageTextInvalid')) {
    return new AppError(400, 'message_text_invalid', 'YouTube did not accept this message text.')
  }
  if (reasons.includes('invalidLiveChatId') || reasons.includes('liveChatNotFound') || status === 404) {
    return new AppError(404, 'chat_unavailable', 'The active YouTube live chat is no longer available.')
  }
  if (reasons.some((reason) => ['rateLimitExceeded', 'quotaExceeded', 'dailyLimitExceeded'].includes(reason)) || status === 429) {
    return new AppError(429, 'youtube_send_rate_limited', 'YouTube is temporarily limiting sent messages. Wait before sending again.')
  }
  if (status === 403 || reasons.some((reason) => ['forbidden', 'insufficientPermissions', 'liveChatMessageInsertionNotAllowed'].includes(reason))) {
    return new AppError(403, 'insufficient_send_permission', 'The signed-in account cannot send messages to this live chat.')
  }
  return new AppError(502, 'youtube_send_failed', 'YouTube could not send the message because of a temporary API or network failure.')
}

export async function sendLiveChatMessage(youtube, liveChatId, messageText) {
  if (!liveChatId || typeof liveChatId !== 'string') {
    throw new AppError(409, 'chat_unavailable', 'Load an active real YouTube live chat before sending a message.')
  }
  const normalizedMessage = normalizeOutgoingLiveChatMessage(messageText)
  try {
    return await youtube.liveChatMessages.insert({
      part: ['snippet'],
      requestBody: {
        snippet: {
          liveChatId,
          type: 'textMessageEvent',
          textMessageDetails: {
            messageText: normalizedMessage,
          },
        },
      },
    })
  } catch (error) {
    throw mapSendLiveChatMessageError(error)
  }
}

export function mapYouTubeError(error) {
  if (error instanceof AppError) return error
  const status = error.response?.status || error.code
  const reasons = error.response?.data?.error?.errors?.map((item) => item.reason) || []
  const retryAfterMs = parseRetryAfter(getResponseHeader(error, 'retry-after'))

  if (status === 401) return new AppError(401, 'authentication_required', 'The YouTube connection is no longer valid.')
  if (reasons.some((reason) => ['quotaExceeded', 'dailyLimitExceeded'].includes(reason))) {
    return createReadLimitError('quota', retryAfterMs ?? millisecondsUntilNextUtcDay(Date.now()))
  }
  if (status === 429) {
    return createReadLimitError('rate', retryAfterMs ?? DEFAULT_RATE_LIMIT_RETRY_MS)
  }
  if (reasons.some((reason) => ['insufficientPermissions', 'forbidden'].includes(reason))) {
    return new AppError(403, 'insufficient_permission', 'The connected account does not have sufficient YouTube permission.')
  }
  if (reasons.includes('rateLimitExceeded')) {
    return createReadLimitError('rate', retryAfterMs ?? DEFAULT_RATE_LIMIT_RETRY_MS)
  }
  if (reasons.includes('liveChatEnded')) return new AppError(410, 'chat_ended', 'This live chat has ended.')
  if (status === 404 || reasons.includes('liveChatNotFound')) return new AppError(404, 'chat_unavailable', 'The live chat is not available.')
  return new AppError(502, 'youtube_api_error', 'YouTube could not complete the request.', { retryable: true })
}

export async function resolveActiveLiveChat(youtube, videoId) {
  if (!VIDEO_ID_PATTERN.test(videoId || '')) {
    throw new AppError(400, 'invalid_video_id', 'A valid 11-character YouTube video ID is required.')
  }

  let response
  try {
    response = await youtube.videos.list({
      part: ['snippet', 'liveStreamingDetails'],
      id: [videoId],
      maxResults: 1,
    })
  } catch (error) {
    throw mapYouTubeError(error)
  }

  const video = response.data.items?.[0]
  if (!video) throw new AppError(404, 'video_not_found', 'The YouTube video was not found.')
  if (video.liveStreamingDetails?.actualEndTime) throw new AppError(410, 'chat_ended', 'The livestream and its active chat have ended.')
  if (video.snippet?.liveBroadcastContent !== 'live') throw new AppError(409, 'stream_offline', 'The selected video is not currently live.')

  const liveChatId = video.liveStreamingDetails?.activeLiveChatId
  if (!liveChatId) throw new AppError(409, 'chat_unavailable', 'The livestream does not expose an active chat.')

  return {
    videoId,
    liveChatId,
    title: video.snippet?.title || 'Live stream',
    channelTitle: video.snippet?.channelTitle || null,
  }
}

export async function fetchLiveChatMessages(youtube, liveChatId, pageToken) {
  if (!liveChatId || typeof liveChatId !== 'string') {
    throw new AppError(400, 'invalid_live_chat_id', 'A live-chat ID is required.')
  }

  let response
  try {
    response = await youtube.liveChatMessages.list({
      part: ['snippet', 'authorDetails'],
      liveChatId,
      maxResults: 200,
      ...(pageToken ? { pageToken } : {}),
    })
  } catch (error) {
    throw mapYouTubeError(error)
  }

  const messages = (response.data.items || [])
    .map(normalizeLiveChatMessage)
    .sort((a, b) => String(a.publishedAt).localeCompare(String(b.publishedAt)))

  return {
    messages,
    nextPageToken: response.data.nextPageToken || null,
    pollingIntervalMillis: normalizePollingInterval(response.data.pollingIntervalMillis),
    offlineAt: response.data.offlineAt || null,
  }
}

