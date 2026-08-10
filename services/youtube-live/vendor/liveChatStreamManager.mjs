import { createHash } from 'node:crypto'

import { logger } from './logger.mjs'
import { mapYouTubeError, normalizeLiveChatMessage } from './youtube.mjs'
import { mapStreamListError, normalizeStreamListResponse } from './youtubeLiveChatStream.mjs'

export const MAX_STREAM_CHATS = 4
export const MAX_STREAM_MESSAGES = 500
export const MAX_STREAM_ERRORS = 20
export const STREAM_CLIENT_ACTIVE_MS = 10_000
export const STREAM_IDLE_GRACE_MS = 30_000
export const STREAM_CACHE_POLL_MS = 2_000
export const STREAM_CONTINUATION_FALLBACK_MS = 1_000
export const STREAM_CONTINUATION_EOS_WINDOW_MS = 60_000
export const STREAM_CONTINUATION_SUSPICIOUS_MAX_MS = 5_000
export const STREAM_CONTINUATION_CIRCUIT_THRESHOLD = 5
export const STREAM_CONTINUATION_CIRCUIT_BASE_MS = 2_000
export const STREAM_CONTINUATION_CIRCUIT_MAX_MS = 15_000
export const STREAM_STABLE_CONNECTION_MS = 5 * 60_000
export const STREAM_STABLE_RESPONSE_COUNT = 2

export const STREAM_LIFECYCLE_STATE = Object.freeze({
  IDLE: 'idle',
  CONNECTING: 'connecting',
  LIVE: 'live',
  WAITING_FOR_CONTINUATION: 'waiting_for_continuation',
  WAITING_FOR_NETWORK_RETRY: 'waiting_for_network_retry',
  RATE_LIMITED: 'rate_limited',
  QUOTA_PAUSED: 'quota_paused',
  ENDED: 'ended',
  STOPPING: 'stopping',
  AUTHENTICATION_REQUIRED: 'authentication_required',
})

const TIMER_START_OPERATIONS = Object.freeze({
  continuation: 'continuation_timer',
  network: 'network_retry_timer',
  rateLimit: 'rate_limit_timer',
})

const PUBLIC_STREAM_STATUS = Object.freeze({
  [STREAM_LIFECYCLE_STATE.RATE_LIMITED]: 'rate-limited',
  [STREAM_LIFECYCLE_STATE.QUOTA_PAUSED]: 'quota-paused',
  [STREAM_LIFECYCLE_STATE.AUTHENTICATION_REQUIRED]: 'authentication-required',
  [STREAM_LIFECYCLE_STATE.WAITING_FOR_CONTINUATION]: 'live',
  [STREAM_LIFECYCLE_STATE.WAITING_FOR_NETWORK_RETRY]: 'reconnecting',
})

export function safeLiveChatReference(liveChatId) {
  return createHash('sha256').update(String(liveChatId || '')).digest('hex').slice(0, 12)
}

function safeError(error, now) {
  return {
    code: error?.code || 'youtube_stream_interrupted',
    status: Number(error?.status) || 502,
    observedAt: new Date(now).toISOString(),
  }
}

function retryDelay(attempt, baseDelay, maximumDelay) {
  return Math.min(maximumDelay, baseDelay * (2 ** Math.min(Math.max(0, attempt - 1), 6)))
}

