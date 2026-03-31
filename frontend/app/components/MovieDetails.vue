<template>
  <div
    v-if="isOpen && movie"
    class="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 sm:p-6 backdrop-blur-sm"
    @click.self="$emit('close')"
  >
    <div
      class="bg-gray-900 rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl relative flex flex-col max-h-[90vh]"
    >
      <button
        @click="$emit('close')"
        class="absolute top-3 right-3 text-white bg-black/50 hover:bg-black/80 rounded-full p-2 z-10 transition-colors"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M6 18L18 6M6 6l12 12"
          ></path>
        </svg>
      </button>

      <div class="relative w-full pt-[56.25%] bg-black flex-shrink-0">
        <iframe
          v-if="movie.trailerUrl"
          :src="movie.trailerUrl"
          class="absolute top-0 left-0 w-full h-full"
          frameborder="0"
          allow="autoplay; encrypted-media"
          allowfullscreen
        ></iframe>
        <div
          v-else
          class="absolute top-0 left-0 w-full h-full flex items-center justify-center text-gray-500"
        >
          <span class="flex flex-col items-center gap-2">
            <svg class="w-12 h-12 opacity-50" fill="currentColor" viewBox="0 0 24 24">
              <path
                d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"
              />
            </svg>
            Trailer not available
          </span>
        </div>
      </div>

      <div class="p-6 overflow-y-auto text-white">
        <h2 class="text-2xl sm:text-3xl font-bold mb-2">
          {{ movie.title }}
        </h2>

        <div class="flex items-center gap-4 text-sm text-gray-400 mb-4">
          <span v-if="movie.year">{{ movie.year }}</span>
          <span v-if="movie.rating" class="flex items-center gap-1 text-amber-500">
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
              />
            </svg>
            {{ movie.rating }}
          </span>
        </div>

        <p class="text-gray-300 leading-relaxed">
          {{ movie.description || movie.overview || 'No description available for this movie.' }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Movie } from '~/types/movie'

defineProps<{
  isOpen: boolean
  movie: Movie | null
}>()

defineEmits(['close'])
</script>
