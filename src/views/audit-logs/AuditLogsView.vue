<script setup lang="ts">
import { ref, computed } from 'vue';
import { Icon } from '@iconify/vue';

interface AuditLog {
  id: number;
  event: string;
  eventIcon: string;
  eventColor: string;
  user: string;
  userColor: string;
  resource: string;
  ip: string;
  time: string;
  success: boolean;
}

const searchQuery = ref('');

const logs: AuditLog[] = [
  { id: 1, event: 'Invoice Created',    eventIcon: 'lucide:file-plus',     eventColor: '#4ade80', user: 'Ada Lovelace',  userColor: '#e8a83e', resource: 'INV-0042',              ip: '196.22.44.10', time: 'Mar 15, 2025 09:32', success: true  },
  { id: 2, event: 'Member Invited',     eventIcon: 'lucide:user-plus',      eventColor: '#60a5fa', user: 'Ada Lovelace',  userColor: '#e8a83e', resource: 'james@studio.co',        ip: '196.22.44.10', time: 'Mar 15, 2025 09:10', success: true  },
  { id: 3, event: 'Login Failed',       eventIcon: 'lucide:shield-x',       eventColor: '#f87171', user: 'Unknown',       userColor: '#f87171', resource: 'ada@acmestudio.io',      ip: '203.11.5.88',  time: 'Mar 14, 2025 22:15', success: false },
  { id: 4, event: 'Invoice Paid',       eventIcon: 'lucide:check-circle',   eventColor: '#4ade80', user: 'System',        userColor: '#4ade80', resource: 'INV-0041',              ip: '—',            time: 'Mar 14, 2025 14:00', success: true  },
  { id: 5, event: 'Role Changed',       eventIcon: 'lucide:shield',         eventColor: '#a78bfa', user: 'Ada Lovelace',  userColor: '#e8a83e', resource: 'Luca Ferretti → Admin', ip: '196.22.44.10', time: 'Mar 13, 2025 11:42', success: true  },
  { id: 6, event: 'Settings Updated',   eventIcon: 'lucide:settings',       eventColor: '#e8a83e', user: 'Ada Lovelace',  userColor: '#e8a83e', resource: 'Invoice defaults',      ip: '196.22.44.10', time: 'Mar 12, 2025 16:05', success: true  },
  { id: 7, event: 'PDF Exported',       eventIcon: 'lucide:download',       eventColor: '#b8b0a0', user: 'Luca Ferretti', userColor: '#60a5fa', resource: 'INV-0040.pdf',           ip: '88.100.22.4',  time: 'Mar 12, 2025 10:30', success: true  },
  { id: 8, event: 'API Key Generated',  eventIcon: 'lucide:key',            eventColor: '#38bdf8', user: 'Ada Lovelace',  userColor: '#e8a83e', resource: 'prod_key_****3fa2',     ip: '196.22.44.10', time: 'Mar 11, 2025 09:01', success: true  },
];

const filtered = computed(() => {
  if (!searchQuery.value.trim()) return logs;
  const q = searchQuery.value.toLowerCase();
  return logs.filter(l => l.event.toLowerCase().includes(q) || l.user.toLowerCase().includes(q) || l.resource.toLowerCase().includes(q));
});

function userInitials(name: string) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}
</script>

<template>
  <div class="p-4 md:p-6 space-y-5 min-h-full">

    <!-- Page header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div>
        <h1 class="page-title">Audit Logs</h1>
        <p class="page-subtitle">Full activity trail for Acme Design Studio</p>
      </div>
      <div class="flex items-center gap-2">
        <button class="flex items-center gap-2 bg-charcoal-800 border border-charcoal-700 hover:border-charcoal-500 text-cream-muted hover:text-cream text-xs px-3 py-2 rounded-lg transition-colors">
          <Icon icon="lucide:download" class="w-3.5 h-3.5" /> Export Logs
        </button>
        <select class="app-select text-xs py-2 w-36">
          <option>All events</option>
          <option>User actions</option>
          <option>Document events</option>
          <option>Admin events</option>
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
        <input type="date" class="app-inp text-xs py-2 w-36 text-cream-muted" />
        <span class="text-xs text-cream-faint ml-auto">Showing {{ filtered.length }} of 1,247 events</span>
      </div>

      <!-- Desktop table -->
      <div class="hidden sm:block overflow-x-auto">
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
            <tr v-for="log in filtered" :key="log.id">
              <td>
                <div class="flex items-center gap-2.5">
                  <div class="w-7 h-7 rounded-md flex items-center justify-center shrink-0" :style="{ backgroundColor: log.eventColor + '18' }">
                    <Icon :icon="log.eventIcon" class="w-3.5 h-3.5" :style="{ color: log.eventColor }" />
                  </div>
                  <span class="text-sm font-medium text-cream">{{ log.event }}</span>
                </div>
              </td>
              <td>
                <div class="flex items-center gap-2">
                  <div class="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-charcoal-900 shrink-0" :style="{ backgroundColor: log.userColor }">
                    {{ userInitials(log.user) }}
                  </div>
                  <span class="text-cream-muted text-xs">{{ log.user }}</span>
                </div>
              </td>
              <td class="font-mono text-xs text-cream-faint max-w-40 truncate">{{ log.resource }}</td>
              <td class="font-mono text-xs text-cream-faint">{{ log.ip }}</td>
              <td class="text-xs text-cream-faint whitespace-nowrap">{{ log.time }}</td>
              <td>
                <span :class="['status-badge', log.success ? 'status-active' : 'status-overdue']">
                  {{ log.success ? 'Success' : 'Failed' }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Mobile list -->
      <div class="sm:hidden divide-y divide-charcoal-700">
        <div v-for="log in filtered" :key="log.id" class="px-4 py-3.5">
          <div class="flex items-start justify-between gap-2 mb-1">
            <div class="flex items-center gap-2">
              <div class="w-6 h-6 rounded-md flex items-center justify-center shrink-0" :style="{ backgroundColor: log.eventColor + '18' }">
                <Icon :icon="log.eventIcon" class="w-3 h-3" :style="{ color: log.eventColor }" />
              </div>
              <span class="text-sm font-medium text-cream">{{ log.event }}</span>
            </div>
            <span :class="['status-badge', log.success ? 'status-active' : 'status-overdue']">
              {{ log.success ? 'OK' : 'Fail' }}
            </span>
          </div>
          <div class="text-xs text-cream-faint ml-8">{{ log.user }} · {{ log.time }}</div>
        </div>
      </div>

      <!-- Pagination -->
      <div class="flex items-center justify-between px-4 py-3 border-t border-charcoal-700">
        <span class="text-xs text-cream-faint">Page 1 of 125</span>
        <div class="flex items-center gap-1">
          <button class="text-xs text-cream-muted hover:text-cream px-2 py-1 rounded-md hover:bg-charcoal-700 transition-colors">← Prev</button>
          <button class="text-xs bg-charcoal-700 text-cream px-2.5 py-1 rounded-md">1</button>
          <button class="text-xs text-cream-muted hover:text-cream px-2.5 py-1 rounded-md hover:bg-charcoal-700 transition-colors">2</button>
          <button class="text-xs text-cream-muted hover:text-cream px-2.5 py-1 rounded-md hover:bg-charcoal-700 transition-colors">3</button>
          <button class="text-xs text-cream-muted hover:text-cream px-2 py-1 rounded-md hover:bg-charcoal-700 transition-colors">Next →</button>
        </div>
      </div>
    </div>
  </div>
</template>