export function createLiveChatStreamManager({
  openStream,
  closeTransport = () => {},
  onRateLimit = () => {},
  onRateLimitCleared = () => {},
  readRateLimitGuard = null,
  now = Date.now,
  setTimer = setTimeout,
  clearTimer = clearTimeout,
  maximumChats = MAX_STREAM_CHATS,
  maximumMessages = MAX_STREAM_MESSAGES,
  maximumErrors = MAX_STREAM_ERRORS,
  clientActiveMs = STREAM_CLIENT_ACTIVE_MS,
  idleGraceMs = STREAM_IDLE_GRACE_MS,
  reconnectBaseMs = 1_000,
  reconnectMaximumMs = 60_000,
  continuationFallbackMs = STREAM_CONTINUATION_FALLBACK_MS,
  continuationEosWindowMs = STREAM_CONTINUATION_EOS_WINDOW_MS,
  continuationSuspiciousMaximumMs = STREAM_CONTINUATION_SUSPICIOUS_MAX_MS,
  continuationCircuitThreshold = STREAM_CONTINUATION_CIRCUIT_THRESHOLD,
  continuationCircuitBaseMs = STREAM_CONTINUATION_CIRCUIT_BASE_MS,
  continuationCircuitMaximumMs = STREAM_CONTINUATION_CIRCUIT_MAX_MS,
  stableConnectionMs = STREAM_STABLE_CONNECTION_MS,
  stableResponseCount = STREAM_STABLE_RESPONSE_COUNT,
  diagnosticLogger = logger,
} = {}) {
  if (typeof openStream !== 'function') throw new TypeError('openStream is required')
  const chats = new Map()
  let stopped = false

  function setLifecycleState(chat, lifecycleState) {
    if (chat.lifecycleState === lifecycleState) return
    chat.lifecycleState = lifecycleState
    chat.statusHistory.push({ status: lifecycleState, observedAt: new Date(now()).toISOString() })
    while (chat.statusHistory.length > maximumErrors) chat.statusHistory.shift()
  }

  function cancelTimer(chat, key) {
    if (chat[key]) clearTimer(chat[key])
    chat[key] = null
  }

  function cancelReconnectTimer(chat) {
    cancelTimer(chat, 'reconnectTimer')
    chat.reconnectGeneration += 1
    chat.scheduledRetryAt = null
    chat.scheduledRetryKind = null
  }

  function activeStreamCounts(chat) {
    return {
      activeStreamsForChat: Number(Boolean(chat.stream || chat.connectPromise)),
      totalActiveStreams: [...chats.values()].filter((entry) => Boolean(entry.stream || entry.connectPromise)).length,
    }
  }

  function streamLog(level, message, chat, details = {}) {
    diagnosticLogger[level](message, {
      chatRef: safeLiveChatReference(chat.liveChatId),
      ...activeStreamCounts(chat),
      ...details,
    })
  }

  function stopConnection(chat, status = 'idle', reason = 'manager-stop') {
    chat.generation += 1
    cancelReconnectTimer(chat)
    setLifecycleState(chat, STREAM_LIFECYCLE_STATE.STOPPING)
    if (chat.stream) {
      streamLog('info', 'YouTube live chat stream cancelled', chat, {
        reason,
        batchCount: chat.connectionBatchCount,
      })
      chat.stream.cancel()
      chat.stream = null
    }
    chat.connectPromise = null
    chat.connectionOpenedAt = null
    setLifecycleState(chat, status)
  }

  function removeChat(liveChatId, reason = 'chat-removed') {
    const chat = chats.get(liveChatId)
    if (!chat) return
    cancelTimer(chat, 'idleTimer')
    stopConnection(chat, 'idle', reason)
    chats.delete(liveChatId)
  }

  function enforceChatLimit() {
    while (chats.size > maximumChats) {
      const oldest = [...chats.values()].sort((a, b) => a.lastClientActivity - b.lastClientActivity)[0]
      removeChat(oldest.liveChatId, 'chat-limit')
    }
  }

  function createChat(liveChatId) {
    const chat = {
      liveChatId,
      messages: new Map(),
      clients: new Map(),
      lifecycleState: STREAM_LIFECYCLE_STATE.IDLE,
      stream: null,
      connectPromise: null,
      reconnectTimer: null,
      reconnectGeneration: 0,
      scheduledRetryAt: null,
      scheduledRetryKind: null,
      idleTimer: null,
      generation: 0,
      pageToken: null,
      lastSuccessfulAt: null,
      lastClientActivity: now(),
      lastError: null,
      errorHistory: [],
      statusHistory: [{ status: 'idle', observedAt: new Date(now()).toISOString() }],
      reconnectAttempt: 0,
      continuationAttempt: 0,
      rateLimit: null,
      endedAt: null,
      connectionCount: 0,
      connectionBatchCount: 0,
      connectionNewItemCount: 0,
      connectionOpenedAt: null,
      serverPollingIntervalMs: null,
      eosWindow: [],
      consecutiveSuspiciousEos: 0,
      continuationCircuitBreakerActive: false,
    }
    chats.set(liveChatId, chat)
    enforceChatLimit()
    return chat
  }

  function getChat(liveChatId, create = false) {
    return chats.get(liveChatId) || (create ? createChat(liveChatId) : null)
  }

  function activeClientCount(chat) {
    const activeAfter = now() - clientActiveMs
    for (const [clientId, seenAt] of chat.clients) {
      if (seenAt < activeAfter) chat.clients.delete(clientId)
    }
    return chat.clients.size
  }

  function scheduleIdleStop(chat) {
    cancelTimer(chat, 'idleTimer')
    chat.idleTimer = setTimer(() => {
      chat.idleTimer = null
      if (now() - chat.lastClientActivity < idleGraceMs) {
        scheduleIdleStop(chat)
        return
      }
      chat.clients.clear()
      stopConnection(chat, 'idle', 'idle-grace-expired')
    }, idleGraceMs)
  }

  function rememberError(chat, error) {
    const entry = safeError(error, now())
    chat.lastError = entry
    chat.errorHistory.push(entry)
    while (chat.errorHistory.length > maximumErrors) chat.errorHistory.shift()
  }

  function scheduleReconnect(chat, {
    kind = 'network',
    minimumDelayMs = 0,
    continuationDelayMs = null,
    continuationDiagnostics = {},
  } = {}) {
    if (
      stopped
      || chat.stream
      || chat.connectPromise
      || chat.reconnectTimer
      || chat.lifecycleState === STREAM_LIFECYCLE_STATE.ENDED
      || chat.lifecycleState === STREAM_LIFECYCLE_STATE.QUOTA_PAUSED
    ) return
    const attempt = kind === 'continuation' ? chat.continuationAttempt : chat.reconnectAttempt
    const delay = chat.rateLimit
      ? Math.max(0, chat.rateLimit.retryAt - now())
      : kind === 'continuation' && Number.isFinite(continuationDelayMs)
        ? Math.max(0, continuationDelayMs)
        : Math.max(minimumDelayMs, retryDelay(attempt, reconnectBaseMs, reconnectMaximumMs))
    const retryKind = chat.rateLimit ? 'rateLimit' : kind
    const lifecycleState = retryKind === 'continuation'
      ? STREAM_LIFECYCLE_STATE.WAITING_FOR_CONTINUATION
      : retryKind === 'rateLimit'
        ? STREAM_LIFECYCLE_STATE.RATE_LIMITED
        : STREAM_LIFECYCLE_STATE.WAITING_FOR_NETWORK_RETRY
    setLifecycleState(chat, lifecycleState)
    const reconnectGeneration = ++chat.reconnectGeneration
    chat.scheduledRetryAt = now() + delay
    chat.scheduledRetryKind = retryKind
    streamLog('warn', 'YouTube live chat stream reconnect scheduled', chat, {
      reconnectAttempt: chat.reconnectAttempt,
      continuationAttempt: chat.continuationAttempt,
      reconnectKind: retryKind === 'rateLimit' ? 'rate-limit' : retryKind,
      retryAfterMs: delay,
      rateLimitKind: chat.rateLimit?.kind || null,
      ...(retryKind === 'continuation' ? {
        continuationDelayMs: delay,
        lifecycleState: chat.lifecycleState,
        ...continuationDiagnostics,
      } : {}),
    })
    chat.reconnectTimer = setTimer(() => {
      if (reconnectGeneration !== chat.reconnectGeneration) return
      chat.reconnectTimer = null
      if (
        stopped
        || chat.stream
        || chat.connectPromise
        || chat.scheduledRetryKind !== retryKind
        || chat.lifecycleState !== lifecycleState
      ) return
      chat.scheduledRetryAt = null
      chat.scheduledRetryKind = null
      streamLog('info', 'YouTube live chat stream reconnect attempt', chat, {
        reconnectAttempt: chat.reconnectAttempt,
        continuationAttempt: chat.continuationAttempt,
        reconnectKind: retryKind === 'rateLimit' ? 'rate-limit' : retryKind,
      })
      connect(chat, {
        operation: TIMER_START_OPERATIONS[retryKind],
        reconnectGeneration,
      })
    }, delay)
  }

  function resetAttemptsAfterStableConnection(chat) {
    if (
      chat.connectionOpenedAt === null
      || chat.connectionBatchCount < stableResponseCount
      || now() - chat.connectionOpenedAt < stableConnectionMs
    ) return
    chat.reconnectAttempt = 0
    chat.continuationAttempt = 0
    readRateLimitGuard?.resetHistory(chat.liveChatId)
  }

  function handleDisconnect(chat, generation, rawError) {
    if (generation !== chat.generation || stopped) return
    resetAttemptsAfterStableConnection(chat)
    chat.stream = null
    chat.connectPromise = null
    chat.connectionOpenedAt = null
    let error = rawError ? mapStreamListError(rawError) : mapYouTubeError({ response: { status: 502 } })
    if (error.status === 429 && error.rateLimitKind) error = onRateLimit(error, chat.liveChatId) || error
    else readRateLimitGuard?.releaseProbe('stream', chat.liveChatId)
    rememberError(chat, error)
    streamLog(error.status === 429 ? 'warn' : 'error', 'YouTube live chat stream upstream failure', chat, {
      grpcStatus: Number.isInteger(rawError?.code) ? rawError.code : null,
      normalizedError: error.code,
      rateLimitKind: error.rateLimitKind || null,
      retryAfterMs: error.retryAfterMs ?? null,
      retryHintSource: error.retryHintSource || null,
      richRetryHintPresent: Boolean(error.richRetryHintPresent),
      backoffLevel: error.backoffLevel || 0,
      blockerSource: 'new-upstream-error',
    })

    if (['chat_ended', 'chat_unavailable'].includes(error.code)) {
      setLifecycleState(chat, STREAM_LIFECYCLE_STATE.ENDED)
      chat.endedAt = new Date(now()).toISOString()
      return
    }
    if (['authentication_required', 'token_refresh_failed', 'insufficient_permission'].includes(error.code)) {
      setLifecycleState(chat, STREAM_LIFECYCLE_STATE.AUTHENTICATION_REQUIRED)
      return
    }
    if (error.status === 429 && error.rateLimitKind) {
      chat.rateLimit = {
        kind: error.rateLimitKind,
        retryAt: now() + Math.max(0, error.retryAfterMs || 0),
        autoRetry: error.rateLimitKind === 'rate',
      }
      setLifecycleState(chat, error.rateLimitKind === 'quota'
        ? STREAM_LIFECYCLE_STATE.QUOTA_PAUSED
        : STREAM_LIFECYCLE_STATE.RATE_LIMITED)
      if (chat.rateLimit.autoRetry) scheduleReconnect(chat)
      return
    }

    chat.reconnectAttempt += 1
    setLifecycleState(chat, STREAM_LIFECYCLE_STATE.WAITING_FOR_NETWORK_RETRY)
    scheduleReconnect(chat)
  }

  function handleNormalEnd(chat, generation) {
    if (generation !== chat.generation || stopped) return
    const endedAt = now()
    const connectionDurationMs = chat.connectionOpenedAt === null ? 0 : Math.max(0, endedAt - chat.connectionOpenedAt)
    const successfulBatchReceived = chat.connectionBatchCount > 0
    const validContinuation = Boolean(chat.pageToken)
    const progressDetected = successfulBatchReceived && chat.connectionNewItemCount > 0
    resetAttemptsAfterStableConnection(chat)
    chat.stream = null
    chat.connectPromise = null
    chat.connectionOpenedAt = null
    readRateLimitGuard?.releaseProbe('stream', chat.liveChatId)
    streamLog('info', 'YouTube live chat stream ended normally', chat, {
      batchCount: chat.connectionBatchCount,
      continuationPresent: Boolean(chat.pageToken),
      serverPollingIntervalMs: chat.serverPollingIntervalMs,
    })
    chat.eosWindow = chat.eosWindow
      .filter((entry) => endedAt - entry.endedAt <= continuationEosWindowMs)
      .slice(-(Math.max(continuationCircuitThreshold * 4, 20) - 1))
    const suspiciousEos = validContinuation
      && successfulBatchReceived
      && connectionDurationMs < continuationSuspiciousMaximumMs
      && !progressDetected
    const previousEos = chat.eosWindow.at(-1)
    chat.eosWindow.push({
      endedAt,
      connectionDurationMs,
      progressDetected,
      suspiciousEos,
    })
    chat.consecutiveSuspiciousEos = suspiciousEos
      ? previousEos?.suspiciousEos ? chat.consecutiveSuspiciousEos + 1 : 1
      : 0
    const suspiciousEosWindowCount = chat.eosWindow.filter((entry) => entry.suspiciousEos).length
    chat.continuationCircuitBreakerActive = suspiciousEos
      && chat.consecutiveSuspiciousEos >= continuationCircuitThreshold
      && suspiciousEosWindowCount >= continuationCircuitThreshold

    if (!validContinuation || !successfulBatchReceived) {
      chat.reconnectAttempt += 1
      setLifecycleState(chat, STREAM_LIFECYCLE_STATE.WAITING_FOR_NETWORK_RETRY)
      scheduleReconnect(chat)
      return
    }

    chat.continuationAttempt += 1
    const hintedDelay = Number(chat.serverPollingIntervalMs)
    const delaySource = Number.isFinite(hintedDelay) && hintedDelay > 0 ? 'server-hint' : 'fallback'
    const normalDelay = delaySource === 'server-hint' ? hintedDelay : continuationFallbackMs
    const circuitLevel = Math.max(0, chat.consecutiveSuspiciousEos - continuationCircuitThreshold)
    const defensiveDelay = Math.min(
      continuationCircuitMaximumMs,
      continuationCircuitBaseMs * (2 ** Math.min(circuitLevel, 6)),
    )
    const continuationDelayMs = chat.continuationCircuitBreakerActive
      ? Math.max(normalDelay, defensiveDelay)
      : normalDelay
    setLifecycleState(chat, STREAM_LIFECYCLE_STATE.WAITING_FOR_CONTINUATION)
    scheduleReconnect(chat, {
      kind: 'continuation',
      continuationDelayMs,
      continuationDiagnostics: {
        delaySource,
        progressDetected,
        eosWindowCount: chat.eosWindow.length,
        circuitBreakerActive: chat.continuationCircuitBreakerActive,
      },
    })
  }

  function handleData(chat, generation, response) {
    if (generation !== chat.generation || stopped) return
    const normalized = normalizeStreamListResponse(response)
    chat.connectionBatchCount += 1
    if (chat.connectionBatchCount === 1) {
      streamLog('info', 'YouTube live chat stream first response received', chat, {
        batchCount: chat.connectionBatchCount,
        itemCount: normalized.messages.length,
        continuationPresent: Boolean(normalized.nextPageToken),
      })
    } else {
      streamLog('info', 'YouTube live chat stream response batch received', chat, {
        batchCount: chat.connectionBatchCount,
        itemCount: normalized.messages.length,
        continuationPresent: Boolean(normalized.nextPageToken),
      })
    }
    if (normalized.pollingIntervalMillis) chat.serverPollingIntervalMs = normalized.pollingIntervalMillis
    resetAttemptsAfterStableConnection(chat)
    for (const item of normalized.messages) {
      if (item?.snippet?.type === 'chatEndedEvent') continue
      const message = normalizeLiveChatMessage(item)
      if (!message.id) continue
      if (!chat.messages.has(message.id)) chat.connectionNewItemCount += 1
      chat.messages.set(message.id, message)
    }
    while (chat.messages.size > maximumMessages) chat.messages.delete(chat.messages.keys().next().value)
    chat.pageToken = normalized.nextPageToken || chat.pageToken
    chat.lastSuccessfulAt = new Date(now()).toISOString()
    chat.lastError = null
    chat.rateLimit = null
    readRateLimitGuard?.clearAfterSuccess(chat.liveChatId)
    setLifecycleState(chat, STREAM_LIFECYCLE_STATE.LIVE)
    onRateLimitCleared(chat.liveChatId)
    if (normalized.ended || normalized.offlineAt) {
      chat.endedAt = normalized.offlineAt || chat.lastSuccessfulAt
      stopConnection(chat, 'ended', 'chat-ended')
    }
  }

  function attachStream(chat, stream, generation) {
    if (generation !== chat.generation || stopped) {
      stream.cancel()
      return
    }
    chat.stream = stream
    chat.connectionCount += 1
    chat.connectionBatchCount = 0
    chat.connectionNewItemCount = 0
    chat.connectionOpenedAt = now()
    streamLog('info', 'YouTube live chat stream connection opened', chat, {
      connectionCount: chat.connectionCount,
      reconnectAttempt: chat.reconnectAttempt,
      continuationAttempt: chat.continuationAttempt,
      eosWindowCount: chat.eosWindow.length,
      continuationCircuitBreakerActive: chat.continuationCircuitBreakerActive,
    })
    let disconnected = false
    const disconnectOnce = (error) => {
      if (disconnected) return
      disconnected = true
      handleDisconnect(chat, generation, error)
    }
    stream.on('data', (response) => handleData(chat, generation, response))
    stream.on('error', disconnectOnce)
    stream.on('end', () => {
      if (disconnected) return
      disconnected = true
      handleNormalEnd(chat, generation)
    })
  }

  function logBlockedStart(chat, blockedOperation) {
    streamLog('info', 'YouTube live chat stream start blocked by lifecycle state', chat, {
      blockedOperation,
      lifecycleState: chat.lifecycleState,
      scheduledRetryAt: chat.scheduledRetryAt === null ? null : new Date(chat.scheduledRetryAt).toISOString(),
    })
  }

  function isStartAllowed(chat, operation, reconnectGeneration) {
    if (chat.lifecycleState === STREAM_LIFECYCLE_STATE.IDLE) return true
    if (operation === 'manual_probe') {
      return [STREAM_LIFECYCLE_STATE.RATE_LIMITED, STREAM_LIFECYCLE_STATE.QUOTA_PAUSED].includes(chat.lifecycleState)
    }
    if (
      operation === 'cache_poll'
      && chat.lifecycleState === STREAM_LIFECYCLE_STATE.RATE_LIMITED
      && chat.rateLimit?.autoRetry
      && now() >= chat.rateLimit.retryAt
    ) return true
    const expectedState = {
      continuation_timer: STREAM_LIFECYCLE_STATE.WAITING_FOR_CONTINUATION,
      network_retry_timer: STREAM_LIFECYCLE_STATE.WAITING_FOR_NETWORK_RETRY,
      rate_limit_timer: STREAM_LIFECYCLE_STATE.RATE_LIMITED,
    }[operation]
    return Boolean(
      expectedState
      && chat.lifecycleState === expectedState
      && reconnectGeneration === chat.reconnectGeneration,
    )
  }

  function connect(chat, { manual = false, operation = 'ensure_active', reconnectGeneration = null } = {}) {
    if (stopped) return null
    if (chat.stream || chat.connectPromise || !isStartAllowed(chat, operation, reconnectGeneration)) {
      logBlockedStart(chat, operation)
      return chat.connectPromise
    }
    if (chat.rateLimit) {
      if (now() < chat.rateLimit.retryAt || (!chat.rateLimit.autoRetry && !manual)) {
        logBlockedStart(chat, operation)
        return null
      }
    }
    if (readRateLimitGuard && !readRateLimitGuard.acquire('stream', chat.liveChatId, { manual })) {
      const sharedLimit = readRateLimitGuard.snapshot()
      if (sharedLimit) {
        chat.rateLimit = {
          kind: sharedLimit.kind,
          retryAt: sharedLimit.retryAt,
          autoRetry: sharedLimit.autoRetry,
          backoffLevel: sharedLimit.backoffLevel,
        }
        setLifecycleState(chat, sharedLimit.kind === 'quota'
          ? STREAM_LIFECYCLE_STATE.QUOTA_PAUSED
          : STREAM_LIFECYCLE_STATE.RATE_LIMITED)
      }
      return null
    }
    chat.rateLimit = null
    cancelReconnectTimer(chat)
    const generation = ++chat.generation
    setLifecycleState(chat, STREAM_LIFECYCLE_STATE.CONNECTING)
    streamLog('info', 'YouTube live chat stream connection requested', chat, {
      reconnectAttempt: chat.reconnectAttempt,
      continuationPresent: Boolean(chat.pageToken),
    })
    const connection = Promise.resolve(openStream({
      liveChatId: chat.liveChatId,
      pageToken: chat.pageToken,
    }))
    chat.connectPromise = connection
    connection.then((stream) => {
      if (generation !== chat.generation || stopped) {
        streamLog('info', 'YouTube live chat stream cancelled', chat, {
          reason: stopped ? 'manager-stopped-before-open' : 'superseded-before-open',
          batchCount: 0,
        })
        stream.cancel()
        return
      }
      chat.connectPromise = null
      attachStream(chat, stream, generation)
    }).catch((error) => {
      if (generation !== chat.generation || stopped) return
      chat.connectPromise = null
      handleDisconnect(chat, generation, error)
    })
    return connection
  }

  function touch({ liveChatId, clientId, manualRetry = false, operation } = {}) {
    if (stopped) throw new Error('Live chat stream manager is stopped')
    const existingChat = getChat(liveChatId)
    const chat = existingChat || getChat(liveChatId, true)
    const timestamp = now()
    chat.clients.set(clientId, timestamp)
    chat.lastClientActivity = timestamp
    scheduleIdleStop(chat)
    connect(chat, {
      manual: manualRetry,
      operation: manualRetry ? 'manual_probe' : operation || (existingChat ? 'cache_poll' : 'first_client'),
    })
    return snapshot(chat)
  }

  function release(liveChatId, clientId) {
    const chat = getChat(liveChatId)
    if (!chat) return
    chat.clients.delete(clientId)
  }

  function snapshot(chatOrId) {
    const chat = typeof chatOrId === 'string' ? getChat(chatOrId) : chatOrId
    if (!chat) return null
    const sharedRateLimit = readRateLimitGuard?.snapshot()
    const effectiveRateLimit = sharedRateLimit || chat.rateLimit
    const rateLimit = effectiveRateLimit ? {
      kind: effectiveRateLimit.kind,
      retryAfterMs: sharedRateLimit
        ? sharedRateLimit.retryAfterMs
        : Math.max(0, effectiveRateLimit.retryAt - now()),
      autoRetry: effectiveRateLimit.autoRetry,
      backoffLevel: effectiveRateLimit.backoffLevel || 0,
    } : null
    return {
      messages: [...chat.messages.values()]
        .sort((a, b) => String(a.publishedAt || '').localeCompare(String(b.publishedAt || '')))
        .map((message) => structuredClone(message)),
      nextPageToken: chat.pageToken,
      pollingIntervalMillis: STREAM_CACHE_POLL_MS,
      offlineAt: chat.endedAt,
      streamStatus: PUBLIC_STREAM_STATUS[chat.lifecycleState] || chat.lifecycleState,
      lifecycleState: chat.lifecycleState,
      scheduledRetryAt: chat.scheduledRetryAt === null ? null : new Date(chat.scheduledRetryAt).toISOString(),
      lastSuccessfulAt: chat.lastSuccessfulAt,
      lastError: chat.lastError ? { ...chat.lastError } : null,
      reconnectAttempt: chat.reconnectAttempt,
      continuationAttempt: chat.continuationAttempt,
      eosWindowCount: chat.eosWindow.length,
      continuationCircuitBreakerActive: chat.continuationCircuitBreakerActive,
      rateLimit,
      activeClients: activeClientCount(chat),
      connectionCount: chat.connectionCount,
      transport: 'streamList',
    }
  }

  function stats() {
    return {
      chats: chats.size,
      activeStreams: [...chats.values()].filter((chat) => Boolean(chat.stream || chat.connectPromise)).length,
      reconnectTimers: [...chats.values()].filter((chat) => Boolean(chat.reconnectTimer)).length,
      messageCount: [...chats.values()].reduce((sum, chat) => sum + chat.messages.size, 0),
      errorHistoryCount: [...chats.values()].reduce((sum, chat) => sum + chat.errorHistory.length, 0),
      statusHistoryCount: [...chats.values()].reduce((sum, chat) => sum + chat.statusHistory.length, 0),
    }
  }

  function stopAll() {
    if (stopped) return
    stopped = true
    for (const liveChatId of [...chats.keys()]) removeChat(liveChatId, 'server-shutdown')
    closeTransport()
  }

  return Object.freeze({ touch, release, snapshot, stats, stopAll })
}

