<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Icon } from '@iconify/vue'
import { useNotification } from '@/composables/notification.ts'
import Pagination from '@/components/ui/Pagination.vue'
import { useAuthStore } from '@/stores/auth'
import { InvoiceService, type IInvoice, type IInvoiceStats } from '@/services/invoice.service'

const router    = useRouter()
const { t, locale } = useI18n()
const { notify } = useNotification()
const authStore  = useAuthStore()
const orgId      = computed(() => authStore.getCurrentOrganization?.id ?? '')

type StatusFilter = 'all' | 'paid' | 'sent' | 'overdue' | 'draft'

const filterTab   = ref<StatusFilter>('all')
const searchQuery = ref('')
const currentPage = ref(1)
const perPage     = 15
const filters = computed<{ key: StatusFilter; label: string }[]>(() => [
  { key: 'all',     label: t('invoices.filters.all') },
  { key: 'paid',    label: t('invoices.filters.paid') },
  { key: 'sent',    label: t('invoices.filters.due') },
  { key: 'overdue', label: t('invoices.filters.overdue') },
  { key: 'draft',   label: t('invoices.filters.draft') },
])
const selectedIds = ref<Set<string>>(new Set())

const showDeleteConfirm = ref(false)
const deleteTarget      = ref<IInvoice | null>(null)
const isDeleting        = ref(false)

const invoices       = ref<IInvoice[]>([])
const totalInvoices  = ref(0)
const isLoading      = ref(false)
const stats          = ref<IInvoiceStats | null>(null)

const statusClass: Record<string, string> = {
  paid: 'status-paid', sent: 'status-due', overdue: 'status-overdue', draft: 'status-draft', void: 'status-draft',
}
const statusLabel = (status: string) => t(`invoices.status.${status}`)

const colorPalette = ['#60a5fa', '#a78bfa', '#f87171', '#4ade80', '#00c853', '#38bdf8', '#fb923c', '#34d399']
const clientColor = (id: string) => colorPalette[id.charCodeAt(id.length - 1) % colorPalette.length]

