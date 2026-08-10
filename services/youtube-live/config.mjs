import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import path from 'node:path'

import dotenv from 'dotenv'
import nextEnv from '@next/env'

import { decryptAuthPayload } from './vendor/tokenStore.mjs'
import { loadOrCreateLocalServiceSecret } from './local-secret.mjs'

nextEnv.loadEnvConfig(process.cwd())

const defaultHubRoot = path.resolve(process.cwd(), '..', 'Brandon-Moderation-Hub')
const hubEnvPath = path.resolve(process.env.YOUTUBE_HUB_ENV_PATH || path.join(defaultHubRoot, '.env'))
if (existsSync(hubEnvPath)) dotenv.config({ path: hubEnvPath, override: false, quiet: true })

function clean(value) { return typeof value === 'string' ? value.trim() : '' }
function usable(value) { const normalized = clean(value); return normalized && !/placeholder|change-me|your-/i.test(normalized) ? normalized : '' }

async function readHubTokens() {
  const tokenPath = path.resolve(process.env.YOUTUBE_HUB_TOKEN_STORE_PATH || path.join(path.dirname(hubEnvPath), '.local', 'oauth-auth.json'))
  const encryptionKey = clean(process.env.TOKEN_ENCRYPTION_KEY)
  if (!encryptionKey || !existsSync(tokenPath)) return { tokens: null, tokenPath, error: 'hub_oauth_store_unavailable' }
  try {
    const envelope = JSON.parse(await readFile(tokenPath, 'utf8'))
    const payload = decryptAuthPayload(envelope, encryptionKey)
    if (!payload?.tokens?.refresh_token) return { tokens: null, tokenPath, error: 'hub_oauth_refresh_token_missing' }
    return { tokens: payload.tokens, tokenPath, error: null }
  } catch {
    // Read-only fallback: never delete or rewrite the Hub's OAuth store.
    return { tokens: null, tokenPath, error: 'hub_oauth_store_unreadable' }
  }
}

export async function loadYouTubeLiveConfiguration() {
  const googleClientId = usable(process.env.GOOGLE_CLIENT_ID)
  const googleClientSecret = usable(process.env.GOOGLE_CLIENT_SECRET)
  const explicitRefreshToken = usable(process.env.YOUTUBE_MODERATION_REFRESH_TOKEN)
  const hubAuth = explicitRefreshToken ? { tokens: { refresh_token: explicitRefreshToken }, tokenPath: null, error: null } : await readHubTokens()
  const explicitServiceSecret = usable(process.env.LIVE_MODERATION_SERVICE_SECRET)
  const serviceSecret = explicitServiceSecret || await loadOrCreateLocalServiceSecret()
  const port = Number.parseInt(clean(process.env.LIVE_MODERATION_PORT) || '3011', 10)
  const host = clean(process.env.LIVE_MODERATION_HOST) || '127.0.0.1'
  const statePath = path.resolve(clean(process.env.LIVE_MODERATION_STATE_PATH) || '.local/youtube-read-rate-limit.json')
  return { googleClientId, googleClientSecret, oauthTokens: hubAuth.tokens, oauthSource: explicitRefreshToken ? 'environment' : hubAuth.tokens ? 'hub-encrypted-store' : 'unavailable', oauthError: hubAuth.error, hubEnvPath, hubTokenPath: hubAuth.tokenPath, serviceSecret, serviceSecretSource: explicitServiceSecret ? 'environment' : serviceSecret ? 'local-generated-store' : 'unavailable', port, host, statePath }
}

export function validateYouTubeLiveConfiguration(config) {
  const errors = []
  if (!Number.isInteger(config.port) || config.port < 1 || config.port > 65535) errors.push('LIVE_MODERATION_PORT is invalid')
  if (config.serviceSecret.length < 32 || config.serviceSecret.includes('placeholder')) errors.push('LIVE_MODERATION_SERVICE_SECRET must contain at least 32 non-placeholder characters')
  if (!config.googleClientId || !config.googleClientSecret) errors.push('Google moderation credentials are incomplete')
  if (!config.oauthTokens?.refresh_token) errors.push(config.oauthError || 'YouTube OAuth refresh token is unavailable')
  return errors
}
