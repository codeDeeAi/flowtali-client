<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { Icon } from '@iconify/vue'
import { useAuthStore } from '@/stores/auth'
import { NotificationInboxService, type IInboxNotification } from '@/services/notification-inbox.service'

const authStore = useAuthStore()
const orgId     = computed(() => authStore.getCurrentOrganization?.id ?? '')

const open          = ref(false)
const notifications = ref<IInboxNotification[]>([])
const unreadCount   = ref(0)
const isLoading     = ref(false)

// ─── Type meta ────────────────────────────────────────────────────────────────

const typeMeta: Record<string, { icon: string; color: string }> = {
  invoice_paid:    { icon: 'lucide:circle-check',  color: '#4ade80' },
  invoice_overdue: { icon: 'lucide:alert-triangle', color: '#f87171' },
  invoice_sent:    { icon: 'lucide:send',           color: '#60a5fa' },
  invoice_viewed:  { icon: 'lucide:eye',            color: '#a78bfa' },
  member_joined:   { icon: 'lucide:user-plus',      color: '#e8a83e' },
  role_changed:    { icon: 'lucide:shield',         color: '#38bdf8' },
}

function meta(type: string) {
  return typeMeta[type] ?? { icon: 'lucide:bell', color: '#9ca3af' }
}

// ─── Time formatting ──────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m    = Math.floor(diff / 60_000)
  if (m < 1)  return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 30) return `${d}d ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// ─── Data loading ─────────────────────────────────────────────────────────────

async function fetchCount() {
  if (!orgId.value) return
  try {
    const res = await NotificationInboxService.unreadCount(orgId.value)
    unreadCount.value = res.data.data.count
  } catch {}
}

async function fetchList() {
  if (!orgId.value) return
  isLoading.value = true
  try {
    const res = await NotificationInboxService.list(orgId.value)
    notifications.value = res.data.data.data
    unreadCount.value   = notifications.value.filter(n => !n.read_at).length
  } catch {} finally { isLoading.value = false }
}

async function onOpen() {
  open.value = !open.value
  if (open.value) await fetchList()
}

async function markRead(n: IInboxNotification) {
  if (n.read_at) return
  n.read_at = new Date().toISOString()
  unreadCount.value = Math.max(0, unreadCount.value - 1)
  try { await NotificationInboxService.markRead(orgId.value, n.id) } catch {}
}

async function markAllRead() {
  if (!orgId.value) return
  notifications.value.forEach(n => { n.read_at = n.read_at ?? new Date().toISOString() })
  unreadCount.value = 0
  try { await NotificationInboxService.markAllRead(orgId.value) } catch {}
}

// ─── Click outside ────────────────────────────────────────────────────────────

const dropdownRef = ref<HTMLElement | null>(null)

function handleOutsideClick(e: MouseEvent) {
  if (dropdownRef.value && !dropdownRef.value.contains(e.target as Node)) {
    open.value = false
  }
}

onMounted(() => {
  fetchCount()
  document.addEventListener('mousedown', handleOutsideClick)
  // Poll unread count every 60s
  const timer = setInterval(fetchCount, 60_000)
  onUnmounted(() => {
    clearInterval(timer)
    document.removeEventListener('mousedown', handleOutsideClick)
  })
})

watch(orgId, () => { fetchCount(); notifications.value = []; unreadCount.value = 0 })
</script>

<template>
  <div ref="dropdownRef" class="relative">
    <!-- Bell button -->
    <button
      class="relative flex items-center justify-center w-8 h-8 rounded-md text-cream-muted hover:text-cream hover:bg-charcoal-700 transition-colors"
      @click="onOpen"
      aria-label="Notifications"
    >
      <Icon icon="lucide:bell" class="w-4 h-4" />
      <!-- Unread badge -->
      <span
        v-if="unreadCount > 0"
        class="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 flex items-center justify-center rounded-full bg-amber text-charcoal-900 text-[9px] font-bold leading-none px-0.5"
      >
        {{ unreadCount > 99 ? '99+' : unreadCount }}
      </span>
    </button>

    <!-- Dropdown panel -->
    <Transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="opacity-0 scale-95 translate-y-1"
      enter-to-class="opacity-100 scale-100 translate-y-0"
      leave-active-class="transition duration-100 ease-in"
      leave-from-class="opacity-100 scale-100 translate-y-0"
      leave-to-class="opacity-0 scale-95 translate-y-1"
    >
      <div
        v-if="open"
        class="absolute right-0 top-full mt-2 w-80 bg-charcoal-800 border border-charcoal-700 rounded-xl shadow-2xl z-50 overflow-hidden origin-top-right"
      >
        <!-- Header -->
        <div class="flex items-center justify-between px-4 py-3 border-b border-charcoal-700">
          <div class="flex items-center gap-2">
            <span class="text-sm font-semibold text-cream">Notifications</span>
            <span v-if="unreadCount > 0" class="text-[10px] font-bold bg-amber/15 text-amber px-1.5 py-0.5 rounded-full">
              {{ unreadCount }} new
            </span>
          </div>
          <button
            v-if="unreadCount > 0"
            class="text-[11px] text-cream-faint hover:text-cream transition-colors"
            @click="markAllRead"
          >
            Mark all read
          </button>
        </div>

        <!-- List -->
        <div class="max-h-[380px] overflow-y-auto">
          <!-- Loading -->
          <div v-if="isLoading" class="flex items-center justify-center py-10">
            <Icon icon="lucide:loader-2" class="w-5 h-5 text-amber animate-spin" />
          </div>

          <!-- Empty -->
          <div v-else-if="notifications.length === 0" class="flex flex-col items-center justify-center py-10 gap-2 text-cream-faint">
            <Icon icon="lucide:bell-off" class="w-8 h-8 opacity-40" />
            <span class="text-xs">No notifications yet</span>
          </div>

          <!-- Items -->
          <button
            v-else
            v-for="n in notifications"
            :key="n.id"
            class="w-full flex items-start gap-3 px-4 py-3 border-b border-charcoal-700 last:border-0 hover:bg-charcoal-700/50 transition-colors text-left"
            :class="{ 'bg-amber/5': !n.read_at }"
            @click="markRead(n)"
          >
            <!-- Type icon -->
            <div
              class="w-7 h-7 rounded-md flex items-center justify-center shrink-0 mt-0.5"
              :style="{ backgroundColor: meta(n.type).color + '18' }"
            >
              <Icon :icon="meta(n.type).icon" class="w-3.5 h-3.5" :style="{ color: meta(n.type).color }" />
            </div>

            <!-- Text -->
            <div class="flex-1 min-w-0">
              <div class="text-xs font-medium text-cream leading-snug" :class="{ 'font-semibold': !n.read_at }">
                {{ n.title }}
              </div>
              <div v-if="n.body" class="text-[11px] text-cream-faint mt-0.5 truncate">{{ n.body }}</div>
              <div class="text-[10px] text-cream-faint/60 mt-1">{{ timeAgo(n.created_at) }}</div>
            </div>

            <!-- Unread dot -->
            <div v-if="!n.read_at" class="w-1.5 h-1.5 rounded-full bg-amber shrink-0 mt-1.5"></div>
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>
