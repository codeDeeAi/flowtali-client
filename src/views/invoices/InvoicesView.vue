<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Icon } from '@iconify/vue'
import { useNotification } from '@/composables/notification.ts'
import Pagination from '@/components/ui/Pagination.vue'
import { useAuthStore } from '@/stores/auth'
import { InvoiceService, type IInvoice, type IInvoiceStats } from '@/services/invoice.service'

const router    = useRouter()
const { notify } = useNotification()
const authStore  = useAuthStore()
const orgId      = computed(() => authStore.getCurrentOrganization?.id ?? '')

type StatusFilter = 'all' | 'paid' | 'sent' | 'overdue' | 'draft'

const filterTab   = ref<StatusFilter>('all')
const searchQuery = ref('')
const currentPage = ref(1)
const perPage     = 15
const filters: { key: StatusFilter; label: string }[] = [
  { key: 'all',     label: 'All' },
  { key: 'paid',    label: 'Paid' },
  { key: 'sent',    label: 'Due' },
  { key: 'overdue', label: 'Overdue' },
  { key: 'draft',   label: 'Draft' },
]
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
const statusLabel: Record<string, string> = {
  paid: 'Paid', sent: 'Due', overdue: 'Overdue', draft: 'Draft', void: 'Void',
}

const colorPalette = ['#60a5fa', '#a78bfa', '#f87171', '#4ade80', '#e8a83e', '#38bdf8', '#fb923c', '#34d399']
const clientColor = (id: string) => colorPalette[id.charCodeAt(id.length - 1) % colorPalette.length]

