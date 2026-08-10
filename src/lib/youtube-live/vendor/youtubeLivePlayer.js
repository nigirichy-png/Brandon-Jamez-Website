export const YOUTUBE_PLAYER_STATE = Object.freeze({
  UNSTARTED: -1,
  ENDED: 0,
  PLAYING: 1,
  PAUSED: 2,
  BUFFERING: 3,
  CUED: 5,
})

export const LIVE_EDGE_SAFETY_MARGIN_SECONDS = 2
export const LIVE_DRIFT_THRESHOLD_SECONDS = 12
export const LIVE_DRIFT_CHECK_INTERVAL_MS = 10_000
export const LIVE_AUTO_SEEK_COOLDOWN_MS = 25_000
export const LIVE_MANUAL_SEEK_COOLDOWN_MS = 1_000
export const LIVE_SEEK_CONFIRMATION_MS = 3_000
export const LIVE_SEEK_SUCCESS_IMPROVEMENT_SECONDS = 8
export const LIVE_MAX_CORRECTION_ATTEMPTS = 2
export const MANUAL_REWIND_DETECTION_SECONDS = 3
export const LIVE_USER_INTERACTION_WINDOW_MS = 2_000
export const LIVE_PAUSE_CONFIRMATION_MS = 750
export const LIVE_BUFFERING_TRANSITION_WINDOW_MS = 1_500

const USER_INTERACTION_TYPES = new Set([
  'keyboard-k',
  'keyboard-space',
  'mouse',
  'pointer',
  'touch',
])

const iframeApiPromises = new WeakMap()

function safePlayerNumber(player, method) {
  try {
    const value = Number(player?.[method]?.())
    return Number.isFinite(value) ? value : null
  } catch {
    return null
  }
}

export function getLiveEdgeSnapshot(player, safetyMarginSeconds = LIVE_EDGE_SAFETY_MARGIN_SECONDS) {
  const duration = safePlayerNumber(player, 'getDuration')
  const currentTime = safePlayerNumber(player, 'getCurrentTime')
  if (duration === null || currentTime === null || duration <= 0 || currentTime < 0) {
    return {
      reliable: false,
      currentTime,
      duration,
      lagSeconds: null,
      targetSeconds: null,
    }
  }

  const targetSeconds = Math.max(0, duration - Math.max(0, safetyMarginSeconds))
  return {
    reliable: true,
    currentTime,
    duration,
    lagSeconds: Math.max(0, duration - currentTime),
    targetSeconds,
  }
}

export function loadYouTubeIframeApi(windowObject = window, documentObject = document) {
  if (windowObject.YT?.Player) return Promise.resolve(windowObject.YT)
  const existingPromise = iframeApiPromises.get(windowObject)
  if (existingPromise) return existingPromise

  const promise = new Promise((resolve, reject) => {
    const previousReadyHandler = windowObject.onYouTubeIframeAPIReady
    const handleReady = () => {
      try {
        previousReadyHandler?.()
      } finally {
        windowObject.onYouTubeIframeAPIReady = previousReadyHandler
        if (windowObject.YT?.Player) resolve(windowObject.YT)
        else reject(new Error('YouTube IFrame Player API did not expose YT.Player.'))
      }
    }
    windowObject.onYouTubeIframeAPIReady = handleReady

    let script = documentObject.getElementById('youtube-iframe-api')
    if (!script) {
      script = documentObject.createElement('script')
      script.id = 'youtube-iframe-api'
      script.src = 'https://www.youtube.com/iframe_api'
      script.async = true
      documentObject.head.append(script)
    }
    script.addEventListener('error', () => {
      iframeApiPromises.delete(windowObject)
      reject(new Error('YouTube IFrame Player API could not be loaded.'))
    }, { once: true })
  })
  iframeApiPromises.set(windowObject, promise)
  return promise
}

