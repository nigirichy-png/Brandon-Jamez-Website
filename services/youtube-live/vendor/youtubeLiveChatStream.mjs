import { fileURLToPath } from 'node:url'

import grpc from '@grpc/grpc-js'
import protoLoader from '@grpc/proto-loader'

import { AppError } from './errors.mjs'
import { parseRetryAfter } from './youtube.mjs'

const PROTO_PATH = fileURLToPath(new URL('../proto/stream_list.proto', import.meta.url))
const DEFAULT_RATE_LIMIT_RETRY_MS = 5 * 60 * 1000

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  defaults: true,
  enums: String,
  keepCase: false,
  longs: String,
  oneofs: true,
})
const streamPackage = grpc.loadPackageDefinition(packageDefinition).youtube.api.v3

const STREAM_MESSAGE_TYPES = Object.freeze({
  TEXT_MESSAGE_EVENT: 'textMessageEvent',
  TOMBSTONE: 'tombstone',
  FAN_FUNDING_EVENT: 'fanFundingEvent',
  CHAT_ENDED_EVENT: 'chatEndedEvent',
  SPONSOR_ONLY_MODE_STARTED_EVENT: 'sponsorOnlyModeStartedEvent',
  SPONSOR_ONLY_MODE_ENDED_EVENT: 'sponsorOnlyModeEndedEvent',
  NEW_SPONSOR_EVENT: 'newSponsorEvent',
  USER_BANNED_EVENT: 'userBannedEvent',
  SUPER_CHAT_EVENT: 'superChatEvent',
  SUPER_STICKER_EVENT: 'superStickerEvent',
  MEMBER_MILESTONE_CHAT_EVENT: 'memberMilestoneChatEvent',
  MEMBERSHIP_GIFTING_EVENT: 'membershipGiftingEvent',
  GIFT_MEMBERSHIP_RECEIVED_EVENT: 'giftMembershipReceivedEvent',
  POLL_EVENT: 'pollEvent',
  GIFT_EVENT: 'giftEvent',
})

function metadataValue(error, key) {
  const value = error?.metadata?.get?.(key)?.[0]
  if (Buffer.isBuffer(value)) return value.toString('utf8')
  return value === undefined ? null : String(value)
}

function metadataPresent(error, key) {
  return Boolean(error?.metadata?.get?.(key)?.length)
}

function readRetryHint(error) {
  const retryAfter = parseRetryAfter(metadataValue(error, 'retry-after'))
  if (retryAfter !== null) return { retryAfterMs: retryAfter, retryHintSource: 'retry-after' }
  const retryAfterMsValue = metadataValue(error, 'retry-after-ms') ?? metadataValue(error, 'x-retry-after-ms')
  const retryAfterMs = retryAfterMsValue === null ? null : Number(retryAfterMsValue)
  if (retryAfterMs !== null && Number.isFinite(retryAfterMs) && retryAfterMs >= 0) {
    return { retryAfterMs: Math.round(retryAfterMs), retryHintSource: 'retry-after-ms' }
  }
  return {
    retryAfterMs: null,
    retryHintSource: null,
    richRetryHintPresent: metadataPresent(error, 'grpc-status-details-bin') || metadataPresent(error, 'google.rpc.retryinfo-bin'),
  }
}

