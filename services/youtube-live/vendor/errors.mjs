export class AppError extends Error {
  constructor(status, code, message, options = {}) {
    super(message, options)
    this.name = 'AppError'
    this.status = status
    this.code = code
    this.expose = options.expose ?? true
    this.retryable = options.retryable ?? false
    this.retryAfterMs = options.retryAfterMs
    this.rateLimitKind = options.rateLimitKind
    this.retryHintSource = options.retryHintSource
    this.richRetryHintPresent = options.richRetryHintPresent
  }
}

export function isAppError(error) {
  return error instanceof AppError
}