export function createYouTubeLiveController({
  player,
  now = Date.now,
  setTimer = setTimeout,
  clearTimer = clearTimeout,
  onDriftChange = () => {},
  checkIntervalMs = LIVE_DRIFT_CHECK_INTERVAL_MS,
  driftThresholdSeconds = LIVE_DRIFT_THRESHOLD_SECONDS,
  autoSeekCooldownMs = LIVE_AUTO_SEEK_COOLDOWN_MS,
  manualSeekCooldownMs = LIVE_MANUAL_SEEK_COOLDOWN_MS,
  seekConfirmationMs = LIVE_SEEK_CONFIRMATION_MS,
  seekSuccessImprovementSeconds = LIVE_SEEK_SUCCESS_IMPROVEMENT_SECONDS,
  maximumCorrectionAttempts = LIVE_MAX_CORRECTION_ATTEMPTS,
  safetyMarginSeconds = LIVE_EDGE_SAFETY_MARGIN_SECONDS,
  rewindDetectionSeconds = MANUAL_REWIND_DETECTION_SECONDS,
  userInteractionWindowMs = LIVE_USER_INTERACTION_WINDOW_MS,
  pauseConfirmationMs = LIVE_PAUSE_CONFIRMATION_MS,
  bufferingTransitionWindowMs = LIVE_BUFFERING_TRANSITION_WINDOW_MS,
  development = false,
  diagnosticLogger = (...args) => console.debug(...args),
} = {}) {
  if (!player) throw new TypeError('player is required')
  let stopped = false
  let checkTimer = null
  let confirmationTimer = null
  let pauseConfirmationTimer = null
  let playerState = YOUTUBE_PLAYER_STATE.UNSTARTED
  let hasPlayed = false
  let autoLiveEnabled = true
  let intentionallyPaused = false
  let detectedManualPause = false
  let detectedManualRewind = false
  let lastSample = null
  let lastObservedDuration = null
  let liveEdgeConfirmed = false
  let lastAutoSeekAt = null
  let lastManualSeekAt = Number.NEGATIVE_INFINITY
  let programmaticSeek = null
  let correctionAttempt = 0
  let correctionSucceeded = null
  let needsAttention = false
  let lastUserInteractionAt = null
  let userInteractionType = null
  let manualPauseEvidence = null
  let pendingPauseConfirmation = null
  let lastPauseConfirmationElapsedMs = null
  let pauseIgnoredReason = null
  let lastBufferingAt = null

  function cooldownRemainingMs() {
    if (lastAutoSeekAt === null) return 0
    return Math.max(0, autoSeekCooldownMs - (now() - lastAutoSeekAt))
  }

  function debug(event, snapshot, overrides = {}) {
    if (!development) return
    const userInteractionDetected = lastUserInteractionAt !== null
      && now() - lastUserInteractionAt <= userInteractionWindowMs
    diagnosticLogger('[LivePlayerDebug]', {
      event,
      playerState,
      currentTime: snapshot?.currentTime ?? null,
      duration: snapshot?.duration ?? null,
      calculatedBehindSeconds: snapshot?.lagSeconds ?? null,
      liveConfirmed: liveEdgeConfirmed,
      autoLiveEnabled,
      lastAutoSeekAt,
      cooldownRemainingMs: cooldownRemainingMs(),
      seekSuppressedReason: null,
      detectedManualPause,
      detectedManualRewind,
      programmaticSeekInProgress: Boolean(programmaticSeek),
      expectedSeekTarget: programmaticSeek?.targetSeconds ?? null,
      actualPositionAfterSeek: null,
      correctionAttempt,
      correctionSucceeded,
      userInteractionDetected,
      lastUserInteractionAt,
      userInteractionType,
      manualPauseEvidence,
      pauseConfirmationPending: Boolean(pendingPauseConfirmation),
      pauseConfirmationElapsedMs: pendingPauseConfirmation
        ? Math.max(0, now() - pendingPauseConfirmation.startedAt)
        : lastPauseConfirmationElapsedMs,
      pauseIgnoredReason,
      ...overrides,
    })
  }

  function publishSnapshot(snapshot) {
    const behind = liveEdgeConfirmed
      && snapshot.reliable
      && snapshot.lagSeconds > driftThresholdSeconds
    const syncState = programmaticSeek
      ? 'syncing'
      : needsAttention
        ? 'attention'
        : !autoLiveEnabled || intentionallyPaused
          ? 'paused'
          : behind
            ? 'behind'
            : liveEdgeConfirmed
              ? 'ready'
              : 'checking'
    onDriftChange({
      behind,
      reliable: snapshot.reliable,
      lagSeconds: behind ? snapshot.lagSeconds : null,
      liveEdgeConfirmed,
      autoLiveEnabled,
      intentionallyPaused,
      programmaticSeekInProgress: Boolean(programmaticSeek),
      correctionAttempt,
      correctionSucceeded,
      syncState,
    })
  }

  function observeLiveDuration(snapshot) {
    if (!snapshot.reliable) return
    if (lastObservedDuration !== null && snapshot.duration > lastObservedDuration + 0.5) {
      liveEdgeConfirmed = true
    }
    lastObservedDuration = snapshot.duration
  }

  function detectManualRewind(snapshot) {
    detectedManualRewind = false
    if (
      !snapshot.reliable
      || programmaticSeek
      || !lastSample
      || snapshot.currentTime >= lastSample.currentTime - rewindDetectionSeconds
    ) return false
    autoLiveEnabled = false
    intentionallyPaused = false
    detectedManualRewind = true
    return true
  }

  function correctionWasSuccessful(snapshot, seek) {
    return Boolean(
      snapshot.reliable
      && (
        snapshot.lagSeconds <= driftThresholdSeconds
        || seek.baselineLagSeconds - snapshot.lagSeconds >= seekSuccessImprovementSeconds
      )
    )
  }

  function clearConfirmationTimer() {
    if (confirmationTimer) clearTimer(confirmationTimer)
    confirmationTimer = null
  }

  function clearPauseConfirmationTimer() {
    if (pauseConfirmationTimer) clearTimer(pauseConfirmationTimer)
    pauseConfirmationTimer = null
  }

  function cancelPendingPause(reason) {
    if (!pendingPauseConfirmation) return false
    lastPauseConfirmationElapsedMs = Math.max(0, now() - pendingPauseConfirmation.startedAt)
    clearPauseConfirmationTimer()
    pendingPauseConfirmation = null
    manualPauseEvidence = null
    pauseIgnoredReason = reason
    return true
  }

  function recentUserInteraction() {
    return lastUserInteractionAt !== null
      && now() - lastUserInteractionAt <= userInteractionWindowMs
  }

  function confirmManualPause() {
    pauseConfirmationTimer = null
    if (stopped || !pendingPauseConfirmation) return false
    const pending = pendingPauseConfirmation
    const snapshot = getLiveEdgeSnapshot(player, safetyMarginSeconds)
    lastPauseConfirmationElapsedMs = Math.max(0, now() - pending.startedAt)
    pendingPauseConfirmation = null
    if (programmaticSeek) {
      manualPauseEvidence = null
      pauseIgnoredReason = 'programmatic-operation'
    } else if (playerState !== YOUTUBE_PLAYER_STATE.PAUSED) {
      manualPauseEvidence = null
      pauseIgnoredReason = playerState === YOUTUBE_PLAYER_STATE.BUFFERING
        ? 'buffering-transition'
        : 'transient-pause'
    } else if (
      lastUserInteractionAt !== pending.interactionAt
      || now() - pending.interactionAt > userInteractionWindowMs
    ) {
      manualPauseEvidence = null
      pauseIgnoredReason = 'no-user-interaction'
    } else {
      autoLiveEnabled = false
      intentionallyPaused = true
      detectedManualPause = true
      manualPauseEvidence = `confirmed-${pending.interactionType}`
      pauseIgnoredReason = null
    }
    publishSnapshot(snapshot)
    debug(detectedManualPause ? 'manual-pause-confirmed' : 'manual-pause-ignored', snapshot)
    return detectedManualPause
  }

  function recordUserInteraction(type) {
    if (stopped || !USER_INTERACTION_TYPES.has(type)) return false
    lastUserInteractionAt = now()
    userInteractionType = type
    pauseIgnoredReason = null
    debug('user-interaction', getLiveEdgeSnapshot(player, safetyMarginSeconds))
    return true
  }

  function beginCorrection(kind, snapshot, attempt = 1) {
    if (stopped || !snapshot.reliable || programmaticSeek) return false
    correctionAttempt = attempt
    correctionSucceeded = null
    needsAttention = false
    programmaticSeek = {
      kind,
      attempt,
      targetSeconds: snapshot.targetSeconds,
      baselineLagSeconds: snapshot.lagSeconds,
      startedAt: now(),
    }
    publishSnapshot(snapshot)
    debug('correction-attempt', snapshot, {
      correctionAttempt: attempt,
      correctionSucceeded: null,
      expectedSeekTarget: snapshot.targetSeconds,
    })
    player.seekTo(snapshot.targetSeconds, true)
    if (kind === 'manual') player.playVideo?.()
    clearConfirmationTimer()
    confirmationTimer = setTimer(() => {
      confirmationTimer = null
      confirmCorrection()
    }, seekConfirmationMs)
    return true
  }

  function finishSuccessfulCorrection(snapshot, seek) {
    clearConfirmationTimer()
    correctionSucceeded = true
    lastAutoSeekAt = now()
    programmaticSeek = null
    correctionAttempt = 0
    needsAttention = false
    lastSample = snapshot.reliable ? { currentTime: snapshot.currentTime } : null
    publishSnapshot(snapshot)
    debug('correction-confirmed', snapshot, {
      correctionAttempt: seek.attempt,
      correctionSucceeded: true,
      expectedSeekTarget: seek.targetSeconds,
      actualPositionAfterSeek: snapshot.currentTime,
    })
  }

  function finishFailedCorrection(snapshot, seek) {
    clearConfirmationTimer()
    programmaticSeek = null
    lastSample = snapshot.reliable ? { currentTime: snapshot.currentTime } : null
    debug('correction-not-confirmed', snapshot, {
      correctionAttempt: seek.attempt,
      correctionSucceeded: false,
      seekSuppressedReason: 'seek-not-effective',
      expectedSeekTarget: seek.targetSeconds,
      actualPositionAfterSeek: snapshot.currentTime,
    })
    if (seek.attempt < maximumCorrectionAttempts) {
      beginCorrection(seek.kind, snapshot, seek.attempt + 1)
      return
    }
    correctionSucceeded = false
    correctionAttempt = seek.attempt
    needsAttention = true
    publishSnapshot(snapshot)
  }

  function confirmCorrection() {
    if (stopped || !programmaticSeek) return false
    const seek = programmaticSeek
    const snapshot = getLiveEdgeSnapshot(player, safetyMarginSeconds)
    observeLiveDuration(snapshot)
    if (correctionWasSuccessful(snapshot, seek)) {
      finishSuccessfulCorrection(snapshot, seek)
      return true
    }
    finishFailedCorrection(snapshot, seek)
    return false
  }

  function suppressionReason(snapshot, manualRewindDetected) {
    if (!snapshot.reliable) return 'live-edge-unavailable'
    if (!liveEdgeConfirmed) return 'live-not-confirmed'
    if (needsAttention) return 'maximum-attempts-reached'
    if (snapshot.lagSeconds <= driftThresholdSeconds) return 'below-threshold'
    if (playerState !== YOUTUBE_PLAYER_STATE.PLAYING) return playerState === YOUTUBE_PLAYER_STATE.BUFFERING ? 'buffering' : 'not-playing'
    if (!autoLiveEnabled) return 'auto-live-disabled'
    if (intentionallyPaused) return 'manual-pause'
    if (manualRewindDetected) return 'manual-rewind'
    if (cooldownRemainingMs() > 0) return 'successful-correction-cooldown'
    return null
  }

  function checkDrift() {
    if (stopped) return false
    const snapshot = getLiveEdgeSnapshot(player, safetyMarginSeconds)
    observeLiveDuration(snapshot)
    if (programmaticSeek) {
      if (correctionWasSuccessful(snapshot, programmaticSeek)) {
        finishSuccessfulCorrection(snapshot, programmaticSeek)
        return true
      }
      publishSnapshot(snapshot)
      debug('drift-check', snapshot, {
        seekSuppressedReason: 'programmatic-seek-in-progress',
        actualPositionAfterSeek: snapshot.currentTime,
      })
      return false
    }
    const manualRewindDetected = detectManualRewind(snapshot)
    publishSnapshot(snapshot)
    lastSample = snapshot.reliable ? { currentTime: snapshot.currentTime } : null
    const reason = suppressionReason(snapshot, manualRewindDetected)
    debug('drift-check', snapshot, { seekSuppressedReason: reason })
    if (reason) return false
    return beginCorrection('automatic', snapshot)
  }

  function scheduleCheck() {
    if (stopped || checkTimer) return
    checkTimer = setTimer(() => {
      checkTimer = null
      checkDrift()
      scheduleCheck()
    }, checkIntervalMs)
  }

  function handleStateChange(nextState) {
    if (stopped) return
    playerState = nextState
    detectedManualPause = false
    const snapshot = getLiveEdgeSnapshot(player, safetyMarginSeconds)
    observeLiveDuration(snapshot)

    if (nextState !== YOUTUBE_PLAYER_STATE.PAUSED && pendingPauseConfirmation) {
      cancelPendingPause(nextState === YOUTUBE_PLAYER_STATE.BUFFERING
        ? 'buffering-transition'
        : 'transient-pause')
    }

    if (nextState === YOUTUBE_PLAYER_STATE.BUFFERING) lastBufferingAt = now()

    if (nextState === YOUTUBE_PLAYER_STATE.PLAYING) {
      hasPlayed = true
      publishSnapshot(snapshot)
      debug('state-change', snapshot)
      checkDrift()
      scheduleCheck()
      return
    }

    if (nextState === YOUTUBE_PLAYER_STATE.PAUSED) {
      lastPauseConfirmationElapsedMs = null
      manualPauseEvidence = null
      if (programmaticSeek) {
        pauseIgnoredReason = 'programmatic-operation'
      } else if (!hasPlayed) {
        pauseIgnoredReason = 'autoplay-blocked'
      } else if (!liveEdgeConfirmed) {
        pauseIgnoredReason = 'initialization'
      } else if (
        lastBufferingAt !== null
        && now() - lastBufferingAt <= bufferingTransitionWindowMs
      ) {
        pauseIgnoredReason = 'buffering-transition'
      } else if (!recentUserInteraction()) {
        pauseIgnoredReason = 'no-user-interaction'
      } else {
        pauseIgnoredReason = null
        manualPauseEvidence = `recent-${userInteractionType}`
        pendingPauseConfirmation = {
          interactionAt: lastUserInteractionAt,
          interactionType: userInteractionType,
          startedAt: now(),
        }
        clearPauseConfirmationTimer()
        pauseConfirmationTimer = setTimer(confirmManualPause, pauseConfirmationMs)
      }
    }
    publishSnapshot(snapshot)
    debug('state-change', snapshot, {
      seekSuppressedReason: programmaticSeek
        ? 'programmatic-seek-in-progress'
        : nextState === YOUTUBE_PLAYER_STATE.BUFFERING
          ? 'buffering'
          : null,
    })
  }

  function goLive() {
    if (stopped || programmaticSeek || now() - lastManualSeekAt < manualSeekCooldownMs) return false
    const snapshot = getLiveEdgeSnapshot(player, safetyMarginSeconds)
    if (!snapshot.reliable) {
      publishSnapshot(snapshot)
      debug('manual-go-live', snapshot, { seekSuppressedReason: 'live-edge-unavailable' })
      return false
    }
    lastManualSeekAt = now()
    autoLiveEnabled = true
    intentionallyPaused = false
    detectedManualPause = false
    detectedManualRewind = false
    cancelPendingPause('programmatic-operation')
    needsAttention = false
    correctionSucceeded = null
    playerState = YOUTUBE_PLAYER_STATE.PLAYING
    hasPlayed = true
    const started = beginCorrection('manual', snapshot)
    scheduleCheck()
    return started
  }

  function start() {
    if (stopped) return
    const currentState = Number(player.getPlayerState?.())
    if (Number.isFinite(currentState)) playerState = currentState
    if (playerState === YOUTUBE_PLAYER_STATE.PLAYING) hasPlayed = true
    checkDrift()
    scheduleCheck()
  }

  function stop() {
    if (stopped) return
    stopped = true
    if (checkTimer) clearTimer(checkTimer)
    checkTimer = null
    clearConfirmationTimer()
    clearPauseConfirmationTimer()
    pendingPauseConfirmation = null
    programmaticSeek = null
  }

  return Object.freeze({
    checkDrift,
    confirmCorrection,
    goLive,
    handleStateChange,
    recordUserInteraction,
    start,
    stop,
  })
}

export function createYouTubePlayerSession({
  YT,
  iframe,
  onReadyChange = () => {},
  onDriftChange = () => {},
  controllerOptions = {},
} = {}) {
  if (!YT?.Player) throw new TypeError('YT.Player is required')
  if (!iframe) throw new TypeError('iframe is required')
  let destroyed = false
  let controller = null

  const player = new YT.Player(iframe, {
    events: {
      onReady: (event) => {
        if (destroyed || controller) return
        controller = createYouTubeLiveController({
          ...controllerOptions,
          player: event.target,
          onDriftChange,
        })
        controller.start()
        onReadyChange(true)
      },
      onStateChange: (event) => {
        if (!destroyed) controller?.handleStateChange(event.data)
      },
      onError: () => {
        if (destroyed) return
        controller?.stop()
        controller = null
        onReadyChange(false)
      },
    },
  })

  function destroy() {
    if (destroyed) return
    destroyed = true
    controller?.stop()
    controller = null
    player.destroy?.()
  }

  return Object.freeze({
    destroy,
    goLive: () => controller?.goLive() || false,
    recordUserInteraction: (type) => controller?.recordUserInteraction(type) || false,
  })
}

