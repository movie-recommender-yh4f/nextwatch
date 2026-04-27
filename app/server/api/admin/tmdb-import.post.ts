import { runTmdbImport } from '../../utils/tmdb-import-runner'

const ADMIN_TOKEN_HEADER = 'x-admin-token'
const MAX_BAD_TOKEN_FAILURES = 5
const LOCK_DURATION_MS = 15 * 60 * 1000

interface ThrottleEntry {
  failures: number
  lockedUntil: number
}

const throttleMap = new Map<string, ThrottleEntry>()
let importInFlight = false

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)

  if (!config.adminToken) {
    throw createError({ statusCode: 503, statusMessage: 'Admin token not configured' })
  }

  const ip = getRequestIP(event, { xForwardedFor: true }) ?? 'unknown'
  const throttle = throttleMap.get(ip)

  if (throttle && throttle.lockedUntil > Date.now()) {
    throw createError({ statusCode: 429, statusMessage: 'Too many failed attempts' })
  }

  const token = getHeader(event, ADMIN_TOKEN_HEADER)
  if (!token || token !== config.adminToken) {
    const entry: ThrottleEntry = throttle ?? { failures: 0, lockedUntil: 0 }
    entry.failures++

    if (entry.failures >= MAX_BAD_TOKEN_FAILURES) {
      entry.lockedUntil = Date.now() + LOCK_DURATION_MS
    }

    throttleMap.set(ip, entry)
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  throttleMap.delete(ip)

  const rawBody = await readBody<unknown>(event)
  if (rawBody !== null && rawBody !== undefined) {
    throw createError({ statusCode: 400, statusMessage: 'This endpoint does not accept a request body' })
  }

  if (importInFlight) {
    throw createError({ statusCode: 409, statusMessage: 'Import already running' })
  }

  importInFlight = true
  try {
    return await runTmdbImport(event)
  } finally {
    importInFlight = false
  }
})
