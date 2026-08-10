import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { logger as defaultLogger } from './logger.mjs'

const FORMAT_VERSION = 1
const ALLOWED_KINDS = new Set(['rate', 'quota'])

function optionalTimestamp(value) {
  if (typeof value !== 'string' || !Number.isFinite(Date.parse(value))) return null
  return new Date(value).toISOString()
}

export function sanitizeRateLimitState(value = {}) {
  const rateLimitKind = ALLOWED_KINDS.has(value.rateLimitKind) ? value.rateLimitKind : null
  return {
    version: FORMAT_VERSION,
    rateLimitKind,
    backoffLevel: Math.min(3, Math.max(0, Number.isInteger(value.backoffLevel) ? value.backoffLevel : 0)),
    nextAllowedRetryAt: rateLimitKind ? optionalTimestamp(value.nextAllowedRetryAt) : null,
    lastRateLimitAt: optionalTimestamp(value.lastRateLimitAt),
    lastSuccessfulStableStreamAt: optionalTimestamp(value.lastSuccessfulStableStreamAt),
  }
}

export function createYouTubeReadRateLimitStore({ filePath, logger = defaultLogger }) {
  const resolvedPath = path.resolve(filePath)
  const directory = path.dirname(resolvedPath)

  async function load() {
    try {
      return sanitizeRateLimitState(JSON.parse(await readFile(resolvedPath, 'utf8')))
    } catch (error) {
      if (error?.code === 'ENOENT') return null
      logger.warn('Persisted YouTube read rate-limit state could not be loaded.', {
        reason: 'unreadable_or_invalid',
      })
      await rm(resolvedPath, { force: true }).catch(() => undefined)
      return null
    }
  }

  async function save(state) {
    const safeState = sanitizeRateLimitState(state)
    const temporaryPath = `${resolvedPath}.${process.pid}.${Date.now()}.tmp`
    await mkdir(directory, { recursive: true, mode: 0o700 })
    try {
      await writeFile(temporaryPath, `${JSON.stringify(safeState)}\n`, {
        encoding: 'utf8',
        mode: 0o600,
        flag: 'wx',
      })
      await rename(temporaryPath, resolvedPath)
    } finally {
      await rm(temporaryPath, { force: true })
    }
  }

  return Object.freeze({ filePath: resolvedPath, load, save })
}


