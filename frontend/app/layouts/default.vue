<template>
  <div class="bg-gray-100 h-screen w-full flex font-sans overflow-hidden">
    <div class="bg-white w-full h-full flex flex-col relative overflow-hidden">
      <TopNav />
      <main class="flex-1 relative overflow-hidden">
        <slot />
      </main>
    </div>
  </div>
</template>
