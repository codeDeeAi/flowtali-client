<script setup lang="ts">
import { RouterView } from 'vue-router'
import { useEmbedTheme } from '@/composables/useEmbedTheme'

useEmbedTheme()
</script>

<template>
  <div class="embed-root w-full h-full min-h-screen bg-charcoal-900 text-cream overflow-auto">
    <RouterView />
  </div>
</template>

<style scoped>
.embed-root {
  /* Respect --embed-radius for any component that opts in */
  --radius: var(--embed-radius, 7px);
}
</style>
