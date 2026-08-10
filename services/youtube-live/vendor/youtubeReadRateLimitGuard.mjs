import { AppError } from './errors.mjs'
import { logger } from './logger.mjs'
import { safeLiveChatReference } from './liveChatStreamManager.mjs'

export const DEFAULT_READ_RATE_LIMIT_BACKOFF_MS = 15 * 60 * 1000
export const MAX_READ_RATE_LIMIT_BACKOFF_MS = 60 * 60 * 1000
export const MINIMUM_UPSTREAM_RATE_LIMIT_RETRY_MS = 60 * 1000

function backoffDelay(level, baseDelay, maximumDelay) {
  return Math.min(maximumDelay, baseDelay * (2 ** Math.min(Math.max(0, level - 1), 6)))
}

export function createYouTubeReadRateLimitGuard({
  now = Date.now,
  diagnosticLogger = logger,
  baseBackoffMs = DEFAULT_READ_RATE_LIMIT_BACKOFF_MS,
  maximumBackoffMs = MAX_READ_RATE_LIMIT_BACKOFF_MS,
  minimumUpstreamRetryMs = MINIMUM_UPSTREAM_RATE_LIMIT_RETRY_MS,
  persistedState = null,
  stateStore = null,
} = {}) {
  const restoredRetryAt = Date.parse(persistedState?.nextAllowedRetryAt || '')
  const restoredKind = ['rate', 'quota'].includes(persistedState?.rateLimitKind) ? persistedState.rateLimitKind : null
  const restoredActive = Boolean(restoredKind && Number.isFinite(restoredRetryAt) && restoredRetryAt > now())
  let activeLimit = restoredActive ? {
    code: restoredKind === 'quota' ? 'youtube_quota_exhausted' : 'youtube_rate_limited',
    message: restoredKind === 'quota'
      ? 'The YouTube API quota is currently exhausted. Automatic live chat streaming is paused.'
      : 'YouTube is temporarily rate limiting the live chat stream.',
    kind: restoredKind,
    retryAt: restoredRetryAt,
    autoRetry: restoredKind === 'rate',
    liveChatId: null,
    retryHintSource: 'persisted-state',
  } : null
  let backoffLevel = Math.min(3, Math.max(0, Number.isInteger(persistedState?.backoffLevel) ? persistedState.backoffLevel : 0))
  let lastRateLimitAt = typeof persistedState?.lastRateLimitAt === 'string' ? persistedState.lastRateLimitAt : null
  let lastSuccessfulStableStreamAt = typeof persistedState?.lastSuccessfulStableStreamAt === 'string'
    ? persistedState.lastSuccessfulStableStreamAt
    : null
  let probe = null
  let persistenceQueue = Promise.resolve()

  function persistentState() {
    return {
      rateLimitKind: activeLimit?.kind || null,
      backoffLevel,
      nextAllowedRetryAt: activeLimit ? new Date(activeLimit.retryAt).toISOString() : null,
      lastRateLimitAt,
      lastSuccessfulStableStreamAt,
    }
  }

  function persist() {
    if (!stateStore) return
    const state = persistentState()
    persistenceQueue = persistenceQueue
      .then(() => stateStore.save(state))
      .catch(() => {
        diagnosticLogger.warn('YouTube read rate-limit state could not be persisted.', {
          reason: 'local_state_unavailable',
        })
      })
  }

  if (persistedState && !restoredActive) persist()

  function logBlocked(operation, liveChatId = null) {
    if (!activeLimit) return
    diagnosticLogger.warn('YouTube upstream read blocked by active rate limit', {
      blockedOperation: operation,
      chatRef: liveChatId ? safeLiveChatReference(liveChatId) : null,
      backoffLevel,
      nextAllowedRetryAt: new Date(activeLimit.retryAt).toISOString(),
      retryAfterMs: Math.max(0, activeLimit.retryAt - now()),
      blockerSource: 'central-in-memory-state',
      blockerReused: true,
    })
  }

  function snapshot() {
    if (!activeLimit) return null
    return {
      kind: activeLimit.kind,
      code: activeLimit.code,
      message: activeLimit.message,
      retryAt: activeLimit.retryAt,
      retryAfterMs: Math.max(0, activeLimit.retryAt - now()),
      autoRetry: activeLimit.autoRetry,
      liveChatId: activeLimit.liveChatId,
      backoffLevel,
      retryHintSource: activeLimit.retryHintSource,
    }
  }

  function asError() {
    const current = snapshot()
    if (!current) return null
    const error = new AppError(429, current.code, current.message, {
      retryable: current.autoRetry,
      retryAfterMs: current.retryAfterMs,
      rateLimitKind: current.kind,
    })
    error.centralRateLimitBlock = true
    return error
  }

  function record(error, liveChatId = null, operation = 'stream') {
    if (error?.centralRateLimitBlock || error?.centralRateLimitRecorded) return error
    if (error?.status !== 429 || !error?.rateLimitKind) return error
    if (error.rateLimitKind === 'rate') backoffLevel = Math.min(3, backoffLevel + 1)
    const fallbackDelay = error.rateLimitKind === 'rate'
      ? backoffDelay(backoffLevel, baseBackoffMs, maximumBackoffMs)
      : 24 * 60 * 60 * 1000
    const hasUpstreamHint = Number.isFinite(error.retryAfterMs) && Boolean(error.retryHintSource)
    const upstreamDelay = hasUpstreamHint ? Math.max(0, error.retryAfterMs) : 0
    const retryAfterMs = hasUpstreamHint
      ? Math.max(minimumUpstreamRetryMs, upstreamDelay)
      : fallbackDelay
    lastRateLimitAt = new Date(now()).toISOString()
    activeLimit = {
      code: error.code,
      message: error.message,
      kind: error.rateLimitKind,
      retryAt: now() + retryAfterMs,
      autoRetry: error.rateLimitKind === 'rate',
      liveChatId,
      retryHintSource: error.retryHintSource || 'conservative-backoff',
    }
    probe = null
    persist()
    diagnosticLogger.warn('YouTube live chat central read rate limit stored', {
      blockedOperation: operation,
      chatRef: liveChatId ? safeLiveChatReference(liveChatId) : null,
      normalizedError: error.code,
      rateLimitKind: error.rateLimitKind,
      retryAfterMs,
      retryHintSource: activeLimit.retryHintSource,
      backoffLevel,
      nextAllowedRetryAt: new Date(activeLimit.retryAt).toISOString(),
      blockerSource: 'new-upstream-error',
      blockerReused: false,
    })
    const guardedError = new AppError(429, error.code, error.message, {
      retryable: activeLimit.autoRetry,
      retryAfterMs,
      rateLimitKind: error.rateLimitKind,
    })
    guardedError.retryHintSource = activeLimit.retryHintSource
    guardedError.backoffLevel = backoffLevel
    guardedError.centralRateLimitRecorded = true
    return guardedError
  }

  function acquire(operation, liveChatId = null, { manual = false } = {}) {
    if (!activeLimit) return true
    const retryAfterMs = activeLimit.retryAt - now()
    const wrongChat = Boolean(activeLimit.liveChatId && liveChatId !== activeLimit.liveChatId)
    if (retryAfterMs > 0 || wrongChat || probe || (!activeLimit.autoRetry && !manual)) {
      logBlocked(operation, liveChatId)
      return false
    }
    probe = { operation, liveChatId }
    diagnosticLogger.info('YouTube upstream read retry probe acquired', {
      blockedOperation: operation,
      chatRef: liveChatId ? safeLiveChatReference(liveChatId) : null,
      backoffLevel,
      nextAllowedRetryAt: new Date(activeLimit.retryAt).toISOString(),
    })
    return true
  }

  function releaseProbe(operation, liveChatId = null) {
    if (!probe) return
    if (probe.operation !== operation || probe.liveChatId !== liveChatId) return
    probe = null
  }

  function clearAfterSuccess(liveChatId = null) {
    if (!activeLimit && !probe) return
    diagnosticLogger.info('YouTube live chat central read rate limit cleared after successful response', {
      chatRef: liveChatId ? safeLiveChatReference(liveChatId) : null,
      backoffLevel,
    })
    activeLimit = null
    probe = null
    persist()
  }

  function resetHistory(liveChatId = null) {
    if (backoffLevel === 0) return
    diagnosticLogger.info('YouTube live chat rate-limit history reset after stable stream', {
      chatRef: liveChatId ? safeLiveChatReference(liveChatId) : null,
      previousBackoffLevel: backoffLevel,
    })
    backoffLevel = 0
    activeLimit = null
    probe = null
    lastSuccessfulStableStreamAt = new Date(now()).toISOString()
    persist()
  }

  function startupState() {
    return {
      restored: restoredActive,
      backoffLevel,
      nextAllowedRetryAt: activeLimit ? new Date(activeLimit.retryAt).toISOString() : null,
    }
  }

  async function flush() {
    await persistenceQueue
  }

  return Object.freeze({
    acquire,
    asError,
    clearAfterSuccess,
    flush,
    logBlocked,
    record,
    releaseProbe,
    resetHistory,
    snapshot,
    startupState,
  })
}

