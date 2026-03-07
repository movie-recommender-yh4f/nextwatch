const TMDB_API_URL = 'https://api.themoviedb.org/3'

export default defineEventHandler(async (event): Promise<any> => {
  const config = useRuntimeConfig()
  const query = getQuery(event)
  const path = event.context.params?.path as string | undefined
  const apiKey = config.tmdbApiKey || process.env.NUXT_TMDB_API_KEY || ''

  if (!path) {
    throw createError({
      statusCode: 400,
      message: 'Path parameter is required',
    })
  }

  if (!apiKey) {
    throw createError({
      statusCode: 500,
      message: 'TMDB API key is not configured. Set NUXT_TMDB_API_KEY.',
    })
  }

  try {
    return await $fetch(path, {
      baseURL: TMDB_API_URL,
      params: {
        api_key: apiKey,
        language: 'en-US',
        ...query,
      },
      headers: { Accept: 'application/json' },
    })
  } catch (error: any) {
    const statusCode = error.response?.status || 500
    const statusMessage =
      statusCode === 401
        ? 'TMDB request unauthorized. Check NUXT_TMDB_API_KEY.'
        : error.response?._data?.status_message || 'Failed to fetch data from TMDB.'

    throw createError({
      statusCode,
      statusMessage,
    })
  }
})
