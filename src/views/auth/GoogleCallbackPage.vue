<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useNotification } from '@/composables/notification'
import { AuthService } from '@/services/auth.service'
import type { ILoginData } from '@/types/auth.types'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const { notify } = useNotification()

const error = ref('')

onMounted(async () => {
  const code = String(route.query.code ?? '')
  const errorParam = route.query.error

  if (errorParam) {
    error.value = 'Google sign-in was cancelled or denied.'
    return
  }

  if (!code) {
    error.value = 'Invalid OAuth callback — missing authorization code.'
    return
  }

  try {
    const res = await AuthService.googleCallback(code)
    const data = res.data.data as ILoginData
    authStore.setAuthData(data)
    notify('Signed in with Google!', 'success')
    const dest = route.query.state ? String(route.query.state) : { name: 'dashboard' }
    router.replace(dest)
  } catch (err: any) {
    error.value = err?.response?.data?.message ?? 'Google sign-in failed. Please try again.'
  }
})
</script>

<template>
  <div class="min-h-screen grid-texture flex flex-col items-center justify-center px-4">
    <div class="auth-card w-full max-w-md p-8 text-center">

      <div v-if="!error" class="py-8">
        <svg class="animate-spin w-10 h-10 text-amber mx-auto mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4" />
        </svg>
        <p class="text-cream-faint">Completing sign-in with Google…</p>
      </div>

      <div v-else class="py-4">
        <div class="w-16 h-16 rounded-full bg-red-900/30 border border-red-700/50 flex items-center justify-center mx-auto mb-5">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#f87171" stroke-width="2.5">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <h2 class="font-display text-2xl font-semibold text-cream mb-2">Sign-in failed</h2>
        <p class="text-cream-muted text-sm mb-6">{{ error }}</p>
        <router-link :to="{ name: 'signin' }" class="btn-primary text-sm px-6 py-2.5 inline-block">
          Try again
        </router-link>
      </div>

    </div>
  </div>
</template>
