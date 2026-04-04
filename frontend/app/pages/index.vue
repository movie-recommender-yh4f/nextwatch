<template>
  <div class="h-full flex flex-col bg-gray-50 dark:bg-gray-900 relative overflow-hidden">
    <div class="flex-1 relative w-full px-6 py-4 flex flex-col items-center justify-center mt-4">
      <div v-if="pending" class="flex flex-col items-center text-gray-400 dark:text-gray-500">
        <LoadingSpinner size="h-10 w-10" class="mb-4" />
        <p>Finding movies...</p>
      </div>

      <div v-else-if="movies.length === 0" class="text-center text-gray-500 dark:text-gray-400">
        <p class="text-xl font-medium mb-2">You're all caught up!</p>
        <p class="text-sm">Check back later for more movies.</p>
      </div>

      <div v-else class="w-full max-w-sm h-[65vh] relative mx-auto">
        <MovieCard
          :movie="currentMovieFormatted"
          @dislike="handleDislike"
          @watched="handleLike"
          @to-watch="handleLike"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'

const { getPopularMovies } = useMovieDetails()
const { markAsWatched, queuePendingWatchedMovie } = useWatchedMovies()
const { isAuthenticated } = useAuth()
const router = useRouter()

const movies = ref([])
const pending = ref(true)

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

onMounted(async () => {
  try {
    const popular = await getPopularMovies()
    movies.value = popular
  } catch (error) {
    console.error(error)
  } finally {
    pending.value = false
  }
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
    router.push('/profile')
  }
}


</script>
