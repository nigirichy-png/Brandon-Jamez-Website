import { existsSync } from 'node:fs'

import { google } from 'googleapis'

import { loadYouTubeLiveConfiguration, validateYouTubeLiveConfiguration } from '../services/youtube-live/config.mjs'

const config = await loadYouTubeLiveConfiguration()
let googleRefreshReady = false
if (config.googleClientId && config.googleClientSecret && config.oauthTokens?.refresh_token) {
  const auth = new google.auth.OAuth2(config.googleClientId, config.googleClientSecret)
  auth.setCredentials(config.oauthTokens)
  googleRefreshReady = await auth.getAccessToken().then((result) => Boolean(result?.token)).catch(() => false)
}
const checks = [
  ['Website Supabase URL', Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL)],
  ['Website Supabase anon key', Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)],
  ['Google OAuth client configuration', Boolean(config.googleClientId && config.googleClientSecret)],
  [`YouTube OAuth session (${config.oauthSource})`, Boolean(config.oauthTokens?.refresh_token)],
  ['Google OAuth refresh grant', googleRefreshReady],
  [`Shared live-service HMAC secret (${config.serviceSecretSource})`, config.serviceSecret.length >= 32 && !config.serviceSecret.includes('placeholder')],
  ['Local live migration file 013', existsSync('supabase/migrations/202608070013_live_stream_and_chat.sql')],
]

for (const [label, ready] of checks) console.log(`${ready ? '[ready]' : '[missing]'} ${label}`)
const scope = String(config.oauthTokens?.scope || '')
console.log(scope ? `${scope.split(/\s+/).includes('https://www.googleapis.com/auth/youtube.force-ssl') ? '[ready]' : '[missing]'} YouTube youtube.force-ssl scope` : '[check] YouTube scope is not recorded in the stored token; Google will verify it on first use')
for (const error of validateYouTubeLiveConfiguration(config)) console.log(`[configuration] ${error}`)
console.log(`[info] YouTube service endpoint: http://${config.host}:${config.port}`)
console.log('[info] No secret values were printed.')

process.exitCode = checks.every(([, ready]) => ready) ? 0 : 1
