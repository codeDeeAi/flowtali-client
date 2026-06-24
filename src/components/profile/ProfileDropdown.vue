<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { Icon } from '@iconify/vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { AuthService } from '@/services/auth.service'
import { ProfileService, type IUserProfile } from '@/services/profile.service'

const router    = useRouter()
const authStore = useAuthStore()

const open        = ref(false)
const profile     = ref<IUserProfile | null>(null)
const isLoggingOut = ref(false)

// Fall back to auth store name while profile loads
const displayName = computed(() => {
  if (profile.value) return profile.value.full_name
  const u = authStore.getUser
  if (!u) return ''
  return `${u.first_name} ${u.last_name}`.trim()
})

const initials = computed(() => {
  const name = displayName.value
  if (!name) return '?'
  const parts = name.trim().split(' ')
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?'
})

async function loadProfile() {
  if (profile.value) return
  try {
    const res  = await ProfileService.get()
    profile.value = res.data.data
  } catch {}
}

function toggle() {
  open.value = !open.value
  if (open.value) loadProfile()
}

async function logout() {
  isLoggingOut.value = true
  try { await AuthService.logout() } catch {}
  finally {
    authStore.logout()
    router.push({ name: 'signin' })
  }
}

// Click outside
const containerRef = ref<HTMLElement | null>(null)
function onOutsideClick(e: MouseEvent) {
  if (containerRef.value && !containerRef.value.contains(e.target as Node)) {
    open.value = false
  }
}
onMounted(() => document.addEventListener('mousedown', onOutsideClick))
onUnmounted(() => document.removeEventListener('mousedown', onOutsideClick))
</script>

<template>
  <div ref="containerRef" class="relative">
    <!-- Avatar button -->
    <button
      class="flex items-center gap-2 rounded-lg px-1.5 py-1 hover:bg-gray-400 transition-colors"
      @click="toggle"
      aria-label="Profile menu"
    >
      <!-- Avatar photo or initials -->
      <div class="w-7 h-7 rounded-full overflow-hidden shrink-0 bg-green-700/20 flex items-center justify-center">
        <img
          v-if="profile?.avatar"
          :src="profile.avatar"
          :alt="displayName"
          class="w-full h-full object-cover"
        />
        <span v-else class="text-[11px] font-bold text-green-700 leading-none">{{ initials }}</span>
      </div>
      <!-- Name (desktop only) -->
      <span class="hidden md:block text-sm text-gray-900 max-w-[120px] truncate">{{ displayName }}</span>
      <Icon icon="lucide:chevron-down" class="hidden md:block w-3 h-3 text-gray-700 shrink-0" :class="{ 'rotate-180': open }" style="transition: transform 0.15s" />
    </button>

    <!-- Dropdown -->
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
        class="absolute right-0 top-full mt-2 w-56 bg-gray-200 border border-gray-400 rounded-xl shadow-2xl z-50 overflow-hidden origin-top-right"
      >
        <!-- Profile header -->
        <div class="px-4 py-3 border-b border-gray-400">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-full overflow-hidden shrink-0 bg-green-700/20 flex items-center justify-center">
              <img
                v-if="profile?.avatar"
                :src="profile.avatar"
                :alt="displayName"
                class="w-full h-full object-cover"
              />
              <span v-else class="text-sm font-bold text-green-700 leading-none">{{ initials }}</span>
            </div>
            <div class="min-w-0">
              <div class="text-sm font-semibold text-gray-1000 truncate">{{ displayName }}</div>
              <div class="text-[11px] text-gray-700 truncate">{{ profile?.email ?? '' }}</div>
            </div>
          </div>
        </div>

        <!-- Menu items -->
        <div class="py-1">
          <RouterLink
            :to="{ name: 'profile' }"
            class="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-900 hover:text-gray-1000 hover:bg-gray-400 transition-colors"
            @click="open = false"
          >
            <Icon icon="lucide:user" class="w-4 h-4 shrink-0" />
            My Profile
          </RouterLink>

          <RouterLink
            :to="{ name: 'settings' }"
            class="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-900 hover:text-gray-1000 hover:bg-gray-400 transition-colors"
            @click="open = false"
          >
            <Icon icon="lucide:settings" class="w-4 h-4 shrink-0" />
            Settings
          </RouterLink>
        </div>

        <div class="border-t border-gray-400 py-1">
          <button
            class="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
            :disabled="isLoggingOut"
            @click="logout"
          >
            <Icon v-if="isLoggingOut" icon="lucide:loader-2" class="w-4 h-4 animate-spin shrink-0" />
            <Icon v-else icon="lucide:log-out" class="w-4 h-4 shrink-0" />
            {{ isLoggingOut ? 'Signing out…' : 'Sign out' }}
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>
