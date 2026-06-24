<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { Icon } from '@iconify/vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import http from '@/services/utils/http';

const router = useRouter()
const authStore = useAuthStore()

interface InvoiceRow {
  id: string
  number: string
  status: 'paid' | 'sent' | 'overdue' | 'draft' | 'void'
  to_name: string | null
  to_company: string | null
  to_email: string | null
  currency: string
  issue_date: string | null
  subtotal: number
  total: number
}

const invoices = ref<InvoiceRow[]>([])
const isLoading = ref(true)

const statusConfig: Record<string, { label: string; classes: string }> = {
  paid:    { label: 'Paid',    classes: 'bg-green-500/10 text-green-400 border border-green-500/20' },
  sent:    { label: 'Sent',    classes: 'bg-blue-500/10 text-blue-400 border border-blue-500/20' },
  overdue: { label: 'Overdue', classes: 'bg-red-500/10 text-red-400 border border-red-500/20' },
  draft:   { label: 'Draft',   classes: 'bg-gray-500 text-gray-900 border border-gray-500' },
  void:    { label: 'Void',    classes: 'bg-gray-500 text-gray-700 border border-gray-500' },
}

const avatarColors = ['#4ade80', '#a78bfa', '#f87171', '#34d399', '#fbbf24', '#38bdf8', '#fb923c', '#e879f9']

function clientName(inv: InvoiceRow) {
  return inv.to_name || inv.to_company || 'Unknown'
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

function fmtAmount(inv: InvoiceRow) {
  return `${inv.currency ?? '$'} ${inv.total.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
}

onMounted(async () => {
  const orgId = authStore.getCurrentOrganization?.id
  if (!orgId) { isLoading.value = false; return }
  try {
    const res = await http.get<{ data: { data: InvoiceRow[] } }>(
      `/api/v1/orgs/${orgId}/invoices`,
      { params: { per_page: 6 } },
    )
    invoices.value = res.data.data.data ?? []
  } catch {
    // silently fail — the list just stays empty
  } finally {
    isLoading.value = false
  }
})
</script>

<template>
  <div class="bg-gray-200 border border-gray-400 rounded-xl">
    <!-- Header -->
    <div class="flex items-center justify-between px-5 py-4 border-b border-gray-400">
      <h3 class="text-sm font-semibold text-gray-1000">Recent Invoices</h3>
      <router-link
        :to="{ name: 'invoices' }"
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
    <div v-else-if="invoices.length === 0" class="flex flex-col items-center justify-center py-10 gap-2">
      <Icon icon="lucide:file-text" class="w-8 h-8 text-gray-700/40" />
      <p class="text-xs text-gray-700">No invoices yet</p>
    </div>

    <template v-else>
      <!-- Table (desktop) -->
      <div class="hidden sm:block overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-gray-400">
              <th class="text-left text-[10px] font-semibold uppercase tracking-wider text-gray-700 px-5 py-3">Client</th>
              <th class="text-left text-[10px] font-semibold uppercase tracking-wider text-gray-700 px-3 py-3">Amount</th>
              <th class="text-left text-[10px] font-semibold uppercase tracking-wider text-gray-700 px-3 py-3">Status</th>
              <th class="text-left text-[10px] font-semibold uppercase tracking-wider text-gray-700 px-3 py-3">Date</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="inv in invoices"
              :key="inv.id"
              class="border-b border-gray-400 last:border-0 hover:bg-gray-400/40 transition-colors cursor-pointer"
              @click="router.push({ name: 'invoices.view', params: { id: inv.id } })"
            >
              <td class="px-5 py-3.5">
                <div class="flex items-center gap-3">
                  <div
                    class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-bg-100 shrink-0"
                    :style="{ backgroundColor: avatarColor(inv.id) }"
                  >
                    {{ initials(clientName(inv)) }}
                  </div>
                  <div>
                    <div class="text-sm font-medium text-gray-1000 leading-tight">{{ clientName(inv) }}</div>
                    <div class="text-xs text-gray-700">{{ inv.number }}</div>
                  </div>
                </div>
              </td>
              <td class="px-3 py-3.5 text-sm font-semibold text-gray-1000">{{ fmtAmount(inv) }}</td>
              <td class="px-3 py-3.5">
                <span :class="['text-xs font-semibold px-2.5 py-1 rounded-full', statusConfig[inv.status]?.classes ?? '']">
                  {{ statusConfig[inv.status]?.label ?? inv.status }}
                </span>
              </td>
              <td class="px-3 py-3.5 text-sm text-gray-900">{{ fmtDate(inv.issue_date) }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Mobile list -->
      <div class="sm:hidden divide-y divide-gray-400">
        <div
          v-for="inv in invoices"
          :key="inv.id"
          class="flex items-center justify-between px-4 py-3.5 hover:bg-gray-400/40 transition-colors cursor-pointer"
          @click="router.push({ name: 'invoices.view', params: { id: inv.id } })"
        >
          <div class="flex items-center gap-3">
            <div
              class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-bg-100 shrink-0"
              :style="{ backgroundColor: avatarColor(inv.id) }"
            >
              {{ initials(clientName(inv)) }}
            </div>
            <div>
              <div class="text-sm font-medium text-gray-1000">{{ clientName(inv) }}</div>
              <div class="text-xs text-gray-700">{{ inv.number }} · {{ fmtDate(inv.issue_date) }}</div>
            </div>
          </div>
          <div class="flex flex-col items-end gap-1.5">
            <span class="text-sm font-semibold text-gray-1000">{{ fmtAmount(inv) }}</span>
            <span :class="['text-xs font-semibold px-2 py-0.5 rounded-full', statusConfig[inv.status]?.classes ?? '']">
              {{ statusConfig[inv.status]?.label ?? inv.status }}
            </span>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
