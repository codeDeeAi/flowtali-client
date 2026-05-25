<script setup lang="ts">
import { computed } from 'vue';
import { Icon } from '@iconify/vue';
import { useRouter } from 'vue-router';
import { usePermissions } from '@/composables/usePermissions';

const router = useRouter()
const { can, isBusinessOrg } = usePermissions()

const allActions = [
  { label: 'Create Invoice',    icon: 'lucide:file-plus',       route: 'invoices.create',    permission: 'invoices.read'    },
  { label: 'Create Receipt',    icon: 'lucide:receipt',         route: 'receipts.create',    permission: 'receipts.read'    },
  { label: 'Create Letterhead', icon: 'lucide:file-text',       route: 'letterheads.create', permission: 'letterheads.read' },
  { label: 'Add Client',        icon: 'lucide:user-plus',       route: 'clients.create',     permission: 'clients.read'     },
  { label: 'Invite Member',     icon: 'lucide:user-round-plus', route: 'members',            permission: 'members.read',    businessOnly: true },
]

const actions = computed(() =>
  allActions.filter(a => {
    if (a.businessOnly && !isBusinessOrg.value) return false
    return can(a.permission)
  })
)
</script>

<template>
  <div v-if="actions.length" class="bg-charcoal-800 border border-charcoal-700 rounded-xl p-5">
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
