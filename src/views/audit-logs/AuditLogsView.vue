<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { Icon } from '@iconify/vue'
import { useAuthStore } from '@/stores/auth'
import { AuditLogService, type IAuditLog, type IAuditLogUser, type IAuditLogEventType } from '@/services/audit-log.service'
import Pagination from '@/components/ui/Pagination.vue'

const authStore = useAuthStore()
const orgId     = computed(() => authStore.getCurrentOrganization?.id ?? '')

const searchQuery = ref('')
const eventFilter = ref('')
const dateFrom    = ref('')
const dateTo      = ref('')
const currentPage = ref(1)
const perPage     = 20

const logs            = ref<IAuditLog[]>([])
const total           = ref(0)
const isLoading       = ref(false)
const isExporting     = ref(false)
const eventTypes      = ref<IAuditLogEventType[]>([])
const typesLoading    = ref(false)

const eventFilters = computed(() => [
  { key: '', label: 'All events', icon: 'lucide:list', color: '#9ca3af' },
  ...eventTypes.value,
])

async function loadEventTypes() {
  if (!orgId.value) return
  typesLoading.value = true
  try {
    const res = await AuditLogService.eventTypes(orgId.value)
    eventTypes.value = res.data.data.types
  } catch {
    // non-critical — filter dropdown falls back to "All events" only
  } finally {
    typesLoading.value = false
  }
}

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
onMounted(() => { loadLogs(); loadEventTypes() })

const onFilter = () => { currentPage.value = 1 }

async function exportCsv() {
  if (!orgId.value || isExporting.value) return
  isExporting.value = true
  try {
    const res = await AuditLogService.export(orgId.value, {
      search:    searchQuery.value || undefined,
      event:     eventFilter.value || undefined,
      date_from: dateFrom.value || undefined,
      date_to:   dateTo.value || undefined,
    })
    const url      = URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }))
    const link     = document.createElement('a')
    const today    = new Date().toISOString().slice(0, 10)
    link.href      = url
    link.download  = `audit-logs-${today}.csv`
    link.click()
    URL.revokeObjectURL(url)
  } catch {
    // non-critical
  } finally {
    isExporting.value = false
  }
}