function initials(name: string | null) {
  return (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

const symMap: Record<string, string> = { USD: '$', EUR: '€', GBP: '£', NGN: '₦', CAD: 'CA$', AUD: 'A$', JPY: '¥', INR: '₹', ZAR: 'R', CHF: 'Fr', AED: 'د.إ' }
const fmtAmount = (inv: IInvoice) => {
  const s = symMap[inv.currency] ?? '$'
  return s + inv.totals.total.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const fmtDate = (d: string | null) => {
  if (!d) return '—'
  const [y = '0', m = '1', day = '1'] = d.split('-')
  return new Date(+y, +m - 1, +day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
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
    notify('Failed to load invoices', 'error')
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
    notify(`${inv.number} marked as paid`, 'success')
    loadInvoices()
    loadStats()
  } catch {
    notify('Failed to update invoice', 'error')
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
    notify(`${deleteTarget.value.number} deleted`, 'success')
    showDeleteConfirm.value = false
    deleteTarget.value = null
    selectedIds.value.clear()
    loadInvoices()
    loadStats()
  } catch {
    notify('Failed to delete invoice', 'error')
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
    notify(`${count} invoice${count > 1 ? 's' : ''} deleted`, 'success')
    loadInvoices()
    loadStats()
  } catch {
    notify('Failed to delete some invoices', 'error')
  }
}
</script>

<template>
  <div class="p-4 md:p-6 space-y-5 min-h-full">

    <!-- Page header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div>
        <h1 class="page-title">Invoices</h1>
        <p class="page-subtitle">Manage and track all your invoices</p>
      </div>
      <div class="flex items-center gap-2">
        <button class="flex items-center gap-2 bg-charcoal-800 border border-charcoal-700 hover:border-charcoal-500 text-cream-muted hover:text-cream text-xs px-3 py-2 rounded-lg transition-colors">
          <Icon icon="lucide:download" class="w-3.5 h-3.5" /> Export CSV
        </button>
        <button @click="router.push({ name: 'invoices.create' })" class="flex items-center gap-2 bg-amber hover:bg-amber-light text-charcoal-900 font-semibold text-xs px-3 py-2 rounded-lg transition-colors">
          <Icon icon="lucide:plus" class="w-3.5 h-3.5" /> New Invoice
        </button>
      </div>
    </div>

    <!-- Summary cards -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <div class="bg-charcoal-800 border border-charcoal-700 rounded-xl p-4">
        <div class="text-xs text-cream-faint mb-1">Total Invoices</div>
        <div class="text-xl font-bold text-cream font-mono">{{ stats?.total ?? '—' }}</div>
      </div>
      <div class="bg-charcoal-800 border border-charcoal-700 rounded-xl p-4">
        <div class="text-xs text-cream-faint mb-1">Paid</div>
        <div class="text-xl font-bold text-green-400 font-mono">{{ stats?.paid ?? '—' }}</div>
      </div>
      <div class="bg-charcoal-800 border border-charcoal-700 rounded-xl p-4">
        <div class="text-xs text-cream-faint mb-1">Overdue</div>
        <div class="text-xl font-bold text-red-400 font-mono">{{ stats?.overdue ?? '—' }}</div>
      </div>
      <div class="bg-charcoal-800 border border-charcoal-700 rounded-xl p-4">
        <div class="text-xs text-cream-faint mb-1">Draft</div>
        <div class="text-xl font-bold text-cream-muted">{{ stats?.draft ?? '—' }}</div>
      </div>
    </div>

    <!-- Filter tabs -->
    <div class="flex items-center gap-1 bg-charcoal-800 border border-charcoal-700 rounded-lg p-1 w-fit">
      <button
        v-for="f in filters" :key="f.key"
        :class="['text-xs font-medium px-3 py-1.5 rounded-md transition-colors', filterTab === f.key ? 'bg-amber/10 text-amber' : 'text-cream-faint hover:text-cream-muted']"
        @click="onFilter(f.key)"
      >{{ f.label }}</button>
    </div>

    <!-- Table card -->
    <div class="bg-charcoal-800 border border-charcoal-700 rounded-xl overflow-hidden">
      <!-- Search + bulk actions -->
      <div class="flex items-center justify-between px-4 py-3 border-b border-charcoal-700 gap-3 flex-wrap">
        <div class="flex items-center gap-3">
          <div class="relative">
            <Icon icon="lucide:search" class="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-cream-faint" />
            <input v-model="searchQuery" placeholder="Search invoices…" class="app-inp pl-8 w-48 text-xs py-2" />
          </div>
          <Transition name="fade">
            <button
              v-if="selectedIds.size > 0"
              @click="deleteSelected"
              class="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/15 px-3 py-1.5 rounded-lg transition-colors"
            >
              <Icon icon="lucide:trash-2" class="w-3.5 h-3.5" />
              Delete {{ selectedIds.size }} selected
            </button>
          </Transition>
        </div>
        <span class="text-xs text-cream-faint shrink-0">{{ totalInvoices }} invoice{{ totalInvoices !== 1 ? 's' : '' }}</span>
      </div>

      <!-- Loading -->
      <div v-if="isLoading" class="flex items-center justify-center py-16">
        <Icon icon="lucide:loader-2" class="w-6 h-6 text-amber animate-spin" />
      </div>

      <!-- Desktop table -->
      <div v-else class="hidden sm:block overflow-x-auto">
        <table class="app-table">
          <thead>
            <tr>
              <th class="w-8"><input type="checkbox" class="accent-amber" :checked="allSelected" @change="toggleAll" /></th>
              <th>Invoice</th>
              <th>Client</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Issue Date</th>
              <th>Due Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="inv in invoices" :key="inv.id"
              :class="['cursor-pointer', selectedIds.has(inv.id) ? 'bg-amber/5' : '']"
              @click="router.push({ name: 'invoices.view', params: { id: inv.id } })"
            >
              <td @click.stop><input type="checkbox" class="accent-amber" :checked="selectedIds.has(inv.id)" @change="toggleOne(inv.id)" /></td>
              <td class="font-mono text-xs text-cream-muted">{{ inv.number }}</td>
              <td>
                <div class="flex items-center gap-2.5">
                  <div class="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-charcoal-900 shrink-0" :style="{ backgroundColor: clientColor(inv.id) }">
                    {{ initials(inv.to_name) }}
                  </div>
                  <div>
                    <div class="text-sm font-medium text-cream leading-tight">{{ inv.to_name || '—' }}</div>
                    <div class="text-xs text-cream-faint">{{ inv.to_email || inv.to_company || '' }}</div>
                  </div>
                </div>
              </td>
              <td class="font-mono font-semibold text-cream">{{ fmtAmount(inv) }}</td>
              <td><span :class="['status-badge', statusClass[inv.status] ?? 'status-draft']">{{ statusLabel[inv.status] ?? inv.status }}</span></td>
              <td class="text-cream-faint text-xs">{{ fmtDate(inv.issue_date) }}</td>
              <td class="text-cream-faint text-xs">{{ fmtDate(inv.due_date) }}</td>
              <td @click.stop>
                <div class="flex items-center gap-0.5">
                  <button
                    @click="router.push({ name: 'invoices.view', params: { id: inv.id } })"
                    class="w-7 h-7 flex items-center justify-center rounded-md text-cream-faint hover:text-cream hover:bg-charcoal-700 transition-colors"
                    title="View"
                  ><Icon icon="lucide:eye" class="w-3.5 h-3.5" /></button>
                  <button
                    @click="router.push({ name: 'invoices.edit', params: { id: inv.id } })"
                    class="w-7 h-7 flex items-center justify-center rounded-md text-cream-faint hover:text-cream hover:bg-charcoal-700 transition-colors"
                    title="Edit"
                  ><Icon icon="lucide:pencil" class="w-3.5 h-3.5" /></button>
                  <button
                    v-if="inv.status !== 'paid'"
                    @click="markPaid(inv)"
                    class="w-7 h-7 flex items-center justify-center rounded-md text-cream-faint hover:text-green-400 hover:bg-charcoal-700 transition-colors"
                    title="Mark as paid"
                  ><Icon icon="lucide:check-circle" class="w-3.5 h-3.5" /></button>
                  <button
                    @click="openDelete(inv)"
                    class="w-7 h-7 flex items-center justify-center rounded-md text-cream-faint hover:text-red-400 hover:bg-charcoal-700 transition-colors"
                    title="Delete"
                  ><Icon icon="lucide:trash-2" class="w-3.5 h-3.5" /></button>
                </div>
              </td>
            </tr>
            <tr v-if="invoices.length === 0">
              <td colspan="8" class="text-center py-12 text-cream-faint text-sm">No invoices match your filters</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Mobile list -->
      <div v-if="!isLoading" class="sm:hidden divide-y divide-charcoal-700">
        <div
          v-for="inv in invoices" :key="inv.id"
          class="flex items-center justify-between px-4 py-3.5 cursor-pointer hover:bg-charcoal-700/30 transition-colors"
          @click="router.push({ name: 'invoices.view', params: { id: inv.id } })"
        >
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-charcoal-900 shrink-0" :style="{ backgroundColor: clientColor(inv.id) }">
              {{ initials(inv.to_name) }}
            </div>
            <div>
              <div class="text-sm font-medium text-cream">{{ inv.to_name || '—' }}</div>
              <div class="text-xs text-cream-faint">{{ inv.number }} · {{ fmtDate(inv.issue_date) }}</div>
            </div>
          </div>
          <div class="flex flex-col items-end gap-1.5">
            <span class="text-sm font-semibold font-mono text-cream">{{ fmtAmount(inv) }}</span>
            <span :class="['status-badge', statusClass[inv.status] ?? 'status-draft']">{{ statusLabel[inv.status] ?? inv.status }}</span>
          </div>
        </div>
        <div v-if="invoices.length === 0" class="text-center py-12 text-cream-faint text-sm">No invoices match your filters</div>
      </div>

      <!-- Pagination row -->
      <div class="px-4 py-3 border-t border-charcoal-700">
        <Pagination v-model="currentPage" :total="totalInvoices" :per-page="perPage" />
      </div>
    </div>

  </div>

  <!-- Delete confirm -->
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="showDeleteConfirm && deleteTarget" class="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" @click.self="showDeleteConfirm = false">
        <div class="bg-charcoal-800 border border-charcoal-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl space-y-4">
          <div class="flex items-start gap-3">
            <div class="w-9 h-9 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0">
              <Icon icon="lucide:trash-2" class="w-4 h-4 text-red-400" />
            </div>
            <div>
              <h3 class="text-sm font-semibold text-cream">Delete {{ deleteTarget.number }}?</h3>
              <p class="text-xs text-cream-faint mt-1 leading-relaxed">This invoice will be permanently deleted. This action cannot be undone.</p>
            </div>
          </div>
          <div class="flex justify-end gap-2">
            <button @click="showDeleteConfirm = false" :disabled="isDeleting" class="px-4 py-2 text-xs font-medium text-cream-faint hover:text-cream bg-charcoal-700 hover:bg-charcoal-600 border border-charcoal-600 rounded-lg transition-colors disabled:opacity-50">Cancel</button>
            <button @click="handleDelete" :disabled="isDeleting" class="px-4 py-2 text-xs font-semibold text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1.5">
              <Icon v-if="isDeleting" icon="lucide:loader-2" class="w-3 h-3 animate-spin" />
              Delete
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
