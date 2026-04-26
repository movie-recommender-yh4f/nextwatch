import { createServer } from 'node:http'
import type { AddressInfo } from 'node:net'
import type { Server } from 'node:http'
import {
  createApp,
  createError,
  defineEventHandler,
  getHeader,
  getRequestIP,
  readBody,
  toNodeListener,
} from 'h3'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

const { runTmdbImportMock } = vi.hoisted(() => ({
  runTmdbImportMock: vi.fn(),
}))

vi.mock('../../../server/utils/tmdb-import-runner', () => ({
  runTmdbImport: runTmdbImportMock,
}))

Object.assign(globalThis, {
  createError,
  defineEventHandler,
  getHeader,
  getRequestIP,
  readBody,
  useRuntimeConfig: vi.fn(() => ({
    adminToken: 'test-admin-token',
  })),
})

const { default: adminImportHandler } = await import('../../../server/api/admin/tmdb-import.post')

function deferredPromise<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((innerResolve, innerReject) => {
    resolve = innerResolve
    reject = innerReject
  })

  return { promise, resolve, reject }
}

async function readJson(response: Response) {
  return response.json() as Promise<Record<string, unknown>>
}

describe('/api/admin/tmdb-import', () => {
  const app = createApp()
  app.use('/api/admin/tmdb-import', adminImportHandler)

  let baseUrl = ''
  let server: Server

  beforeAll(async () => {
    server = createServer(toNodeListener(app))
    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => resolve())
    })
    const address = server.address() as AddressInfo
    baseUrl = `http://127.0.0.1:${address.port}`
  })

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error)
          return
        }

        resolve()
      })
    })
  })

  beforeEach(() => {
    runTmdbImportMock.mockResolvedValue({
      imported: 1,
      skipped: 0,
      adultExcluded: 0,
      lowPopularityExcluded: 0,
      durationSeconds: '0.01',
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('accepts an empty-body trigger request', async () => {
    const response = await fetch(`${baseUrl}/api/admin/tmdb-import`, {
      method: 'POST',
      headers: {
        'x-admin-token': 'test-admin-token',
      },
    })
    const body = await readJson(response)

    expect(response.status).toBe(200)
    expect(body.imported).toBe(1)
    expect(runTmdbImportMock).toHaveBeenCalledTimes(1)
  })

  it('rejects legacy request bodies', async () => {
    const response = await fetch(`${baseUrl}/api/admin/tmdb-import`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-token': 'test-admin-token',
      },
      body: JSON.stringify({ fullRefresh: true }),
    })

    expect(response.status).toBe(400)
  })

  it('rejects a second request while an import is already running', async () => {
    const pendingImport = deferredPromise<{
      imported: number
      skipped: number
      adultExcluded: number
      lowPopularityExcluded: number
      durationSeconds: string
    }>()

    runTmdbImportMock.mockReturnValueOnce(pendingImport.promise)

    const firstRequest = fetch(`${baseUrl}/api/admin/tmdb-import`, {
      method: 'POST',
      headers: {
        'x-admin-token': 'test-admin-token',
      },
    })

    await Promise.resolve()

    const secondResponse = await fetch(`${baseUrl}/api/admin/tmdb-import`, {
      method: 'POST',
      headers: {
        'x-admin-token': 'test-admin-token',
      },
    })

    pendingImport.resolve({
      imported: 1,
      skipped: 0,
      adultExcluded: 0,
      lowPopularityExcluded: 0,
      durationSeconds: '0.01',
    })

    await firstRequest

    expect(secondResponse.status).toBe(409)
  })
})