// Event icon / color — uses server-driven metadata when available
function eventMeta(event: string, status: string) {
  if (status === 'failed') return { icon: 'lucide:shield-x', color: '#f87171' }
  const prefix = event.split('.')[0] ?? ''
  const fromServer = eventTypes.value.find(t => t.key === prefix)
  if (fromServer) return { icon: fromServer.icon, color: fromServer.color }
  const fallback: Record<string, { icon: string; color: string }> = {
    invoice:    { icon: 'lucide:file-text',  color: '#4ade80' },
    receipt:    { icon: 'lucide:receipt',    color: '#34d399' },
    letterhead: { icon: 'lucide:scroll',     color: '#60a5fa' },
    member:     { icon: 'lucide:users',      color: '#a78bfa' },
    auth:       { icon: 'lucide:shield',     color: '#00c853' },
    org:        { icon: 'lucide:building-2', color: '#38bdf8' },
    client:     { icon: 'lucide:user',       color: '#fb923c' },
    preferences: { icon: 'lucide:settings',       color: '#94a3b8' },
    role:        { icon: 'lucide:shield-check',   color: '#c084fc' },
    audit_log:   { icon: 'lucide:clipboard-list', color: '#64748b' },
  }
  return fallback[prefix] ?? { icon: 'lucide:activity', color: '#9ca3af' }
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

const colorPalette = ['#60a5fa', '#a78bfa', '#f87171', '#4ade80', '#00c853', '#38bdf8']

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
        <button
          @click="exportCsv"
          :disabled="isExporting"
          class="flex items-center gap-2 bg-gray-200 border border-gray-400 hover:border-gray-500 text-gray-900 hover:text-gray-1000 text-xs px-3 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Icon :icon="isExporting ? 'lucide:loader-2' : 'lucide:download'" class="w-3.5 h-3.5" :class="{ 'animate-spin': isExporting }" />
          {{ isExporting ? 'Exporting…' : 'Export CSV' }}
        </button>
        <div class="relative">
          <select v-model="eventFilter" @change="onFilter" class="app-select text-xs py-2 w-40" :disabled="typesLoading">
            <option v-for="f in eventFilters" :key="f.key" :value="f.key">{{ f.label }}</option>
          </select>
          <Icon v-if="typesLoading" icon="lucide:loader-2" class="absolute right-7 top-1/2 -translate-y-1/2 w-3 h-3 text-green-700 animate-spin pointer-events-none" />
        </div>
      </div>
    </div>

    <!-- Table card -->
    <div class="bg-gray-200 border border-gray-400 rounded-xl overflow-hidden">
      <!-- Search & filters -->
      <div class="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-gray-400">
        <div class="relative">
          <Icon icon="lucide:search" class="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-700" />
          <input v-model="searchQuery" placeholder="Search logs…" class="app-inp pl-8 text-xs py-2 w-52" />
        </div>
        <div class="flex items-center gap-2">
          <input v-model="dateFrom" type="date" class="app-inp text-xs py-2 w-36 text-gray-900" @change="onFilter" />
          <span class="text-gray-700 text-xs">–</span>
          <input v-model="dateTo"   type="date" class="app-inp text-xs py-2 w-36 text-gray-900" @change="onFilter" />
        </div>
        <span class="text-xs text-gray-700 ml-auto">{{ total.toLocaleString() }} event{{ total !== 1 ? 's' : '' }}</span>
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
                    <div class="text-sm font-medium text-gray-1000 leading-tight">{{ log.action }}</div>
                    <div class="text-[10px] text-gray-700/60 font-mono">{{ log.event }}</div>
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
                      class="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-bg-100 shrink-0"
                      :style="{ backgroundColor: userColor(log.user) }"
                    >{{ userInitials(log.user) }}</div>
                    <!-- Dim dot for former member -->
                    <div
                      v-if="log.user && !log.user.is_active"
                      class="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-gray-500 border border-gray-300"
                      title="Former member"
                    ></div>
                  </div>
                  <div class="min-w-0">
                    <div class="text-xs text-gray-1000 leading-tight truncate max-w-[120px]" :class="{ 'opacity-60': log.user && !log.user.is_active }">
                      {{ log.user?.name ?? 'System' }}
                    </div>
                    <div v-if="log.user?.email" class="text-[10px] text-gray-700/60 truncate max-w-[120px]">{{ log.user.email }}</div>
                  </div>
                </div>
              </td>
              <td>
                <div v-if="log.resource_label || log.resource_type" class="text-xs">
                  <span class="font-mono text-gray-700">{{ log.resource_label || '—' }}</span>
                  <span v-if="log.resource_type" class="text-gray-700/50 ml-1">({{ log.resource_type }})</span>
                </div>
                <span v-else class="text-gray-700/40 text-xs">—</span>
              </td>
              <td class="font-mono text-xs text-gray-700">{{ log.ip_address || '—' }}</td>
              <td class="text-xs text-gray-700 whitespace-nowrap">{{ fmtDateTime(log.created_at) }}</td>
              <td>
                <span :class="['status-badge', log.status === 'success' ? 'status-active' : 'status-overdue']">
                  {{ log.status === 'success' ? 'Success' : 'Failed' }}
                </span>
              </td>
            </tr>
            <tr v-if="logs.length === 0">
              <td colspan="6" class="text-center py-12 text-gray-700 text-sm">No audit logs found</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Mobile list -->
      <div v-if="!isLoading" class="sm:hidden divide-y divide-gray-400">
        <div v-for="log in logs" :key="log.id" class="px-4 py-3.5">
          <div class="flex items-start justify-between gap-2 mb-1">
            <div class="flex items-center gap-2">
              <div class="w-6 h-6 rounded-md flex items-center justify-center shrink-0" :style="{ backgroundColor: eventMeta(log.event, log.status).color + '18' }">
                <Icon :icon="eventMeta(log.event, log.status).icon" class="w-3 h-3" :style="{ color: eventMeta(log.event, log.status).color }" />
              </div>
              <span class="text-sm font-medium text-gray-1000">{{ log.action }}</span>
            </div>
            <span :class="['status-badge', log.status === 'success' ? 'status-active' : 'status-overdue']">
              {{ log.status === 'success' ? 'OK' : 'Fail' }}
            </span>
          </div>
          <div class="text-xs text-gray-700 ml-8">{{ log.resource_label || '—' }} · {{ fmtDateTime(log.created_at) }}</div>
          <div class="flex items-center gap-1.5 ml-8 mt-1">
            <img
              v-if="log.user?.profile_photo"
              :src="log.user.profile_photo"
              class="w-4 h-4 rounded-full object-cover shrink-0"
            />
            <div
              v-else
              class="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold text-bg-100 shrink-0"
              :style="{ backgroundColor: userColor(log.user) }"
            >{{ userInitials(log.user) }}</div>
            <span class="text-[10px] text-gray-700/70 truncate" :class="{ 'opacity-60': log.user && !log.user.is_active }">
              {{ log.user?.name ?? 'System' }}
            </span>
          </div>
        </div>
        <div v-if="logs.length === 0" class="text-center py-12 text-gray-700 text-sm">No audit logs found</div>
      </div>

      <!-- Pagination -->
      <div class="px-4 py-3 border-t border-gray-400">
        <Pagination v-model="currentPage" :total="total" :per-page="perPage" />
      </div>
    </div>
  </div>
</template>
