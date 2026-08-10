import { randomBytes } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const SECRET_PATTERN = /^[a-f0-9]{64}$/

export async function loadOrCreateLocalServiceSecret() {
  if (process.env.NODE_ENV === 'production') return ''
  const filePath = path.resolve(process.env.LIVE_MODERATION_LOCAL_SECRET_PATH || '.local/youtube-live-service.key')
  try {
    const existing = (await readFile(filePath, 'utf8')).trim()
    if (!SECRET_PATTERN.test(existing)) throw new Error('Local live-service secret is invalid.')
    return existing
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error
  }
  await mkdir(path.dirname(filePath), { recursive: true, mode: 0o700 })
  const generated = randomBytes(32).toString('hex')
  try { await writeFile(filePath, `${generated}\n`, { encoding: 'utf8', mode: 0o600, flag: 'wx' }); return generated }
  catch (error) {
    if (error?.code !== 'EEXIST') throw error
    const existing = (await readFile(filePath, 'utf8')).trim()
    if (!SECRET_PATTERN.test(existing)) throw new Error('Local live-service secret is invalid.')
    return existing
  }
}

