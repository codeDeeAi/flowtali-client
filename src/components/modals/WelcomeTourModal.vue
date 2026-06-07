<script setup lang="ts">
import { Icon } from '@iconify/vue'

const emit = defineEmits<{
  startTour: []
  skip: []
}>()
</script>

<template>
  <Teleport to="body">
    <div class="fixed inset-0 bg-black/70 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
      <div class="bg-charcoal-800 border border-charcoal-700 rounded-2xl p-8 w-full max-w-md shadow-2xl">

        <!-- Icon -->
        <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber to-amber-light flex items-center justify-center mb-6 mx-auto">
          <Icon icon="lucide:map" class="w-7 h-7 text-charcoal-900" />
        </div>

        <!-- Text -->
        <div class="text-center mb-8">
          <h2 class="font-display text-2xl font-semibold text-cream mb-2">Welcome to Flowtali!</h2>
          <p class="text-cream-faint text-sm leading-relaxed">
            We'll help you hit the ground running. Would you like a quick tour of the key features?
          </p>
        </div>

        <!-- Highlights -->
        <div class="grid grid-cols-3 gap-3 mb-8">
          <div class="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-charcoal-700/50">
            <Icon icon="lucide:file-text" class="w-5 h-5 text-amber" />
            <span class="text-[11px] text-cream-faint text-center">Invoices</span>
          </div>
          <div class="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-charcoal-700/50">
            <Icon icon="lucide:users" class="w-5 h-5 text-amber" />
            <span class="text-[11px] text-cream-faint text-center">Clients</span>
          </div>
          <div class="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-charcoal-700/50">
            <Icon icon="lucide:bar-chart-2" class="w-5 h-5 text-amber" />
            <span class="text-[11px] text-cream-faint text-center">Analytics</span>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex flex-col gap-2.5">
          <button
            class="w-full py-3 rounded-xl bg-amber hover:bg-amber-light text-charcoal-900 font-semibold text-sm transition-colors flex items-center justify-center gap-2"
            @click="emit('startTour')"
          >
            <Icon icon="lucide:play" class="w-4 h-4" />
            Take a tour
          </button>
          <button
            class="w-full py-2.5 rounded-xl text-cream-faint hover:text-cream text-sm transition-colors"
            @click="emit('skip')"
          >
            Skip for now
          </button>
        </div>

      </div>
    </div>
  </Teleport>
</template>
