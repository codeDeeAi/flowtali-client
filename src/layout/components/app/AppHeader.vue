<script setup lang="ts">
import { ref } from 'vue';
import { Icon } from '@iconify/vue';

defineEmits<{
  toggleSidebar: [];
}>();

const searchQuery = ref('');
</script>

<template>
  <nav class="flex items-center justify-between px-4 h-14 bg-dark-light border-b border-charcoal-700 shrink-0 z-10">

    <!-- Left: Mobile hamburger + breadcrumb -->
    <div class="flex items-center gap-3">
      <!-- Hamburger (mobile only) -->
      <button
        class="md:hidden flex items-center justify-center w-8 h-8 rounded-md text-cream-muted hover:text-cream hover:bg-charcoal-700 transition-colors"
        @click="$emit('toggleSidebar')"
        aria-label="Toggle sidebar"
      >
        <Icon icon="lucide:menu" class="w-5 h-5" />
      </button>

      <!-- Mobile logo -->
      <div class="md:hidden flex items-center gap-2">
        <div class="w-6 h-6 rounded bg-amber flex items-center justify-center">
          <Icon icon="lucide:zap" class="w-3.5 h-3.5 text-charcoal-900" />
        </div>
        <span class="font-semibold text-cream text-sm">Flowtali</span>
      </div>

      <!-- Desktop breadcrumb -->
      <div class="hidden md:flex items-center gap-1.5 text-sm">
        <span class="text-cream-muted">Acme Design Studio</span>
        <Icon icon="lucide:chevron-right" class="w-3.5 h-3.5 text-cream-faint" />
        <span class="text-cream font-medium">Dashboard</span>
      </div>
    </div>

    <!-- Center: Search (hidden on mobile) -->
    <div class="hidden md:flex items-center gap-2 bg-charcoal-800 border border-charcoal-600 rounded-lg px-3 py-1.5 w-72 group focus-within:border-charcoal-500 transition-colors">
      <Icon icon="lucide:search" class="w-4 h-4 text-cream-faint shrink-0" />
      <input
        v-model="searchQuery"
        type="text"
        placeholder="Search invoices, clients..."
        class="bg-transparent text-sm text-cream placeholder-cream-faint outline-none flex-1 min-w-0"
      />
      <kbd class="hidden lg:flex items-center gap-0.5 text-cream-faint text-xs border border-charcoal-500 rounded px-1 py-0.5 font-mono shrink-0">
        ⌘K
      </kbd>
    </div>

    <!-- Right: Actions -->
    <div class="flex items-center gap-2">
      <!-- Mobile search icon -->
      <button class="md:hidden flex items-center justify-center w-8 h-8 rounded-md text-cream-muted hover:text-cream hover:bg-charcoal-700 transition-colors">
        <Icon icon="lucide:search" class="w-4 h-4" />
      </button>

      <!-- New button -->
      <button class="flex items-center gap-1.5 bg-amber hover:bg-amber-light text-charcoal-900 font-semibold text-sm px-3 py-1.5 rounded-lg transition-colors">
        <Icon icon="lucide:plus" class="w-4 h-4" />
        <span>New</span>
      </button>

      <!-- Notifications -->
      <button class="relative flex items-center justify-center w-8 h-8 rounded-md text-cream-muted hover:text-cream hover:bg-charcoal-700 transition-colors">
        <Icon icon="lucide:bell" class="w-4 h-4" />
        <span class="absolute top-1 right-1 w-1.5 h-1.5 bg-amber rounded-full"></span>
      </button>

      <!-- User avatar -->
      <button class="flex items-center gap-2 rounded-lg px-1.5 py-1 hover:bg-charcoal-700 transition-colors group">
        <div class="w-7 h-7 rounded-full bg-amber flex items-center justify-center text-xs font-bold text-charcoal-900 shrink-0">
          AL
        </div>
        <Icon icon="lucide:chevron-down" class="hidden sm:block w-3.5 h-3.5 text-cream-faint group-hover:text-cream-muted transition-colors" />
      </button>
    </div>

  </nav>
</template>