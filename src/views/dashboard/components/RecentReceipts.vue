<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Icon } from '@iconify/vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { ReceiptService, type IReceipt } from '@/services/receipt.service'

const router    = useRouter()
const authStore = useAuthStore()

const receipts  = ref<IReceipt[]>([])
const isLoading = ref(true)

const statusConfig: Record<string, { label: string; classes: string }> = {
  finalized: { label: 'Finalized', classes: 'bg-green-500/10 text-green-400 border border-green-500/20' },
  draft:     { label: 'Draft',     classes: 'bg-gray-500 text-gray-900 border border-gray-500' },
  void:      { label: 'Void',      classes: 'bg-gray-500 text-gray-700 border border-gray-500' },
}

const avatarColors = ['#4ade80', '#a78bfa', '#f87171', '#34d399', '#fbbf24', '#38bdf8', '#fb923c', '#e879f9']

function clientName(rec: IReceipt) {
  return rec.to_name || rec.to_company || 'Unknown'
}

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

function avatarColor(id: string) {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash)
  return avatarColors[Math.abs(hash) % avatarColors.length]
}

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function fmtAmount(rec: IReceipt) {
  const total = rec.totals?.total ?? 0
  return `${rec.currency ?? '$'} ${total.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
}

onMounted(async () => {
  const orgId = authStore.getCurrentOrganization?.id
  if (!orgId) { isLoading.value = false; return }
  try {
    const res = await ReceiptService.list(orgId, { per_page: 6 })
    receipts.value = res.data.data.data ?? []
  } catch {
    // silently fail
  } finally {
    isLoading.value = false
  }
})
</script>

<template>
  <div class="bg-gray-200 border border-gray-400 rounded-xl">
    <!-- Header -->
    <div class="flex items-center justify-between px-5 py-4 border-b border-gray-400">
      <h3 class="text-sm font-semibold text-gray-1000">Recent Receipts</h3>
      <router-link
        :to="{ name: 'receipts' }"
        class="text-xs text-green-700 hover:text-green-800 transition-colors flex items-center gap-1"
      >
        View all <span>→</span>
      </router-link>
    </div>

    <!-- Skeleton -->
    <div v-if="isLoading" class="animate-pulse divide-y divide-gray-400">
      <div v-for="i in 5" :key="i" class="flex items-center gap-3 px-5 py-3.5">
        <div class="w-8 h-8 rounded-full bg-gray-400 shrink-0" />
        <div class="flex-1 min-w-0">
          <div class="w-28 h-3.5 rounded bg-gray-400 mb-1.5" />
          <div class="w-20 h-3 rounded bg-gray-500" />
        </div>
        <div class="w-16 h-3.5 rounded bg-gray-400" />
        <div class="w-14 h-5 rounded-full bg-gray-400" />
        <div class="w-10 h-3 rounded bg-gray-500" />
      </div>
    </div>

    <!-- Empty state -->
    <div v-else-if="receipts.length === 0" class="flex flex-col items-center justify-center py-10 gap-2">
      <Icon icon="lucide:receipt" class="w-8 h-8 text-gray-700/40" />
      <p class="text-xs text-gray-700">No receipts yet</p>
    </div>

    <template v-else>
      <!-- Table (desktop) -->
      <div class="hidden sm:block overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-gray-400">
              <th class="text-left text-[10px] font-semibold uppercase tracking-wider text-gray-700 px-5 py-3">Recipient</th>
              <th class="text-left text-[10px] font-semibold uppercase tracking-wider text-gray-700 px-3 py-3">Amount</th>
              <th class="text-left text-[10px] font-semibold uppercase tracking-wider text-gray-700 px-3 py-3">Status</th>
              <th class="text-left text-[10px] font-semibold uppercase tracking-wider text-gray-700 px-3 py-3">Date</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="rec in receipts"
              :key="rec.id"
              class="border-b border-gray-400 last:border-0 hover:bg-gray-400/40 transition-colors cursor-pointer"
              @click="router.push({ name: 'receipts.view', params: { id: rec.id } })"
            >
              <td class="px-5 py-3.5">
                <div class="flex items-center gap-3">
                  <div
                    class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-bg-100 shrink-0"
                    :style="{ backgroundColor: avatarColor(rec.id) }"
                  >
                    {{ initials(clientName(rec)) }}
                  </div>
                  <div>
                    <div class="text-sm font-medium text-gray-1000 leading-tight">{{ clientName(rec) }}</div>
                    <div class="text-xs text-gray-700">{{ rec.number }}</div>
                  </div>
                </div>
              </td>
              <td class="px-3 py-3.5 text-sm font-semibold text-gray-1000">{{ fmtAmount(rec) }}</td>
              <td class="px-3 py-3.5">
                <span :class="['text-xs font-semibold px-2.5 py-1 rounded-full', statusConfig[rec.status]?.classes ?? '']">
                  {{ statusConfig[rec.status]?.label ?? rec.status }}
                </span>
              </td>
              <td class="px-3 py-3.5 text-sm text-gray-900">{{ fmtDate(rec.issue_date) }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Mobile list -->
      <div class="sm:hidden divide-y divide-gray-400">
        <div
          v-for="rec in receipts"
          :key="rec.id"
          class="flex items-center justify-between px-4 py-3.5 hover:bg-gray-400/40 transition-colors cursor-pointer"
          @click="router.push({ name: 'receipts.view', params: { id: rec.id } })"
        >
          <div class="flex items-center gap-3">
            <div
              class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-bg-100 shrink-0"
              :style="{ backgroundColor: avatarColor(rec.id) }"
            >
              {{ initials(clientName(rec)) }}
            </div>
            <div>
              <div class="text-sm font-medium text-gray-1000">{{ clientName(rec) }}</div>
              <div class="text-xs text-gray-700">{{ rec.number }} · {{ fmtDate(rec.issue_date) }}</div>
            </div>
          </div>
          <div class="flex flex-col items-end gap-1.5">
            <span class="text-sm font-semibold text-gray-1000">{{ fmtAmount(rec) }}</span>
            <span :class="['text-xs font-semibold px-2 py-0.5 rounded-full', statusConfig[rec.status]?.classes ?? '']">
              {{ statusConfig[rec.status]?.label ?? rec.status }}
            </span>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
