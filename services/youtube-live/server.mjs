import { createHmac, timingSafeEqual } from 'node:crypto'
import { createServer } from 'node:http'

import { google } from 'googleapis'

import { loadYouTubeLiveConfiguration, validateYouTubeLiveConfiguration } from './config.mjs'

import { AppError } from './vendor/errors.mjs'
import { logger } from './vendor/logger.mjs'
import { createLiveChatModerationState } from './vendor/liveChatModerationState.mjs'
import { createLiveChatStreamManager } from './vendor/liveChatStreamManager.mjs'
import { createYouTubeLiveChatStreamTransport } from './vendor/youtubeLiveChatStream.mjs'
import { createYouTubeReadRateLimitGuard } from './vendor/youtubeReadRateLimitGuard.mjs'
import { createYouTubeReadRateLimitStore } from './vendor/youtubeReadRateLimitStore.mjs'
import {
  LIVE_CHAT_MESSAGE_ID_PATTERN,
  LIVE_CHAT_TIMEOUT_DURATIONS,
  YOUTUBE_CHANNEL_ID_PATTERN,
  deleteLiveChatMessage,
  hideLiveChatUser,
  resolveActiveLiveChat,
  sendLiveChatMessage,
  timeoutLiveChatUser,
} from './vendor/youtube.mjs'

const config = await loadYouTubeLiveConfiguration()
const configurationErrors = validateYouTubeLiveConfiguration(config)
if (configurationErrors.length) throw new Error(configurationErrors.join('; '))
const { port, host, serviceSecret } = config

const oauth = new google.auth.OAuth2(config.googleClientId, config.googleClientSecret)
oauth.setCredentials(config.oauthTokens)
const youtube = google.youtube({ version: 'v3', auth: oauth })
const transport = createYouTubeLiveChatStreamTransport()
const rateLimitStore = createYouTubeReadRateLimitStore({ filePath: config.statePath })
const persistedRateLimit = await rateLimitStore.load()
const readRateLimitGuard = createYouTubeReadRateLimitGuard({ persistedState: persistedRateLimit, stateStore: rateLimitStore })
const moderationState = createLiveChatModerationState()
const manager = createLiveChatStreamManager({
  openStream: ({ liveChatId, pageToken }) => transport.open({ auth: oauth, liveChatId, pageToken }),
  closeTransport: () => transport.close(),
  onRateLimit: (error, liveChatId) => readRateLimitGuard.record(error, liveChatId, 'stream'),
  onRateLimitCleared: (liveChatId) => readRateLimitGuard.clearAfterSuccess(liveChatId),
  readRateLimitGuard,
})

const resolvedChats = new Map()
const inFlightResolves = new Map()
const actorChats = new Map()
const inFlightActions = new Set()

function actorState(actorId, liveChatId) {
  const key = `${actorId}:${liveChatId}`
  let state = actorChats.get(key)
  if (!state) { state = { eligibleMessages: new Set(), eligibleUsers: new Set(), hiddenUsers: new Set(), completedTimeouts: new Set(), touchedAt: Date.now() }; actorChats.set(key, state) }
  state.touchedAt = Date.now()
  for (const [candidate, value] of actorChats) if (value.touchedAt < Date.now() - 60 * 60_000) actorChats.delete(candidate)
  return state
}

function signatureFor(timestamp, method, requestPath, body) {
  return createHmac('sha256', serviceSecret).update(`${timestamp}.${method}.${requestPath}.${body}`).digest('hex')
}

function authenticate(request, requestPath, body) {
  const timestamp = request.headers['x-live-timestamp']; const signature = request.headers['x-live-signature']; const actorId = request.headers['x-live-actor']
  if (typeof timestamp !== 'string' || typeof signature !== 'string' || typeof actorId !== 'string' || !/^[0-9a-f-]{36}$/i.test(actorId)) throw new AppError(401, 'service_authentication_failed', 'Service authentication failed.')
  if (Math.abs(Date.now() - Number(timestamp)) > 30_000) throw new AppError(401, 'service_request_expired', 'Service request expired.')
  const expected = signatureFor(timestamp, request.method, requestPath, body); const supplied = Buffer.from(signature, 'hex'); const expectedBuffer = Buffer.from(expected, 'hex')
  if (supplied.length !== expectedBuffer.length || !timingSafeEqual(supplied, expectedBuffer)) throw new AppError(401, 'service_authentication_failed', 'Service authentication failed.')
  return actorId
}

async function resolveChat(videoId, manualRetry = false) {
  const cached = resolvedChats.get(videoId); const snapshot = cached && manager.snapshot(cached.liveChatId)
  if (cached && snapshot?.streamStatus !== 'ended') return cached
  if (!readRateLimitGuard.acquire('resolve', null, { manual: manualRetry })) throw readRateLimitGuard.asError()
  let promise = inFlightResolves.get(videoId)
  if (!promise) {
    promise = resolveActiveLiveChat(youtube, videoId)
    inFlightResolves.set(videoId, promise)
    promise.finally(() => inFlightResolves.delete(videoId)).catch(() => undefined)
  }
  try { const result = await promise; readRateLimitGuard.clearAfterSuccess(); resolvedChats.set(videoId, result); while (resolvedChats.size > 8) resolvedChats.delete(resolvedChats.keys().next().value); return result }
  catch (error) { const guarded = readRateLimitGuard.record(error, null, 'resolve'); if (guarded === error) readRateLimitGuard.releaseProbe('resolve'); throw guarded }
}

