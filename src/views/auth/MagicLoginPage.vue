<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useLoaders } from '@/composables/loaders'
import { useFormErrors } from '@/composables/formErrors'
import { useNotification } from '@/composables/notification'
import { useAuthStore } from '@/stores/auth'
import { AuthService } from '@/services/auth.service'
import InputField from '@/components/form/InputField.vue'
import BasicAlert from '@/components/alerts/BasicAlert.vue'
import type { ILoginData } from '@/types/auth.types'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const { notify } = useNotification()
const { initLoaders, setLoader, getLoader } = useLoaders()
const { getError, setError, clearAllErrors } = useFormErrors()

const email = ref('')
const sent = ref(false)

// Verify mode: URL has user_id + token
const verifyMode = ref(false)
const isAutoVerifying = ref(false)
const verifyError = ref('')

initLoaders({ isSending: false, isVerifying: false })

const redirectAfterLogin = (loginData: ILoginData) => {
  authStore.setAuthData(loginData)
  notify('Signed in successfully!', 'success')
  const dest = route.query.redirect ? String(route.query.redirect) : { name: 'dashboard' }
  router.push(dest)
}

const handleRequest = async () => {
  clearAllErrors()
  if (!email.value) {
    setError('email', 'Email address is required.')
    return
  }

  setLoader('isSending', true)
  try {
    await AuthService.requestMagicLogin(email.value)
    sent.value = true
  } catch (err: any) {
    const message = err?.response?.data?.message ?? 'Something went wrong. Please try again.'
    setError('general', message)
  } finally {
    setLoader('isSending', false)
  }
}

const handleVerify = async (userId: string, token: string) => {
  setLoader('isVerifying', true)
  try {
    const res = await AuthService.verifyMagicLogin(userId, token)
    redirectAfterLogin(res.data.data as ILoginData)
  } catch (err: any) {
    verifyError.value = err?.response?.data?.message ?? 'This link is invalid or has expired.'
  } finally {
    setLoader('isVerifying', false)
    isAutoVerifying.value = false
  }
}

onMounted(() => {
  const qUserId = String(route.query.user_id ?? '')
  const qToken = String(route.query.token ?? '')

  if (qUserId && qToken) {
    verifyMode.value = true
    isAutoVerifying.value = true
    handleVerify(qUserId, qToken)
  }
})
</script>

<template>
  <div class="min-h-screen grid-texture flex flex-col items-center justify-center px-4 py-16 pt-24">
    <div class="auth-card w-full max-w-md p-8 relative">

      <!-- Auto-verify in progress -->
      <div v-if="verifyMode && isAutoVerifying" class="text-center py-8">
        <svg class="animate-spin w-10 h-10 text-amber mx-auto mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4" />
        </svg>
        <p class="text-cream-faint">Signing you in…</p>
      </div>

      <!-- Verify error -->
      <div v-else-if="verifyMode && verifyError" class="text-center py-4">
        <div class="w-16 h-16 rounded-full bg-red-900/30 border border-red-700/50 flex items-center justify-center mx-auto mb-5">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#f87171" stroke-width="2.5">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <h2 class="font-display text-2xl font-semibold text-cream mb-2">Link expired</h2>
        <p class="text-cream-muted text-sm mb-6">{{ verifyError }}</p>
        <router-link :to="{ name: 'auth.magic-login' }" class="btn-primary text-sm px-6 py-2.5 inline-block">
          Request a new link
        </router-link>
      </div>

      <!-- Request form -->
      <div v-else-if="!sent">
        <router-link :to="{ name: 'signin' }" class="flex items-center gap-2 text-cream-faint text-sm mb-7 hover:text-cream">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Back to sign in
        </router-link>

        <div class="flex items-center gap-2.5 mb-2">
          <div class="w-7 h-7 rounded-lg bg-gradient-to-br from-amber to-amber-light flex items-center justify-center">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#0a0a0b" stroke-width="2.5">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M7 8h10M7 12h6M7 16h4" />
            </svg>
          </div>
          <span class="font-display font-semibold text-lg text-cream">Flowtali</span>
        </div>

        <h1 class="font-display text-3xl font-semibold text-cream mt-5 mb-1">Sign in without password</h1>
        <p class="text-cream-faint text-sm mb-7">We'll send a one-click sign-in link to your email.</p>

        <BasicAlert type="danger" class="mb-4" v-if="getError('general').value">
          <span>{{ getError('general').value }}</span>
        </BasicAlert>

        <div class="flex flex-col gap-4">
          <InputField
            v-model="email"
            label-text="Email address"
            type="email"
            :error="getError('email').value || ''"
            input-classes="px-2 py-2 text-sm transition-colors"
            autocomplete="email"
            placeholder="you@example.com"
            @keyup.enter="handleRequest"
          />

          <button
            class="btn-primary w-full py-3.5 text-sm"
            :disabled="getLoader('isSending')"
            @click="handleRequest"
          >
            <span v-if="!getLoader('isSending')">Send magic link</span>
            <span v-else class="flex items-center justify-center gap-2">
              <svg class="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4" />
              </svg>
              Sending…
            </span>
          </button>
        </div>
      </div>

      <!-- Sent success -->
      <div v-else class="text-center py-4">
        <div class="w-16 h-16 rounded-full bg-amber-dim border border-amber-border flex items-center justify-center mx-auto mb-5">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#E8A83E" stroke-width="2">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
            <polyline points="22,6 12,13 2,6" />
          </svg>
        </div>
        <h2 class="font-display text-2xl font-semibold text-cream mb-2">Check your email</h2>
        <p class="text-cream-muted text-sm mb-6">
          If an account exists for <span class="text-amber">{{ email }}</span>, a magic link has been sent. It expires in 15 minutes.
        </p>
        <router-link :to="{ name: 'signin' }" class="btn-ghost text-sm px-6 py-2.5">
          Back to sign in
        </router-link>
      </div>

    </div>
  </div>
</template>