function initials(name: string | null) {
  return (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

const symMap: Record<string, string> = { USD: '$', EUR: '€', GBP: '£', NGN: '₦', CAD: 'CA$', AUD: 'A$', JPY: '¥', INR: '₹', ZAR: 'R', CHF: 'Fr', AED: 'د.إ' }
const fmtAmount = (inv: IInvoice) => {
  const s = symMap[inv.currency] ?? '$'
  return s + inv.totals.total.toLocaleString(locale.value, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const fmtDate = (d: string | null) => {
  if (!d) return '—'
  const [y = '0', m = '1', day = '1'] = d.split('-')
  return new Date(+y, +m - 1, +day).toLocaleDateString(locale.value, { month: 'short', day: 'numeric' })
}

async function loadStats() {
  if (!orgId.value) return
  try {
    const res = await InvoiceService.stats(orgId.value)
    stats.value = res.data.data
  } catch {}
}

async function loadInvoices() {
  if (!orgId.value) return
  isLoading.value = true
  try {
    const res = await InvoiceService.list(orgId.value, {
      search: searchQuery.value || undefined,
      status: filterTab.value !== 'all' ? filterTab.value : undefined,
      page: currentPage.value,
      per_page: perPage,
    })
    invoices.value = res.data.data.data
    totalInvoices.value = res.data.data.total
  } catch {
    notify(t('invoices.toasts.loadFailed'), 'error')
  } finally {
    isLoading.value = false
  }
}

let searchTimer: ReturnType<typeof setTimeout>
watch(searchQuery, () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => { currentPage.value = 1; loadInvoices() }, 400)
})
watch([filterTab, currentPage], () => loadInvoices())

onMounted(() => { loadInvoices(); loadStats() })

const onFilter = (key: StatusFilter) => {
  filterTab.value = key
  currentPage.value = 1
  selectedIds.value.clear()
}

const allSelected = computed(() =>
  invoices.value.length > 0 && invoices.value.every(i => selectedIds.value.has(i.id))
)
const toggleAll = () => {
  if (allSelected.value) invoices.value.forEach(i => selectedIds.value.delete(i.id))
  else invoices.value.forEach(i => selectedIds.value.add(i.id))
}
const toggleOne = (id: string) => {
  if (selectedIds.value.has(id)) selectedIds.value.delete(id)
  else selectedIds.value.add(id)
}

async function markPaid(inv: IInvoice) {
  try {
    await InvoiceService.update(orgId.value, inv.id, { status: 'paid' })
    notify(t('invoices.toasts.markedPaid', { number: inv.number }), 'success')
    loadInvoices()
    loadStats()
  } catch {
    notify(t('invoices.toasts.updateFailed'), 'error')
  }
}

const openDelete = (inv: IInvoice) => {
  deleteTarget.value = inv
  showDeleteConfirm.value = true
}

async function handleDelete() {
  if (!deleteTarget.value) return
  isDeleting.value = true
  try {
    await InvoiceService.delete(orgId.value, deleteTarget.value.id)
    notify(t('invoices.toasts.deleted', { number: deleteTarget.value.number }), 'success')
    showDeleteConfirm.value = false
    deleteTarget.value = null
    selectedIds.value.clear()
    loadInvoices()
    loadStats()
  } catch {
    notify(t('invoices.toasts.deleteFailed'), 'error')
  } finally {
    isDeleting.value = false
  }
}

async function deleteSelected() {
  const ids = [...selectedIds.value]
  const count = ids.length
  try {
    await Promise.all(ids.map(id => InvoiceService.delete(orgId.value, id)))
    selectedIds.value.clear()
    notify(t('invoices.toasts.bulkDeleted', { count }, count), 'success')
    loadInvoices()
    loadStats()
  } catch {
    notify(t('invoices.toasts.bulkDeleteFailed'), 'error')
  }
}
</script>

<template>
  <div class="p-4 md:p-6 space-y-5 min-h-full">

    <!-- Page header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div>
        <h1 class="page-title">{{ t('invoices.title') }}</h1>
        <p class="page-subtitle">{{ t('invoices.subtitle') }}</p>
      </div>
      <div class="flex items-center gap-2">
        <button @click="router.push({ name: 'invoices.create' })" class="flex items-center gap-2 bg-green-700 hover:bg-green-800 text-bg-100 font-semibold text-xs px-3 py-2 rounded-lg transition-colors">
          <Icon icon="lucide:plus" class="w-3.5 h-3.5" /> {{ t('invoices.new') }}
        </button>
      </div>
    </div>

    <!-- Summary cards -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
      <div class="bg-gray-200 border border-gray-400 rounded-xl p-3 sm:p-4">
        <div class="text-xs text-gray-700 mb-1">{{ t('invoices.summary.total') }}</div>
        <div class="text-xl font-bold text-gray-1000 font-mono">{{ stats?.total ?? '—' }}</div>
      </div>
      <div class="bg-gray-200 border border-gray-400 rounded-xl p-3 sm:p-4">
        <div class="text-xs text-gray-700 mb-1">{{ t('invoices.summary.paid') }}</div>
        <div class="text-xl font-bold text-green-400 font-mono">{{ stats?.paid ?? '—' }}</div>
      </div>
      <div class="bg-gray-200 border border-gray-400 rounded-xl p-3 sm:p-4">
        <div class="text-xs text-gray-700 mb-1">{{ t('invoices.summary.overdue') }}</div>
        <div class="text-xl font-bold text-red-400 font-mono">{{ stats?.overdue ?? '—' }}</div>
      </div>
      <div class="bg-gray-200 border border-gray-400 rounded-xl p-3 sm:p-4">
        <div class="text-xs text-gray-700 mb-1">{{ t('invoices.summary.draft') }}</div>
        <div class="text-xl font-bold text-gray-900">{{ stats?.draft ?? '—' }}</div>
      </div>
    </div>

    <!-- Filter tabs (horizontally scrollable on mobile) -->
    <div class="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
      <div class="flex items-center gap-1 bg-gray-200 border border-gray-400 rounded-lg p-1 w-max sm:w-fit">
        <button
          v-for="f in filters" :key="f.key"
          :class="['text-xs font-medium px-3 py-1.5 rounded-md transition-colors whitespace-nowrap', filterTab === f.key ? 'bg-green-700/10 text-green-700' : 'text-gray-700 hover:text-gray-900']"
          @click="onFilter(f.key)"
        >{{ f.label }}</button>
      </div>
    </div>

    <!-- Table card -->
    <div class="bg-gray-200 border border-gray-400 rounded-xl overflow-hidden">
      <!-- Search + bulk actions -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between px-4 py-3 border-b border-gray-400 gap-2">
        <div class="flex items-center gap-3">
          <div class="relative flex-1 sm:flex-initial">
            <Icon icon="lucide:search" class="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-700" />
            <input v-model="searchQuery" :placeholder="t('invoices.search')" class="app-inp pl-8 w-full sm:w-48 text-xs py-2" />
          </div>
          <Transition name="fade">
            <button
              v-if="selectedIds.size > 0"
              @click="deleteSelected"
              class="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/15 px-3 py-1.5 rounded-lg transition-colors"
            >
              <Icon icon="lucide:trash-2" class="w-3.5 h-3.5" />
              {{ t('invoices.deleteSelected', { count: selectedIds.size }) }}
            </button>
          </Transition>
        </div>
        <span class="text-xs text-gray-700 shrink-0 hidden sm:block">{{ t('invoices.count', totalInvoices) }}</span>
      </div>

      <!-- Loading -->
      <div v-if="isLoading" class="flex items-center justify-center py-16">
        <Icon icon="lucide:loader-2" class="w-6 h-6 text-green-700 animate-spin" />
      </div>

      <!-- Desktop table -->
      <div v-else class="hidden sm:block overflow-x-auto">
        <table class="app-table">
          <thead>
            <tr>
              <th class="w-8"><input type="checkbox" class="accent-green-700" :checked="allSelected" @change="toggleAll" /></th>
              <th>{{ t('invoices.table.invoice') }}</th>
              <th>{{ t('invoices.table.client') }}</th>
              <th>{{ t('invoices.table.amount') }}</th>
              <th>{{ t('invoices.table.status') }}</th>
              <th>{{ t('invoices.table.issueDate') }}</th>
              <th>{{ t('invoices.table.dueDate') }}</th>
              <th>{{ t('invoices.table.actions') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="inv in invoices" :key="inv.id"
              :class="['cursor-pointer', selectedIds.has(inv.id) ? 'bg-green-700/5' : '']"
              @click="router.push({ name: 'invoices.view', params: { id: inv.id } })"
            >
              <td @click.stop><input type="checkbox" class="accent-green-700" :checked="selectedIds.has(inv.id)" @change="toggleOne(inv.id)" /></td>
              <td class="font-mono text-xs text-gray-900">{{ inv.number }}</td>
              <td>
                <div class="flex items-center gap-2.5">
                  <div class="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-bg-100 shrink-0" :style="{ backgroundColor: clientColor(inv.id) }">
                    {{ initials(inv.to_name) }}
                  </div>
                  <div>
                    <div class="text-sm font-medium text-gray-1000 leading-tight">{{ inv.to_name || '—' }}</div>
                    <div class="text-xs text-gray-700">{{ inv.to_email || inv.to_company || '' }}</div>
                  </div>
                </div>
              </td>
              <td class="font-mono font-semibold text-gray-1000">{{ fmtAmount(inv) }}</td>
              <td><span :class="['status-badge', statusClass[inv.status] ?? 'status-draft']">{{ statusLabel(inv.status) }}</span></td>
              <td class="text-gray-700 text-xs">{{ fmtDate(inv.issue_date) }}</td>
              <td class="text-gray-700 text-xs">{{ fmtDate(inv.due_date) }}</td>
              <td @click.stop>
                <div class="flex items-center gap-0.5">
                  <button
                    @click="router.push({ name: 'invoices.view', params: { id: inv.id } })"
                    class="w-7 h-7 flex items-center justify-center rounded-md text-gray-700 hover:text-gray-1000 hover:bg-gray-400 transition-colors"
                    :title="t('invoices.actions.view')"
                  ><Icon icon="lucide:eye" class="w-3.5 h-3.5" /></button>
                  <button
                    @click="router.push({ name: 'invoices.edit', params: { id: inv.id } })"
                    class="w-7 h-7 flex items-center justify-center rounded-md text-gray-700 hover:text-gray-1000 hover:bg-gray-400 transition-colors"
                    :title="t('invoices.actions.edit')"
                  ><Icon icon="lucide:pencil" class="w-3.5 h-3.5" /></button>
                  <button
                    v-if="inv.status !== 'paid'"
                    @click="markPaid(inv)"
                    class="w-7 h-7 flex items-center justify-center rounded-md text-gray-700 hover:text-green-400 hover:bg-gray-400 transition-colors"
                    :title="t('invoices.actions.markPaid')"
                  ><Icon icon="lucide:check-circle" class="w-3.5 h-3.5" /></button>
                  <button
                    @click="openDelete(inv)"
                    class="w-7 h-7 flex items-center justify-center rounded-md text-gray-700 hover:text-red-400 hover:bg-gray-400 transition-colors"
                    :title="t('invoices.actions.delete')"
                  ><Icon icon="lucide:trash-2" class="w-3.5 h-3.5" /></button>
                </div>
              </td>
            </tr>
            <tr v-if="invoices.length === 0">
              <td colspan="8" class="text-center py-12 text-gray-700 text-sm">{{ t('invoices.empty') }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Mobile cards -->
      <div v-if="!isLoading" class="sm:hidden divide-y divide-gray-400">
        <div
          v-for="inv in invoices" :key="inv.id"
          class="px-4 py-3.5 cursor-pointer hover:bg-gray-400/30 transition-colors"
          @click="router.push({ name: 'invoices.view', params: { id: inv.id } })"
        >
          <div class="flex items-center justify-between gap-3">
            <div class="flex items-center gap-3 min-w-0">
              <div class="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-bg-100 shrink-0" :style="{ backgroundColor: clientColor(inv.id) }">
                {{ initials(inv.to_name) }}
              </div>
              <div class="min-w-0">
                <div class="text-sm font-medium text-gray-1000 truncate">{{ inv.to_name || '—' }}</div>
                <div class="text-xs text-gray-700">{{ inv.number }} · {{ fmtDate(inv.issue_date) }}</div>
              </div>
            </div>
            <div class="flex flex-col items-end gap-1.5 shrink-0">
              <span class="text-sm font-semibold font-mono text-gray-1000">{{ fmtAmount(inv) }}</span>
              <span :class="['status-badge', statusClass[inv.status] ?? 'status-draft']">{{ statusLabel(inv.status) }}</span>
            </div>
          </div>
          <!-- Quick actions row -->
          <div class="flex items-center gap-2 mt-2.5 pt-2.5 border-t border-gray-400/50" @click.stop>
            <button
              @click="router.push({ name: 'invoices.edit', params: { id: inv.id } })"
              class="flex items-center gap-1.5 text-xs text-gray-900 hover:text-gray-1000 bg-gray-400/60 hover:bg-gray-400 px-3 py-1.5 rounded-lg transition-colors flex-1 justify-center"
            >
              <Icon icon="lucide:pencil" class="w-3.5 h-3.5" /> {{ t('invoices.actions.edit') }}
            </button>
            <button
              v-if="inv.status !== 'paid'"
              @click="markPaid(inv)"
              class="flex items-center gap-1.5 text-xs text-green-400 hover:text-green-300 bg-green-500/10 hover:bg-green-500/15 px-3 py-1.5 rounded-lg transition-colors flex-1 justify-center"
            >
              <Icon icon="lucide:check-circle" class="w-3.5 h-3.5" /> {{ t('invoices.actions.markPaidShort') }}
            </button>
            <button
              @click="openDelete(inv)"
              class="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/15 px-3 py-1.5 rounded-lg transition-colors"
            >
              <Icon icon="lucide:trash-2" class="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        <div v-if="invoices.length === 0" class="text-center py-12 text-gray-700 text-sm">{{ t('invoices.empty') }}</div>
      </div>

      <!-- Pagination row -->
      <div class="px-4 py-3 border-t border-gray-400">
        <Pagination v-model="currentPage" :total="totalInvoices" :per-page="perPage" />
      </div>
    </div>

  </div>

  <!-- Delete confirm -->
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="showDeleteConfirm && deleteTarget" class="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" @click.self="showDeleteConfirm = false">
        <div class="bg-gray-200 border border-gray-400 rounded-2xl p-6 w-full max-w-sm shadow-2xl space-y-4">
          <div class="flex items-start gap-3">
            <div class="w-9 h-9 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0">
              <Icon icon="lucide:trash-2" class="w-4 h-4 text-red-400" />
            </div>
            <div>
              <h3 class="text-sm font-semibold text-gray-1000">{{ t('invoices.deleteModal.title', { number: deleteTarget.number }) }}</h3>
              <p class="text-xs text-gray-700 mt-1 leading-relaxed">{{ t('invoices.deleteModal.body') }}</p>
            </div>
          </div>
          <div class="flex justify-end gap-2">
            <button @click="showDeleteConfirm = false" :disabled="isDeleting" class="px-4 py-2 text-xs font-medium text-gray-700 hover:text-gray-1000 bg-gray-400 hover:bg-gray-500 border border-gray-500 rounded-lg transition-colors disabled:opacity-50">{{ t('invoices.deleteModal.cancel') }}</button>
            <button @click="handleDelete" :disabled="isDeleting" class="px-4 py-2 text-xs font-semibold text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1.5">
              <Icon v-if="isDeleting" icon="lucide:loader-2" class="w-3 h-3 animate-spin" />
              {{ t('invoices.deleteModal.confirm') }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-enter-active, .modal-leave-active { transition: opacity 0.2s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
.fade-enter-active, .fade-leave-active { transition: opacity 0.15s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