function observe(state, messages) {
  for (const message of messages) {
    if (message.deleteEligible) state.eligibleMessages.add(message.id)
    if (message.hideEligible && message.authorDetails?.channelId) state.eligibleUsers.add(message.authorDetails.channelId)
  }
  while (state.eligibleMessages.size > 1000) state.eligibleMessages.delete(state.eligibleMessages.values().next().value)
  while (state.eligibleUsers.size > 1000) state.eligibleUsers.delete(state.eligibleUsers.values().next().value)
}

async function chatResponse(actorId, url) {
  const videoId = url.searchParams.get('videoId') || ''; const chat = await resolveChat(videoId, url.searchParams.get('manualRetry') === 'true')
  const result = manager.touch({ liveChatId: chat.liveChatId, clientId: actorId, manualRetry: url.searchParams.get('manualRetry') === 'true' })
  const state = actorState(actorId, chat.liveChatId); observe(state, result.messages)
  return { ...chat, ...result, messages: result.messages.map((message) => state.hiddenUsers.has(message.authorDetails?.channelId) ? { ...message, hideEligible: false, userHidden: true } : message), sharedDeletionEvents: moderationState.listDeletionEvents(chat.liveChatId) }
}

async function performAction(actorId, input) {
  const chat = await resolveChat(String(input.videoId || '')); const state = actorState(actorId, chat.liveChatId); const actionKey = `${actorId}:${chat.liveChatId}:${input.action}:${input.messageId || input.channelId || 'send'}`
  if (inFlightActions.has(actionKey)) throw new AppError(409, 'action_in_progress', 'This action is already in progress.')
  inFlightActions.add(actionKey)
  try {
    if (input.action === 'delete') {
      if (!LIVE_CHAT_MESSAGE_ID_PATTERN.test(input.messageId || '') || !state.eligibleMessages.has(input.messageId)) throw new AppError(409, 'message_not_eligible', 'Only observed eligible messages can be deleted.')
      if (!moderationState.hasDeletion(chat.liveChatId, input.messageId)) { await deleteLiveChatMessage(youtube, input.messageId); moderationState.recordDeletion({ liveChatId: chat.liveChatId, messageId: input.messageId, moderator: { displayName: 'Website moderator' } }) }
      state.eligibleMessages.delete(input.messageId)
    } else if (input.action === 'hide') {
      if (!YOUTUBE_CHANNEL_ID_PATTERN.test(input.channelId || '') || !state.eligibleUsers.has(input.channelId) || state.hiddenUsers.has(input.channelId)) throw new AppError(409, 'user_not_eligible', 'Only observed, unprotected users can be hidden.')
      await hideLiveChatUser(youtube, chat.liveChatId, input.channelId); state.hiddenUsers.add(input.channelId); state.eligibleUsers.delete(input.channelId)
    } else if (input.action === 'timeout') {
      const duration = Number(input.durationSeconds); const timeoutKey = `${input.channelId}:${duration}`
      if (!YOUTUBE_CHANNEL_ID_PATTERN.test(input.channelId || '') || !state.eligibleUsers.has(input.channelId)) throw new AppError(409, 'user_not_eligible', 'Only observed, unprotected users can be timed out.')
      if (!LIVE_CHAT_TIMEOUT_DURATIONS.includes(duration) || state.completedTimeouts.has(timeoutKey)) throw new AppError(409, 'invalid_or_completed_timeout', 'Choose a supported timeout that has not already been applied.')
      await timeoutLiveChatUser(youtube, chat.liveChatId, input.channelId, duration); state.completedTimeouts.add(timeoutKey)
    } else if (input.action === 'send') await sendLiveChatMessage(youtube, chat.liveChatId, input.text)
    else throw new AppError(400, 'invalid_action', 'Unknown action.')
    return { ok: true, liveChatId: chat.liveChatId, title: chat.title }
  } finally { inFlightActions.delete(actionKey) }
}

function json(response, status, value) { const body = JSON.stringify(value); response.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'content-length': Buffer.byteLength(body), 'cache-control': 'no-store' }); response.end(body) }
async function bodyOf(request) { const chunks = []; for await (const chunk of request) chunks.push(chunk); const body = Buffer.concat(chunks).toString('utf8'); if (body.length > 16_384) throw new AppError(413, 'request_too_large', 'Request is too large.'); return body }

const server = createServer(async (request, response) => {
  const requestPath = request.url || '/'; let rawBody = ''
  try {
    if (request.method === 'GET' && requestPath === '/health') return json(response, 200, { ok: true, streamManager: manager.stats() })
    rawBody = request.method === 'POST' ? await bodyOf(request) : ''
    const actorId = authenticate(request, requestPath, rawBody); const url = new URL(requestPath, 'http://service.internal')
    if (request.method === 'GET' && url.pathname === '/chat') return json(response, 200, await chatResponse(actorId, url))
    if (request.method === 'POST' && url.pathname === '/action') return json(response, 200, await performAction(actorId, JSON.parse(rawBody || '{}')))
    if (request.method === 'DELETE' && url.pathname === '/client') { const liveChatId = url.searchParams.get('liveChatId'); if (liveChatId) manager.release(liveChatId, actorId); response.writeHead(204); return response.end() }
    return json(response, 404, { error: 'not_found' })
  } catch (error) {
    const status = Number(error?.status) || 502; logger.warn('YouTube moderation service request failed', { code: error?.code || 'service_error', status }); return json(response, status, { error: error?.code || 'youtube_service_error', message: error?.expose === false ? 'Request failed.' : error?.message || 'Request failed.', retryAfterMs: error?.retryAfterMs || null })
  }
})

server.listen(port, host, () => logger.info('YouTube moderation service listening', { host, port }))
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => { manager.stopAll(); server.close(() => process.exit(0)) })
