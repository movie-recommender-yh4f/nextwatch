<template>
  <div v-if="loading" class="flex justify-center w-full py-10">
    <LoadingSpinner />
  </div>

  <div v-else class="w-full flex flex-col gap-10">
    <div class="w-full">
      <h3 class="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center justify-between">
        Watched Movies
        <span class="text-sm font-normal text-gray-500 dark:text-gray-400 bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded-full">{{
          movies.length
        }}</span>
      </h3>

      <div
        v-if="movies.length === 0"
        class="text-center text-gray-500 dark:text-gray-400 py-12 bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-300 dark:border-gray-600"
      >
        You haven't marked any movies as watched yet.
      </div>

      <div
        v-else
        class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6"
      >
        <div
          v-for="movie in movies"
          :key="movie.tmdbId"
          @click="$emit('open-details', movie)"
          class="aspect-[2/3] rounded-xl overflow-hidden bg-gray-200 dark:bg-gray-700 shadow-sm relative group cursor-pointer"
        >
          <img
            :src="posterUrl(movie.posterPath)"
            :alt="movie.title"
            class="w-full h-full object-cover"
          />
          <div
            class="absolute inset-0 bg-gradient-to-t from-gray-900/95 via-gray-900/40 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-end p-3"
          >
            <span
              class="text-sm sm:text-base text-white font-bold leading-tight line-clamp-2 drop-shadow-md"
              >{{ movie.title }}</span
            >
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { WatchedMovie } from '~/types/movie'

defineProps<{ movies: WatchedMovie[]; loading: boolean }>()
defineEmits<{ 'open-details': [movie: WatchedMovie] }>()
</script>
