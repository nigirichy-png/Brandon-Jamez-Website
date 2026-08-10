import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'
import { access, chmod, mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { logger as defaultLogger } from './logger.mjs'

const ALGORITHM = 'aes-256-gcm'
const FORMAT_VERSION = 1
const IV_BYTES = 12
const AAD = Buffer.from('brandon-moderation-hub:oauth:v1', 'utf8')

function decodeEncryptionKey(value) {
  if (/^[a-f0-9]{64}$/i.test(value || '')) return Buffer.from(value, 'hex')
  const decoded = Buffer.from(value || '', 'base64')
  if (decoded.length === 32) return decoded
  throw new Error('Token encryption key is invalid.')
}

export function encryptAuthPayload(payload, encryptionKey) {
  const key = decodeEncryptionKey(encryptionKey)
  const iv = randomBytes(IV_BYTES)
  const cipher = createCipheriv(ALGORITHM, key, iv)
  cipher.setAAD(AAD)
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(payload), 'utf8'),
    cipher.final(),
  ])

  return {
    version: FORMAT_VERSION,
    algorithm: ALGORITHM,
    iv: iv.toString('base64'),
    tag: cipher.getAuthTag().toString('base64'),
    ciphertext: ciphertext.toString('base64'),
  }
}

export function decryptAuthPayload(envelope, encryptionKey) {
  if (envelope?.version !== FORMAT_VERSION || envelope?.algorithm !== ALGORITHM) {
    throw new Error('Unsupported encrypted token format.')
  }

  const key = decodeEncryptionKey(encryptionKey)
  const iv = Buffer.from(envelope.iv || '', 'base64')
  const tag = Buffer.from(envelope.tag || '', 'base64')
  const ciphertext = Buffer.from(envelope.ciphertext || '', 'base64')
  if (iv.length !== IV_BYTES || tag.length !== 16 || ciphertext.length === 0) {
    throw new Error('Encrypted token data is malformed.')
  }

  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAAD(AAD)
  decipher.setAuthTag(tag)
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()])
  return JSON.parse(plaintext.toString('utf8'))
}

export function createTokenStore({ filePath, encryptionKey, logger = defaultLogger }) {
  const resolvedPath = path.resolve(filePath)
  const directory = path.dirname(resolvedPath)

  async function exists() {
    try {
      await access(resolvedPath)
      return true
    } catch {
      return false
    }
  }

  async function load() {
    try {
      const envelope = JSON.parse(await readFile(resolvedPath, 'utf8'))
      const payload = decryptAuthPayload(envelope, encryptionKey)
      if (!payload?.tokens?.refresh_token || !payload.account || typeof payload.account !== 'object') {
        throw new Error('Stored authentication payload is incomplete.')
      }
      return payload
    } catch (error) {
      if (error?.code === 'ENOENT') return null
      logger.warn('Persisted OAuth state could not be loaded; continuing signed out.', {
        reason: 'unreadable_or_undecryptable',
      })
      await rm(resolvedPath, { force: true }).catch(() => undefined)
      return null
    }
  }

  async function save(tokens, account) {
    const envelope = encryptAuthPayload({
      tokens,
      account,
      savedAt: new Date().toISOString(),
    }, encryptionKey)
    const temporaryPath = `${resolvedPath}.${process.pid}.${randomBytes(6).toString('hex')}.tmp`

    await mkdir(directory, { recursive: true, mode: 0o700 })
    try {
      await writeFile(temporaryPath, `${JSON.stringify(envelope)}\n`, { encoding: 'utf8', mode: 0o600, flag: 'wx' })
      await rename(temporaryPath, resolvedPath)
      try {
        await chmod(resolvedPath, 0o600)
      } catch {
        // Windows ACLs are platform-managed; the file still stays in the ignored local directory.
      }
    } finally {
      await rm(temporaryPath, { force: true })
    }
  }

  async function clear() {
    await rm(resolvedPath, { force: true })
  }

  return Object.freeze({ load, save, clear, exists, filePath: resolvedPath })
}


