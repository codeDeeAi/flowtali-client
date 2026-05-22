<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { Icon } from '@iconify/vue'
import { useAuthStore } from '@/stores/auth'
import { AuditLogService, type IAuditLog, type IAuditLogUser } from '@/services/audit-log.service'
import Pagination from '@/components/ui/Pagination.vue'

const authStore = useAuthStore()
const orgId     = computed(() => authStore.getCurrentOrganization?.id ?? '')

const searchQuery = ref('')
const eventFilter = ref('')
const dateFrom    = ref('')
const dateTo      = ref('')
const currentPage = ref(1)
const perPage     = 20

const logs       = ref<IAuditLog[]>([])
const total      = ref(0)
const isLoading  = ref(false)

const eventFilters = [
  { key: '',                         label: 'All events' },
  { key: 'invoice',                  label: 'Invoices' },
  { key: 'invoice.share_link',       label: 'Invoice Share Links' },
  { key: 'letterhead',               label: 'Letterheads' },
  { key: 'letterhead.share_link',    label: 'Letterhead Share Links' },
  { key: 'member',                   label: 'Members' },
  { key: 'auth',                     label: 'Auth' },
  { key: 'org',                      label: 'Org' },
  { key: 'client',                   label: 'Clients' },
]

async function loadLogs() {
  if (!orgId.value) return
  isLoading.value = true
  try {
    const res = await AuditLogService.list(orgId.value, {
      search:    searchQuery.value || undefined,
      event:     eventFilter.value || undefined,
      date_from: dateFrom.value || undefined,
      date_to:   dateTo.value || undefined,
      page:      currentPage.value,
      per_page:  perPage,
    })
    logs.value  = res.data.data.data
    total.value = res.data.data.total
  } catch {
    // non-critical
  } finally {
    isLoading.value = false
  }
}

let searchTimer: ReturnType<typeof setTimeout>
watch(searchQuery, () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => { currentPage.value = 1; loadLogs() }, 400)
})
watch([eventFilter, dateFrom, dateTo, currentPage], () => loadLogs())
onMounted(() => loadLogs())

const onFilter = () => { currentPage.value = 1 }

