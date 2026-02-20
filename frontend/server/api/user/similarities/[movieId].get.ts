import { getSimilaritiesById } from '~~/server/services/similarity-service'

export default defineEventHandler(async (event) => {
  const user = event.context.user

  const movieIdParam = getRouterParam(event, 'movieId')

  if (!movieIdParam) {
    throw createError({
      statusCode: 400,
      message: 'Movie ID is required',
    })
  }

  const movieId = parseInt(movieIdParam || '')
  if (isNaN(movieId)) {
    throw createError({
      statusCode: 400,
      message: 'Invalid movie ID format',
    })
  }

  const result = await getSimilaritiesById(movieId, {
    limit: 100, // Fixed limit od 100
  })

  if (!result) {
    throw createError({
      statusCode: 404,
      message: `No similarities found for movie ID ${movieId}`,
    })
  }

  return result
})
