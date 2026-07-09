<script setup lang="ts">
import { computed } from 'vue';
import { Icon } from '@iconify/vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { usePermissions } from '@/composables/usePermissions';

const router = useRouter()
const { t } = useI18n()
const { can, isBusinessOrg } = usePermissions()

const allActions = computed(() => [
  { label: t('dashboard.quickActions.createInvoice'),    icon: 'lucide:file-plus',       route: 'invoices.create',    permission: 'invoices.read'    },
  { label: t('dashboard.quickActions.createReceipt'),    icon: 'lucide:receipt',         route: 'receipts.create',    permission: 'receipts.read'    },
  { label: t('dashboard.quickActions.createLetterhead'), icon: 'lucide:file-text',       route: 'letterheads.create', permission: 'letterheads.read' },
  { label: t('dashboard.quickActions.addClient'),        icon: 'lucide:user-plus',       route: 'clients.create',     permission: 'clients.read'     },
  { label: t('dashboard.quickActions.inviteMember'),     icon: 'lucide:user-round-plus', route: 'members',            permission: 'members.read',    businessOnly: true },
])

const actions = computed(() =>
  allActions.value.filter(a => {
    if (a.businessOnly && !isBusinessOrg.value) return false
    return can(a.permission)
  })
)
</script>

<template>
  <div v-if="actions.length" class="bg-gray-200 border border-gray-400 rounded-xl p-5">
    <h3 class="text-sm font-semibold text-gray-1000 mb-3">{{ t('dashboard.quickActions.title') }}</h3>
    <div class="flex flex-col gap-1">
      <button
        v-for="action in actions"
        :key="action.label"
        class="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg hover:bg-gray-400 text-gray-900 hover:text-gray-1000 transition-colors text-left group"
        @click="router.push({ name: action.route })"
      >
        <div class="w-7 h-7 rounded-md bg-gray-400 group-hover:bg-gray-500 flex items-center justify-center shrink-0 transition-colors">
          <Icon :icon="action.icon" class="w-3.5 h-3.5 text-green-700" />
        </div>
        <span class="text-sm">{{ action.label }}</span>
      </button>
    </div>
  </div>
</template>
