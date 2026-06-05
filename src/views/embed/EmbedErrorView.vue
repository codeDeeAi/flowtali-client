<script setup lang="ts">
import { useRoute } from 'vue-router'
const route = useRoute()
const message = route.query.message as string || 'Access denied. Invalid or expired embed token.'
</script>

<template>
  <div class="flex flex-col items-center justify-center h-screen gap-3 px-6 text-center">
    <div class="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
      <svg class="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M12 3a9 9 0 100 18A9 9 0 0012 3z" />
      </svg>
    </div>
    <p class="text-cream text-sm font-medium">{{ message }}</p>
  </div>
</template>