export function mapStreamListError(error) {
  if (error instanceof AppError) return error
  const details = String(error?.details || error?.message || '')
  const retryHint = readRetryHint(error)
  const quotaExhausted = /quotaExceeded|dailyLimitExceeded/i.test(details)

  if (quotaExhausted) {
    return new AppError(429, 'youtube_quota_exhausted', 'The YouTube API quota is currently exhausted. Automatic live chat streaming is paused.', {
      retryable: false,
      retryAfterMs: retryHint.retryAfterMs ?? 24 * 60 * 60 * 1000,
      rateLimitKind: 'quota',
      retryHintSource: retryHint.retryHintSource,
      richRetryHintPresent: retryHint.richRetryHintPresent,
    })
  }
  if (error?.code === grpc.status.RESOURCE_EXHAUSTED || /rateLimitExceeded/i.test(details)) {
    return new AppError(429, 'youtube_rate_limited', 'YouTube is temporarily rate limiting the live chat stream.', {
      retryable: true,
      retryAfterMs: retryHint.retryAfterMs ?? DEFAULT_RATE_LIMIT_RETRY_MS,
      rateLimitKind: 'rate',
      retryHintSource: retryHint.retryHintSource,
      richRetryHintPresent: retryHint.richRetryHintPresent,
    })
  }
  if (error?.code === grpc.status.UNAUTHENTICATED) {
    return new AppError(401, 'authentication_required', 'The YouTube connection is no longer valid.')
  }
  if (/LIVE_CHAT_ENDED|liveChatEnded/i.test(details)) {
    return new AppError(410, 'chat_ended', 'This live chat has ended.')
  }
  if (error?.code === grpc.status.NOT_FOUND || /liveChatNotFound/i.test(details)) {
    return new AppError(404, 'chat_unavailable', 'The live chat is not available.')
  }
  if (error?.code === grpc.status.PERMISSION_DENIED) {
    return new AppError(403, 'insufficient_permission', 'The connected account does not have sufficient YouTube permission.')
  }
  if (error?.code === grpc.status.CANCELLED) {
    return new AppError(502, 'youtube_stream_cancelled', 'The YouTube live chat stream was cancelled.', { retryable: true })
  }
  if (error?.code === grpc.status.DEADLINE_EXCEEDED) {
    return new AppError(504, 'youtube_stream_deadline_exceeded', 'The YouTube live chat stream deadline was exceeded.', { retryable: true })
  }
  if (error?.code === grpc.status.UNAVAILABLE) {
    return new AppError(503, 'youtube_stream_unavailable', 'The YouTube live chat stream is temporarily unavailable.', { retryable: true })
  }
  return new AppError(502, 'youtube_stream_interrupted', 'The YouTube live chat stream was interrupted.', { retryable: true })
}

export function normalizeStreamListItem(item) {
  const snippet = item?.snippet || {}
  const type = STREAM_MESSAGE_TYPES[snippet.type] || 'unknownEvent'
  const authorDetails = item?.authorDetails || {}
  if (type === 'tombstone') {
    return {
      id: `stream-delete:${item.id}:${snippet.publishedAt || ''}`,
      snippet: {
        type: 'messageDeletedEvent',
        publishedAt: snippet.publishedAt || null,
        messageDeletedDetails: { deletedMessageId: item.id || null },
      },
      authorDetails,
    }
  }
  return {
    id: item?.id || null,
    snippet: {
      type,
      liveChatId: snippet.liveChatId || null,
      authorChannelId: snippet.authorChannelId || null,
      publishedAt: snippet.publishedAt || null,
      hasDisplayContent: Boolean(snippet.hasDisplayContent),
      displayMessage: snippet.displayMessage || '',
      textMessageDetails: snippet.textMessageDetails
        ? { messageText: snippet.textMessageDetails.messageText || '' }
        : undefined,
    },
    authorDetails: {
      channelId: authorDetails.channelId || null,
      channelUrl: authorDetails.channelUrl || null,
      displayName: authorDetails.displayName || null,
      profileImageUrl: authorDetails.profileImageUrl || null,
      isVerified: Boolean(authorDetails.isVerified),
      isChatOwner: Boolean(authorDetails.isChatOwner),
      isChatSponsor: Boolean(authorDetails.isChatSponsor),
      isChatModerator: Boolean(authorDetails.isChatModerator),
    },
  }
}

export function normalizeStreamListResponse(response) {
  const items = response?.items || []
  const pollingIntervalMillis = Number(response?.pollingIntervalMillis)
  return {
    messages: items.map(normalizeStreamListItem),
    nextPageToken: response?.nextPageToken || null,
    pollingIntervalMillis: Number.isFinite(pollingIntervalMillis) && pollingIntervalMillis > 0
      ? Math.min(60_000, Math.max(1_000, Math.round(pollingIntervalMillis)))
      : null,
    offlineAt: response?.offlineAt || null,
    ended: items.some((item) => item?.snippet?.type === 'CHAT_ENDED_EVENT'),
  }
}

export function createYouTubeLiveChatStreamTransport({
  address = 'youtube.googleapis.com:443',
  credentials = grpc.credentials.createSsl(),
} = {}) {
  const client = new streamPackage.V3DataLiveChatMessageService(address, credentials)

  async function open({ auth, liveChatId, pageToken }) {
    const accessToken = await auth.getAccessToken()
    if (!accessToken?.token) throw new AppError(401, 'authentication_required', 'The YouTube connection is no longer valid.')
    const metadata = new grpc.Metadata()
    metadata.set('authorization', `Bearer ${accessToken.token}`)
    return client.streamList({
      liveChatId,
      part: ['snippet', 'authorDetails'],
      profileImageSize: 88,
      ...(pageToken ? { pageToken } : {}),
    }, metadata)
  }

  function close() {
    client.close()
  }

  return Object.freeze({ open, close })
}

