<template>
  <div class="h-full flex flex-col bg-gray-50 dark:bg-gray-900 relative overflow-hidden">
    <div class="flex-1 relative w-full px-6 py-4 flex flex-col items-center justify-center mt-4">
      <div v-if="pending" class="w-full max-w-sm h-[65vh] relative mx-auto">
        <SkeletonMovieCard />
      </div>

      <div v-else-if="movies.length === 0" class="text-center text-gray-500 dark:text-gray-400">
        <p class="text-xl font-medium mb-2">You're all caught up!</p>
        <p class="text-sm mb-6">Ready for another round?</p>
        <button
          @click="refreshMovies"
          :disabled="pending"
          class="inline-flex items-center gap-2 px-6 py-3 bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white font-semibold rounded-full transition-colors"
        >
          <svg class="w-5 h-5" :class="{ 'animate-spin': pending }" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Load More Movies
        </button>
      </div>

      <div v-else class="w-full max-w-sm h-[65vh] relative mx-auto">
        <Transition name="card" mode="out-in">
          <MovieCard
            :key="currentMovieFormatted?.id"
            :movie="currentMovieFormatted"
            @dislike="handleDislike"
            @watched="handleLike"
            @to-watch="handleLike"
          />
        </Transition>
      </div>
    </div>

    <LoginPromptModal :is-open="showLoginModal" @close="handleModalClose" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'

const { getPopularMovies } = useMovieDetails()
const { markAsWatched, queuePendingWatchedMovie, removePendingWatchedMovie } = useWatchedMovies()
const { isAuthenticated } = useAuth()

const movies = useState('discovery-movies', () => [])
const hasLoaded = useState('discovery-has-loaded', () => false)
const pending = ref(true)
const showLoginModal = ref(false)
const pendingModalMovieId = ref(null)

const currentMovie = computed(() => movies.value[0] || null)

const currentMovieFormatted = computed(() => {
  const movie = movies.value[0]
  if (!movie) return null

  return {
    ...movie,
    image: movie.poster || posterUrl(movie.poster_path),
    genre: movie.genres?.join(', ') || 'Unknown Genre',
    director: movie.director || null,
  }
})

const fetchMovies = async () => {
  pending.value = true
  try {
    const popular = await getPopularMovies()
    movies.value = popular
  } catch {
    // failed to load popular movies without crashing the app, just show empty state
  } finally {
    hasLoaded.value = true
    pending.value = false
  }
}

const refreshMovies = () => fetchMovies()

onMounted(() => {
  if (hasLoaded.value) {
    pending.value = false
    return
  }
  fetchMovies()
})

const handleDislike = () => {
  if (movies.value.length > 0) {
    movies.value.shift()
  }
}

const handleLike = async () => {
  if (!currentMovie.value) return

  const movieToSave = currentMovie.value

  movies.value.shift()

  if (isAuthenticated.value) {
    const status = await markAsWatched(movieToSave)
    if (status === 'unauthorized' || status === 'error') {
      queuePendingWatchedMovie(movieToSave)
    }
  } else {
    queuePendingWatchedMovie(movieToSave)
    pendingModalMovieId.value = movieToSave.id
    showLoginModal.value = true
  }
}

const handleModalClose = () => {
  showLoginModal.value = false
  if (!isAuthenticated.value && pendingModalMovieId.value !== null) {
    removePendingWatchedMovie(pendingModalMovieId.value)
  }
  pendingModalMovieId.value = null
}
</script>
