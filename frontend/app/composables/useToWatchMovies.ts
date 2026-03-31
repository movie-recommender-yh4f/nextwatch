import type { WatchedMovie, PendingWatchedMovie, MoviePreview } from '~/types/movie'

const PENDING_TO_WATCH_STORAGE_KEY = 'movie-recommender-pending-to-watch'

export const useToWatchMovies = () => {
  const { IMAGE_BASE } = useMovieDetails()
  const supabase = useSupabase()

  const toWatchMovies = useState<WatchedMovie[]>('to-watch', () => [])
  const pendingToWatchMovies = useState<PendingWatchedMovie[]>('pending-to-watch', () => [])

  const loadPendingToWatchFromStorage = () => {
    if (!import.meta.client) return

    try {
      const raw = window.localStorage.getItem(PENDING_TO_WATCH_STORAGE_KEY)
      if (!raw) {
        pendingToWatchMovies.value = []
        return
      }

      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        pendingToWatchMovies.value = parsed.filter(
          (movie): movie is PendingWatchedMovie =>
            typeof movie?.id === 'number' &&
            typeof movie?.title === 'string' &&
            typeof movie?.year === 'number' &&
            typeof movie?.posterPath === 'string'
        )
      }
    } catch (error) {
      console.error('Failed to read pending to-watch movies from storage:', error)
      pendingToWatchMovies.value = []
    }
  }

  const persistPendingToWatchToStorage = () => {
    if (!import.meta.client) return

    try {
      if (pendingToWatchMovies.value.length === 0) {
        window.localStorage.removeItem(PENDING_TO_WATCH_STORAGE_KEY)
        return
      }

      window.localStorage.setItem(
        PENDING_TO_WATCH_STORAGE_KEY,
        JSON.stringify(pendingToWatchMovies.value)
      )
    } catch (error) {
      console.error('Failed to persist pending to-watch movies to storage:', error)
    }
  }

  const clearToWatchMovies = () => {
    toWatchMovies.value = []
  }

  const syncToWatchMoviesFromSupabase = async (accessToken?: string) => {
    try {
      let token = accessToken

      if (!token) {
        const {
          data: { session },
        } = await supabase.auth.getSession()

        token = session?.access_token
      }

      if (!token) {
        toWatchMovies.value = []
        return
      }

      const response = await $fetch<{ success: boolean; movies: WatchedMovie[] }>('/api/to-watch', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      toWatchMovies.value = response.movies
    } catch (error) {
      console.error('Failed to load to-watch movies from Supabase:', error)
    }
  }

  const markAsToWatch = async (
    movie: Pick<MoviePreview, 'id' | 'title' | 'year' | 'poster'>
  ): Promise<'ok' | 'unauthorized' | 'error'> => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.access_token) {
        return 'unauthorized'
      }

      const posterPath = movie.poster.slice(IMAGE_BASE.length)

      if (!toWatchMovies.value.some((s) => s.tmdbId === movie.id)) {
        toWatchMovies.value.push({
          tmdbId: movie.id,
          title: movie.title,
          year: movie.year,
          posterPath,
        })
      }

      $fetch('/api/to-watch', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: {
          movie: {
            tmdbId: movie.id,
            title: movie.title,
            year: movie.year,
            posterPath,
          },
        },
      })
    } catch (error) {
      console.error('Failed to mark movie as to-watch in Supabase:', error)
      return 'error'
    }

    return 'ok'
  }

  const queuePendingToWatchMovie = (
    movie: Pick<MoviePreview, 'id' | 'title' | 'year' | 'poster'>
  ) => {
    if (pendingToWatchMovies.value.some((pendingMovie) => pendingMovie.id === movie.id)) {
      return
    }

    pendingToWatchMovies.value.push({
      id: movie.id,
      title: movie.title,
      year: movie.year,
      posterPath: movie.poster.slice(IMAGE_BASE.length),
    })

    persistPendingToWatchToStorage()
  }

  const processPendingToWatchMovies = async (accessToken?: string): Promise<number> => {
    if (pendingToWatchMovies.value.length === 0) {
      loadPendingToWatchFromStorage()
    }

    if (pendingToWatchMovies.value.length === 0) {
      return 0
    }

    try {
      let token = accessToken

      if (!token) {
        const {
          data: { session },
        } = await supabase.auth.getSession()

        token = session?.access_token
      }

      if (!token) {
        return 0
      }

      let processedCount = 0
      const queueSnapshot = [...pendingToWatchMovies.value]

      for (const movie of queueSnapshot) {
        if (toWatchMovies.value.some((s) => s.tmdbId === movie.id)) {
          pendingToWatchMovies.value = pendingToWatchMovies.value.filter(
            (pendingMovie) => pendingMovie.id !== movie.id
          )
          persistPendingToWatchToStorage()
          processedCount++
          continue
        }

        try {
          $fetch('/api/to-watch', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
            },
            body: {
              movie: {
                tmdbId: movie.id,
                title: movie.title,
                year: movie.year,
                posterPath: movie.posterPath,
              },
            },
          })

          if (!toWatchMovies.value.some((s) => s.tmdbId === movie.id)) {
            toWatchMovies.value.push({
              tmdbId: movie.id,
              title: movie.title,
              year: movie.year,
              posterPath: movie.posterPath,
            })
          }

          pendingToWatchMovies.value = pendingToWatchMovies.value.filter(
            (pendingMovie) => pendingMovie.id !== movie.id
          )

          persistPendingToWatchToStorage()
          processedCount++
        } catch (error) {
          console.error(`Failed to process pending to-watch movie ${movie.id}:`, error)
        }
      }

      return processedCount
    } catch (error) {
      console.error('Failed to process pending to-watch movies:', error)
      return 0
    }
  }

  return {
    toWatchMovies,
    pendingToWatchMovies,
    markAsToWatch,
    queuePendingToWatchMovie,
    processPendingToWatchMovies,
    syncToWatchMoviesFromSupabase,
    clearToWatchMovies,
  }
}
