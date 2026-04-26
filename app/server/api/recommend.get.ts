import { createHash } from 'node:crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getAuthorizedUser } from '../utils/auth'
import {
  fetchMyListMovies,
  fetchWatchedMovies,
  getRecommendationsFromGemini,
  hasEnoughRecommendationsToCache,
  hasValidTmdbId,
} from '../utils/recommendations'
import type { RecommendationWithId, WatchedMovieRecord } from '../utils/recommendations'

const RECOMMENDATIONS_TABLE = 'recommendations'
const TTL_MS = 7 * 24 * 60 * 60 * 1000
const QUERY_TRUE = ['true', '1']

interface CachedRow {
  tmdb_ids: number[]
  watched_hash: string
  expires_at: string
}

interface RecommendationCacheState {
  freshRecommendationIds: number[] | null
  storedRecommendationIds: number[]
}

interface RegenerationErrorPayload {
  statusCode: number
  statusMessage: string
  retryable: boolean
}

interface RecommendationResponse {
  recommendations: number[] | null
  cached: boolean
  stale: false
  regenerationError: RegenerationErrorPayload | null
  staleRecommendations: number[] | null
}

function isQueryFlagEnabled(value: unknown): boolean {
  return typeof value === 'string' && QUERY_TRUE.includes(value)
}

function filterValidRecommendations(
  recommendations: RecommendationWithId[]
): RecommendationWithId[] {
  return recommendations.filter(hasValidTmdbId)
}

function canStoreRecommendations(recommendations: RecommendationWithId[]): boolean {
  const validRecommendations = filterValidRecommendations(recommendations)
  return hasEnoughRecommendationsToCache(validRecommendations)
}

function computeWatchedHash(movies: WatchedMovieRecord[]): string {
  const sorted = [...movies]
    .sort((a, b) => a.tmdbId - b.tmdbId)
    .map(({ tmdbId, title, year }) => ({ tmdbId, title, year }))
  return createHash('sha256').update(JSON.stringify(sorted)).digest('hex')
}

function toRecommendationIds(recommendations: RecommendationWithId[]): number[] {
  return recommendations.flatMap((recommendation) =>
    recommendation.tmdbId === null ? [] : [recommendation.tmdbId]
  )
}

function buildSuccessResponse(recommendationIds: number[], cached: boolean): RecommendationResponse {
  return {
    recommendations: [...recommendationIds],
    cached,
    stale: false,
    regenerationError: null,
    staleRecommendations: null,
  }
}

function buildFailureResponse(
  regenerationError: RegenerationErrorPayload,
  staleRecommendationIds: number[]
): RecommendationResponse {
  return {
    recommendations: null,
    cached: false,
    stale: false,
    regenerationError,
    staleRecommendations: [...staleRecommendationIds],
  }
}

function isErrorWithStatus(
  error: unknown
): error is { statusCode: number; statusMessage?: string } {
  return (
    typeof error === 'object' &&
    error !== null &&
    typeof (error as { statusCode?: unknown }).statusCode === 'number'
  )
}

function normalizeRegenerationError(error: unknown): RegenerationErrorPayload {
  if (isErrorWithStatus(error)) {
    const statusCode = error.statusCode
    const statusMessage =
      typeof error.statusMessage === 'string' && error.statusMessage.length > 0
        ? error.statusMessage
        : 'Recommendation regeneration failed.'

    return {
      statusCode,
      statusMessage,
      retryable: statusCode === 503,
    }
  }

  if (error instanceof Error) {
    return {
      statusCode: 500,
      statusMessage: error.message || 'Recommendation regeneration failed.',
      retryable: false,
    }
  }

  return {
    statusCode: 500,
    statusMessage: 'Recommendation regeneration failed.',
    retryable: false,
  }
}

function createInsufficientRecommendationsError() {
  return createError({
    statusCode: 502,
    statusMessage: 'Recommendation generation returned too few valid TMDB matches.',
  })
}

async function getRecommendationCacheState(
  supabase: SupabaseClient,
  userId: string,
  watchedHash: string
): Promise<RecommendationCacheState> {
  const { data, error } = await supabase
    .from(RECOMMENDATIONS_TABLE)
    .select('tmdb_ids, watched_hash, expires_at')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  if (!data) {
    return {
      freshRecommendationIds: null,
      storedRecommendationIds: [],
    }
  }

  const row = data as CachedRow
  const tmdbIds = Array.isArray(row.tmdb_ids) ? row.tmdb_ids : []
  const isFresh = new Date(row.expires_at) > new Date() && row.watched_hash === watchedHash

  return {
    freshRecommendationIds: isFresh ? tmdbIds : null,
    storedRecommendationIds: tmdbIds,
  }
}

async function storeCachedRecommendations(
  supabase: SupabaseClient,
  userId: string,
  recommendations: RecommendationWithId[],
  watchedHash: string
): Promise<void> {
  const { error } = await supabase.from(RECOMMENDATIONS_TABLE).upsert({
    user_id: userId,
    tmdb_ids: toRecommendationIds(recommendations),
    watched_hash: watchedHash,
    expires_at: new Date(Date.now() + TTL_MS).toISOString(),
  })

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }
}

export default defineEventHandler(async (event) => {
  const { supabase, user } = await getAuthorizedUser(event)
  const { getNew, refresh } = getQuery(event)
  const isGetNew = isQueryFlagEnabled(getNew)
  const isRefresh = !isGetNew && isQueryFlagEnabled(refresh)

  const watchedMovies = await fetchWatchedMovies(supabase, user.id)
  let excludedMovies: RecommendationWithId[] = []

  if (watchedMovies.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'No watched movies found. Watch some movies first.',
    })
  }

  const watchedHash = computeWatchedHash(watchedMovies)
  const cacheState = await getRecommendationCacheState(supabase, user.id, watchedHash)

  if (!isGetNew && !isRefresh && cacheState.freshRecommendationIds) {
    return buildSuccessResponse(cacheState.freshRecommendationIds, true)
  }

  const myListMovies = await fetchMyListMovies(supabase, user.id)

  if (isGetNew) {
    excludedMovies = cacheState.storedRecommendationIds.map((tmdbId) => ({
      name: '',
      originalName: '',
      year: 0,
      tmdbId,
    }))
  }

  let recommendations: RecommendationWithId[]
  try {
    const generatedRecommendations = await getRecommendationsFromGemini(
      watchedMovies,
      myListMovies,
      user.id,
      event,
      excludedMovies
    )

    recommendations = filterValidRecommendations(generatedRecommendations)

    if (!canStoreRecommendations(generatedRecommendations)) {
      throw createInsufficientRecommendationsError()
    }
  } catch (error) {
    if (cacheState.storedRecommendationIds.length === 0) {
      throw error
    }

    return buildFailureResponse(normalizeRegenerationError(error), cacheState.storedRecommendationIds)
  }

  await storeCachedRecommendations(supabase, user.id, recommendations, watchedHash)

  return buildSuccessResponse(toRecommendationIds(recommendations), false)
})
