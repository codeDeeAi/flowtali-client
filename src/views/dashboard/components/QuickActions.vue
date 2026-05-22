<script setup lang="ts">
import { Icon } from '@iconify/vue';
import { useRouter } from 'vue-router';

const router = useRouter()

const actions = [
  { label: 'Create Invoice',    icon: 'lucide:file-plus',      route: 'invoices.create'     },
  { label: 'Create Letterhead', icon: 'lucide:file-text',      route: 'letterheads.create'  },
  { label: 'Add Client',        icon: 'lucide:user-plus',      route: 'clients.create'      },
  { label: 'Invite Member',     icon: 'lucide:user-round-plus', route: 'members'             },
];
</script>

<template>
  <div class="bg-charcoal-800 border border-charcoal-700 rounded-xl p-5">
    <h3 class="text-sm font-semibold text-cream mb-3">Quick Actions</h3>
    <div class="flex flex-col gap-1">
      <button
        v-for="action in actions"
        :key="action.label"
        class="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg hover:bg-charcoal-700 text-cream-muted hover:text-cream transition-colors text-left group"
        @click="router.push({ name: action.route })"
      >
        <div class="w-7 h-7 rounded-md bg-charcoal-700 group-hover:bg-charcoal-600 flex items-center justify-center shrink-0 transition-colors">
          <Icon :icon="action.icon" class="w-3.5 h-3.5 text-amber" />
        </div>
        <span class="text-sm">{{ action.label }}</span>
      </button>
    </div>
  </div>
</template>
