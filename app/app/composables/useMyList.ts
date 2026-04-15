import type {
  MyListMovie,
  MoviePreview,
  PendingMyListMovie,
  WatchedMovie,
  MyListPatchBody,
} from '~/types/movie'

const PENDING_MY_LIST_STORAGE_KEY = 'movie-recommender-pending-my-list'

const isPendingMyListMovie = (movie: unknown): movie is PendingMyListMovie => {
  if (!movie || typeof movie !== 'object') {
    return false
  }

  const pendingMovie = movie as Record<string, unknown>

  return (
    typeof pendingMovie.id === 'number' &&
    typeof pendingMovie.title === 'string' &&
    typeof pendingMovie.year === 'number' &&
    typeof pendingMovie.posterPath === 'string'
  )
}

export const useMyList = () => {
  const supabase = useSupabase()

  const myList = useState<MyListMovie[]>('my-list', () => [])
  const watchedMovies = useState<WatchedMovie[]>('watched', () => [])
  const pendingMyListMovies = useState<PendingMyListMovie[]>('pending-my-list', () => [])

  const loadPendingMyListFromStorage = () => {
    if (!import.meta.client) return

    try {
      const raw = window.localStorage.getItem(PENDING_MY_LIST_STORAGE_KEY)
      if (!raw) {
        pendingMyListMovies.value = []
        return
      }

      const parsed: unknown = JSON.parse(raw)
      if (!Array.isArray(parsed)) {
        pendingMyListMovies.value = []
        return
      }

      pendingMyListMovies.value = parsed.filter(isPendingMyListMovie)
    } catch {
      pendingMyListMovies.value = []
    }
  }

  const persistPendingMyListToStorage = () => {
    if (!import.meta.client) return

    try {
      if (pendingMyListMovies.value.length === 0) {
        window.localStorage.removeItem(PENDING_MY_LIST_STORAGE_KEY)
        return
      }

      window.localStorage.setItem(
        PENDING_MY_LIST_STORAGE_KEY,
        JSON.stringify(pendingMyListMovies.value)
      )
    } catch {
      // persist failed silently
    }
  }

  const clearMyList = () => {
    myList.value = []
  }

  const syncMyListFromSupabase = async (accessToken?: string) => {
    try {
      let token = accessToken

      if (!token) {
        const {
          data: { session },
        } = await supabase.auth.getSession()

        token = session?.access_token
      }

      if (!token) {
        myList.value = []
        return
      }

      const response = await $fetch<{ success: boolean; movies: MyListMovie[] }>('/api/mylist', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      myList.value = response.movies

      const { getMovieDetails } = useMovieDetails()

      for (const movie of myList.value) {
        if (
          movie.genres &&
          movie.genres.length > 0 &&
          movie.runtime !== undefined &&
          movie.posterPath
        ) {
          continue
        }

        try {
          const details = await getMovieDetails(movie.tmdbId)
          const patch: MyListPatchBody = { tmdbId: movie.tmdbId }

          if (!movie.genres || movie.genres.length === 0) {
            patch.genres = details.genres
            movie.genres = details.genres
          }
          if (movie.runtime === undefined) {
            patch.runtime = details.runtime
            movie.runtime = details.runtime
          }
          if (!movie.posterPath) {
            patch.posterPath = posterPath(details.poster)
            movie.posterPath = posterPath(details.poster)
          }

          await $fetch('/api/mylist', {
            method: 'PATCH',
            headers: { Authorization: `Bearer ${token}` },
            body: patch,
          })
        } catch {
          // best-effort enrichment
        }
      }
    } catch {
      // failed to load my list
    }
  }

  const addToMyList = async (
    movie: Pick<MoviePreview, 'id' | 'title' | 'year' | 'poster'> & {
      genres?: string[]
      runtime?: number | null
    }
  ): Promise<'ok' | 'unauthorized' | 'error'> => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.access_token) {
        return 'unauthorized'
      }

      const path = posterPath(movie.poster)

      const alreadyInState = myList.value.some((m) => m.tmdbId === movie.id)
      if (!alreadyInState) {
        const entry: MyListMovie = {
          tmdbId: movie.id,
          title: movie.title,
          year: movie.year,
          posterPath: path,
        }
        if (movie.genres?.length) entry.genres = movie.genres
        if (typeof movie.runtime === 'number') entry.runtime = movie.runtime
        myList.value.push(entry)
      }

      try {
        await $fetch('/api/mylist', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          body: {
            movie: {
              tmdbId: movie.id,
              title: movie.title,
              year: movie.year,
              posterPath: path,
              ...(movie.genres?.length ? { genres: movie.genres } : {}),
              ...(typeof movie.runtime === 'number' ? { runtime: movie.runtime } : {}),
            },
          },
        })
      } catch {
        if (!alreadyInState) {
          myList.value = myList.value.filter((m) => m.tmdbId !== movie.id)
        }
        return 'error'
      }
    } catch {
      return 'error'
    }

    return 'ok'
  }

  const removeFromMyList = async (tmdbId: number): Promise<'ok' | 'unauthorized' | 'error'> => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.access_token) {
        return 'unauthorized'
      }

      myList.value = myList.value.filter((m) => m.tmdbId !== tmdbId)

      await $fetch('/api/mylist', {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: { tmdbId },
      })
    } catch {
      await syncMyListFromSupabase()
      return 'error'
    }

    return 'ok'
  }

  const queuePendingMyListMovie = (
    movie: Pick<MoviePreview, 'id' | 'title' | 'year' | 'poster'> & {
      genres?: string[]
      runtime?: number | null
    }
  ) => {
    if (pendingMyListMovies.value.some((pendingMovie) => pendingMovie.id === movie.id)) {
      return
    }

    const entry: PendingMyListMovie = {
      id: movie.id,
      title: movie.title,
      year: movie.year,
      posterPath: posterPath(movie.poster),
    }
    if (movie.genres?.length) entry.genres = movie.genres
    if (typeof movie.runtime === 'number') entry.runtime = movie.runtime

    pendingMyListMovies.value.push(entry)

    persistPendingMyListToStorage()
  }

  const removePendingMyListMovie = (movieId: number) => {
    pendingMyListMovies.value = pendingMyListMovies.value.filter((movie) => movie.id !== movieId)
    persistPendingMyListToStorage()
  }

  const processPendingMyListMovies = async (accessToken?: string): Promise<number> => {
    if (pendingMyListMovies.value.length === 0) {
      loadPendingMyListFromStorage()
    }

    if (pendingMyListMovies.value.length === 0) {
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
      const queueSnapshot = [...pendingMyListMovies.value]

      for (const movie of queueSnapshot) {
        const isAlreadyInMyList = myList.value.some((listMovie) => listMovie.tmdbId === movie.id)
        const isAlreadyWatched = watchedMovies.value.some(
          (watchedMovie) => watchedMovie.tmdbId === movie.id
        )

        if (isAlreadyInMyList || isAlreadyWatched) {
          removePendingMyListMovie(movie.id)
          processedCount++
          continue
        }

        try {
          await $fetch('/api/mylist', {
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
                ...(movie.genres?.length ? { genres: movie.genres } : {}),
                ...(typeof movie.runtime === 'number' ? { runtime: movie.runtime } : {}),
              },
            },
          })

          if (!myList.value.some((listMovie) => listMovie.tmdbId === movie.id)) {
            const entry: MyListMovie = {
              tmdbId: movie.id,
              title: movie.title,
              year: movie.year,
              posterPath: movie.posterPath,
            }
            if (movie.genres?.length) entry.genres = movie.genres
            if (typeof movie.runtime === 'number') entry.runtime = movie.runtime
            myList.value.push(entry)
          }

          removePendingMyListMovie(movie.id)
          processedCount++
        } catch {
          // failed to process pending movie
        }
      }

      return processedCount
    } catch {
      return 0
    }
  }

  return {
    myList,
    pendingMyListMovies,
    addToMyList,
    removeFromMyList,
    queuePendingMyListMovie,
    removePendingMyListMovie,
    processPendingMyListMovies,
    syncMyListFromSupabase,
    clearMyList,
  }
}
