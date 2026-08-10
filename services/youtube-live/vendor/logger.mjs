const REDACTED_KEY = /(authorization|cookie|token|secret|code|state)/i
const SAFE_DIAGNOSTIC_KEYS = new Set(['lifecycleState'])

function sanitize(value, depth = 0) {
  if (depth > 3) return '[truncated]'
  if (Array.isArray(value)) return value.map((item) => sanitize(item, depth + 1))
  if (!value || typeof value !== 'object') return value

  return Object.fromEntries(Object.entries(value).map(([key, item]) => [
    key,
    REDACTED_KEY.test(key) && !SAFE_DIAGNOSTIC_KEYS.has(key) ? '[redacted]' : sanitize(item, depth + 1),
  ]))
}

function write(level, message, metadata = {}) {
  const entry = JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    message,
    ...sanitize(metadata),
  })
  const output = level === 'error' ? console.error : console.log
  output(entry)
}

export const logger = {
  info: (message, metadata) => write('info', message, metadata),
  warn: (message, metadata) => write('warn', message, metadata),
  error: (message, metadata) => write('error', message, metadata),
}


