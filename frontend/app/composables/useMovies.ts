export type { Movie, MoviePreview } from '~/types/movie'

interface WatchedMoviePayload {
  tmdbId: number
}

interface PendingWatchedMovie {
  id: number
  title: string
  year: number
}

export const useMovies = () => {
  const { IMAGE_BASE, getPopularMovies, getMovieDetails } = useMovieDetails()

  const {
    watchedMovies,
    pendingWatchedMovies,
    markAsWatched,
    queuePendingWatchedMovie,
    processPendingWatchedMovies,
    syncWatchedMoviesFromSupabase,
    clearWatchedMovies,
  } = useWatchedMovies()

  const {
    toWatchMovies,
    pendingToWatchMovies,
    markAsToWatch,
    queuePendingToWatchMovie,
    processPendingToWatchMovies,
    syncToWatchMoviesFromSupabase,
    clearToWatchMovies,
  } = useToWatchMovies()

  return {
    IMAGE_BASE,
    getPopularMovies,
    getMovieDetails,

    watchedMovies,
    pendingWatchedMovies,
    markAsWatched,
    queuePendingWatchedMovie,
    processPendingWatchedMovies,
    syncWatchedMoviesFromSupabase,
    clearWatchedMovies,

    // To Watch
    toWatchMovies,
    pendingToWatchMovies,
    markAsToWatch,
    queuePendingToWatchMovie,
    processPendingToWatchMovies,
    syncToWatchMoviesFromSupabase,
    clearToWatchMovies,
  }
}
