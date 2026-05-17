<script setup lang="ts">
import { Icon } from '@iconify/vue';

const actions = [
  { label: 'Create Invoice', icon: 'lucide:file-plus' },
  { label: 'Create Letterhead', icon: 'lucide:file-text' },
  { label: 'Add Client', icon: 'lucide:user-plus' },
  { label: 'Invite Member', icon: 'lucide:user-round-plus' },
];
</script>

<template>
  <div class="bg-charcoal-800 border border-charcoal-700 rounded-xl p-5">
    <h3 class="text-sm font-semibold text-cream mb-3">Quick Actions</h3>
    <div class="flex flex-col gap-1">
      <button v-for="action in actions" :key="action.label"
        class="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg hover:bg-charcoal-700 text-cream-muted hover:text-cream transition-colors text-left group">
        <div
          class="w-7 h-7 rounded-md bg-charcoal-700 group-hover:bg-charcoal-600 flex items-center justify-center shrink-0 transition-colors">
          <Icon :icon="action.icon" class="w-3.5 h-3.5 text-amber" />
        </div>
        <span class="text-sm">{{ action.label }}</span>
      </button>
    </div>
  </div>
</template>
