<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useLoaders } from '@/composables/loaders'
import { useFormErrors } from '@/composables/formErrors'
import { useNotification } from '@/composables/notification'
import { AuthService } from '@/services/auth.service'
import { useAuthStore } from '@/stores/auth'
import InputField from '@/components/form/InputField.vue'
import BasicAlert from '@/components/alerts/BasicAlert.vue'
import type { ILoginData } from '@/types/auth.types'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const { notify } = useNotification()
const { initLoaders, setLoader, getLoader } = useLoaders()
const { getError, setError, clearAllErrors } = useFormErrors()

const otp    = ref('')
const userId = ref('')
const email  = ref('')

// Resend cooldown — starts at 60s, counts down to 0
const COOLDOWN = 60
const resendCooldown = ref(0)
let cooldownTimer: ReturnType<typeof setInterval> | null = null

initLoaders({ isVerifying: false, isResending: false })

onMounted(() => {
  userId.value = String(route.query.user_id ?? '')
  email.value  = String(route.query.email  ?? '')
  if (!userId.value) {
    router.replace({ name: 'signin' })
  }
})

onUnmounted(() => {
  if (cooldownTimer) clearInterval(cooldownTimer)
})

function startCooldown() {
  resendCooldown.value = COOLDOWN
  cooldownTimer = setInterval(() => {
    resendCooldown.value -= 1
    if (resendCooldown.value <= 0 && cooldownTimer) {
      clearInterval(cooldownTimer)
      cooldownTimer = null
    }
  }, 1000)
}

const canSubmit  = computed(() => otp.value.length === 6)
const canResend  = computed(() => resendCooldown.value === 0 && !getLoader('isResending'))

const handleResend = async () => {
  if (!canResend.value) return
  setLoader('isResending', true)
  try {
    await AuthService.resendMfaCode(userId.value)
    startCooldown()
    notify('A new code has been sent to your email.', 'success')
  } catch {
    notify('Could not resend code. Please try signing in again.', 'error')
  } finally {
    setLoader('isResending', false)
  }
}

const handleVerify = async () => {
  clearAllErrors()

  if (!canSubmit.value) {
    setError('otp', 'Please enter the 6-character code.')
    return
  }

  setLoader('isVerifying', true)

  try {
    const res = await AuthService.verifyMfa(userId.value, otp.value)
    const data = res.data.data as ILoginData
    authStore.setAuthData(data)
    notify('Welcome back!', 'success')
    const dest = route.query.redirect ? String(route.query.redirect) : { name: 'dashboard' }
    router.push(dest)
  } catch (err: any) {
    const message = err?.response?.data?.message ?? 'Verification failed. Please try again.'
    setError('otp', message)
    otp.value = ''
  } finally {
    setLoader('isVerifying', false)
  }
}
</script>

<template>
  <div class="min-h-screen grid-texture flex flex-col items-center justify-center px-4 py-16 pt-24">
    <div class="auth-card w-full max-w-md p-8 relative">
      <router-link :to="{ name: 'signin' }" class="flex items-center gap-2 text-gray-700 text-sm mb-7 hover:text-gray-1000">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        Back to sign in
      </router-link>

      <div class="w-12 h-12 rounded-full bg-green-100 border border-green-400 flex items-center justify-center mb-5">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="5" y="11" width="14" height="10" rx="2" />
          <path d="M8 11V7a4 4 0 0 1 8 0v4" />
        </svg>
      </div>

      <h1 class="font-sans text-3xl font-semibold text-gray-1000 mb-1">Two-factor verification</h1>
      <p class="text-gray-700 text-sm mb-7">
        Enter the 6-character code sent to
        <span v-if="email" class="text-gray-1000 font-medium">{{ email }}</span>
        <span v-else>your email address</span>.
      </p>

      <BasicAlert type="danger" class="mb-4" v-if="getError('otp').value">
        <span>{{ getError('otp').value }}</span>
      </BasicAlert>

      <div class="flex flex-col gap-4">
        <InputField
          v-model="otp"
          label-text="Verification code"
          type="text"
          :error="''"
          input-classes="px-2 py-2 text-sm transition-colors tracking-widest font-mono text-center"
          autocomplete="one-time-code"
          placeholder="A1B2C3"
          maxlength="6"
          @keyup.enter="handleVerify"
        />

        <button
          class="btn-primary w-full py-3.5 text-sm"
          :disabled="!canSubmit || getLoader('isVerifying')"
          @click="handleVerify"
        >
          <span v-if="!getLoader('isVerifying')">Verify & Sign in</span>
          <span v-else class="flex items-center justify-center gap-2">
            <svg class="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4" />
            </svg>
            Verifying…
          </span>
        </button>
      </div>

      <!-- Resend section -->
      <div class="mt-6 p-4 rounded-lg bg-gray-200/60 border border-gray-400">
        <p class="text-gray-700 text-xs mb-3">Didn't receive the code? Check your spam folder or request a new one.</p>
        <button
          class="w-full flex items-center justify-center gap-2 text-sm py-2.5 rounded-lg border transition-colors"
          :class="canResend
            ? 'border-green-700/30 text-green-700 hover:bg-green-700/10'
            : 'border-gray-500 text-gray-700 cursor-not-allowed'"
          :disabled="!canResend"
          @click="handleResend"
        >
          <svg v-if="getLoader('isResending')" class="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4" />
          </svg>
          <svg v-else-if="resendCooldown > 0" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
          </svg>
          <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.21"/>
          </svg>
          <span v-if="getLoader('isResending')">Sending…</span>
          <span v-else-if="resendCooldown > 0">Resend in {{ resendCooldown }}s</span>
          <span v-else>Resend code</span>
        </button>
      </div>
    </div>
  </div>
</template>