// Event icon / color based on event prefix
function eventMeta(event: string, status: string) {
  if (status === 'failed') return { icon: 'lucide:shield-x', color: '#f87171' }
  const prefix = event.split('.')[0] ?? ''
  const map: Record<string, { icon: string; color: string }> = {
    invoice:    { icon: 'lucide:file-text',  color: '#4ade80' },
    letterhead: { icon: 'lucide:scroll',     color: '#60a5fa' },
    member:     { icon: 'lucide:users',      color: '#a78bfa' },
    auth:       { icon: 'lucide:shield',     color: '#e8a83e' },
    org:        { icon: 'lucide:building-2', color: '#38bdf8' },
    client:     { icon: 'lucide:user',       color: '#fb923c' },
  }
  return map[prefix] ?? { icon: 'lucide:activity', color: '#9ca3af' }
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

const colorPalette = ['#60a5fa', '#a78bfa', '#f87171', '#4ade80', '#e8a83e', '#38bdf8']

function userColor(user: IAuditLogUser | null | undefined) {
  const id = user?.id ?? ''
  if (!id) return '#4ade80'
  return colorPalette[id.charCodeAt(0) % colorPalette.length]
}

function userInitials(user: IAuditLogUser | null | undefined) {
  if (!user || user.name === 'Unknown User') return '?'
  const parts = user.name.trim().split(' ')
  const first = parts[0]?.[0] ?? ''
  const last  = parts[1]?.[0] ?? ''
  return (first + last).toUpperCase() || '??'
}
</script>

<template>
  <div class="p-4 md:p-6 space-y-5 min-h-full">

    <!-- Page header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div>
        <h1 class="page-title">Audit Logs</h1>
        <p class="page-subtitle">Full activity trail for your organization</p>
      </div>
      <div class="flex items-center gap-2">
        <button class="flex items-center gap-2 bg-charcoal-800 border border-charcoal-700 hover:border-charcoal-500 text-cream-muted hover:text-cream text-xs px-3 py-2 rounded-lg transition-colors">
          <Icon icon="lucide:download" class="w-3.5 h-3.5" /> Export Logs
        </button>
        <select v-model="eventFilter" @change="onFilter" class="app-select text-xs py-2 w-36">
          <option v-for="f in eventFilters" :key="f.key" :value="f.key">{{ f.label }}</option>
        </select>
      </div>
    </div>

    <!-- Table card -->
    <div class="bg-charcoal-800 border border-charcoal-700 rounded-xl overflow-hidden">
      <!-- Search & filters -->
      <div class="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-charcoal-700">
        <div class="relative">
          <Icon icon="lucide:search" class="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-cream-faint" />
          <input v-model="searchQuery" placeholder="Search logs…" class="app-inp pl-8 text-xs py-2 w-52" />
        </div>
        <div class="flex items-center gap-2">
          <input v-model="dateFrom" type="date" class="app-inp text-xs py-2 w-36 text-cream-muted" @change="onFilter" />
          <span class="text-cream-faint text-xs">–</span>
          <input v-model="dateTo"   type="date" class="app-inp text-xs py-2 w-36 text-cream-muted" @change="onFilter" />
        </div>
        <span class="text-xs text-cream-faint ml-auto">{{ total.toLocaleString() }} event{{ total !== 1 ? 's' : '' }}</span>
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
              <th>Event</th>
              <th>User</th>
              <th>Resource</th>
              <th>IP Address</th>
              <th>Timestamp</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="log in logs" :key="log.id">
              <td>
                <div class="flex items-center gap-2.5">
                  <div class="w-7 h-7 rounded-md flex items-center justify-center shrink-0" :style="{ backgroundColor: eventMeta(log.event, log.status).color + '18' }">
                    <Icon :icon="eventMeta(log.event, log.status).icon" class="w-3.5 h-3.5" :style="{ color: eventMeta(log.event, log.status).color }" />
                  </div>
                  <div>
                    <div class="text-sm font-medium text-cream leading-tight">{{ log.action }}</div>
                    <div class="text-[10px] text-cream-faint/60 font-mono">{{ log.event }}</div>
                  </div>
                </div>
              </td>
              <td>
                <div class="flex items-center gap-2 min-w-0">
                  <!-- Avatar: photo or initials -->
                  <div class="relative shrink-0">
                    <img
                      v-if="log.user?.profile_photo"
                      :src="log.user.profile_photo"
                      :alt="log.user.name"
                      class="w-6 h-6 rounded-full object-cover"
                    />
                    <div
                      v-else
                      class="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-charcoal-900 shrink-0"
                      :style="{ backgroundColor: userColor(log.user) }"
                    >{{ userInitials(log.user) }}</div>
                    <!-- Dim dot for former member -->
                    <div
                      v-if="log.user && !log.user.is_active"
                      class="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-charcoal-600 border border-charcoal-800"
                      title="Former member"
                    ></div>
                  </div>
                  <div class="min-w-0">
                    <div class="text-xs text-cream leading-tight truncate max-w-[120px]" :class="{ 'opacity-60': log.user && !log.user.is_active }">
                      {{ log.user?.name ?? 'System' }}
                    </div>
                    <div v-if="log.user?.email" class="text-[10px] text-cream-faint/60 truncate max-w-[120px]">{{ log.user.email }}</div>
                  </div>
                </div>
              </td>
              <td>
                <div v-if="log.resource_label || log.resource_type" class="text-xs">
                  <span class="font-mono text-cream-faint">{{ log.resource_label || '—' }}</span>
                  <span v-if="log.resource_type" class="text-cream-faint/50 ml-1">({{ log.resource_type }})</span>
                </div>
                <span v-else class="text-cream-faint/40 text-xs">—</span>
              </td>
              <td class="font-mono text-xs text-cream-faint">{{ log.ip_address || '—' }}</td>
              <td class="text-xs text-cream-faint whitespace-nowrap">{{ fmtDateTime(log.created_at) }}</td>
              <td>
                <span :class="['status-badge', log.status === 'success' ? 'status-active' : 'status-overdue']">
                  {{ log.status === 'success' ? 'Success' : 'Failed' }}
                </span>
              </td>
            </tr>
            <tr v-if="logs.length === 0">
              <td colspan="6" class="text-center py-12 text-cream-faint text-sm">No audit logs found</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Mobile list -->
      <div v-if="!isLoading" class="sm:hidden divide-y divide-charcoal-700">
        <div v-for="log in logs" :key="log.id" class="px-4 py-3.5">
          <div class="flex items-start justify-between gap-2 mb-1">
            <div class="flex items-center gap-2">
              <div class="w-6 h-6 rounded-md flex items-center justify-center shrink-0" :style="{ backgroundColor: eventMeta(log.event, log.status).color + '18' }">
                <Icon :icon="eventMeta(log.event, log.status).icon" class="w-3 h-3" :style="{ color: eventMeta(log.event, log.status).color }" />
              </div>
              <span class="text-sm font-medium text-cream">{{ log.action }}</span>
            </div>
            <span :class="['status-badge', log.status === 'success' ? 'status-active' : 'status-overdue']">
              {{ log.status === 'success' ? 'OK' : 'Fail' }}
            </span>
          </div>
          <div class="text-xs text-cream-faint ml-8">{{ log.resource_label || '—' }} · {{ fmtDateTime(log.created_at) }}</div>
          <div class="flex items-center gap-1.5 ml-8 mt-1">
            <img
              v-if="log.user?.profile_photo"
              :src="log.user.profile_photo"
              class="w-4 h-4 rounded-full object-cover shrink-0"
            />
            <div
              v-else
              class="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold text-charcoal-900 shrink-0"
              :style="{ backgroundColor: userColor(log.user) }"
            >{{ userInitials(log.user) }}</div>
            <span class="text-[10px] text-cream-faint/70 truncate" :class="{ 'opacity-60': log.user && !log.user.is_active }">
              {{ log.user?.name ?? 'System' }}
            </span>
          </div>
        </div>
        <div v-if="logs.length === 0" class="text-center py-12 text-cream-faint text-sm">No audit logs found</div>
      </div>

      <!-- Pagination -->
      <div class="px-4 py-3 border-t border-charcoal-700">
        <Pagination v-model="currentPage" :total="total" :per-page="perPage" />
      </div>
    </div>
  </div>
</template>
