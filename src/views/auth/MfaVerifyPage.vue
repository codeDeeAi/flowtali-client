<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
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

const otp = ref('')
const userId = ref('')

initLoaders({ isVerifying: false })

onMounted(() => {
  userId.value = String(route.query.user_id ?? '')
  if (!userId.value) {
    router.replace({ name: 'signin' })
  }
})

const canSubmit = computed(() => otp.value.length === 6)

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
  } finally {
    setLoader('isVerifying', false)
  }
}
</script>

<template>
  <div class="min-h-screen grid-texture flex flex-col items-center justify-center px-4 py-16 pt-24">
    <div class="auth-card w-full max-w-md p-8 relative">
      <router-link :to="{ name: 'signin' }" class="flex items-center gap-2 text-cream-faint text-sm mb-7 hover:text-cream">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        Back to sign in
      </router-link>

      <div class="w-12 h-12 rounded-full bg-amber-dim border border-amber-border flex items-center justify-center mb-5">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#E8A83E" stroke-width="2">
          <rect x="5" y="11" width="14" height="10" rx="2" />
          <path d="M8 11V7a4 4 0 0 1 8 0v4" />
        </svg>
      </div>

      <h1 class="font-display text-3xl font-semibold text-cream mb-1">Two-factor verification</h1>
      <p class="text-cream-faint text-sm mb-7">
        Enter the 6-character code sent to your email address.
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

      <p class="text-cream-faint text-sm text-center mt-5">
        Didn't receive a code?
        <router-link :to="{ name: 'signin' }" class="text-amber hover:underline">Try signing in again</router-link>
      </p>
    </div>
  </div>
</template>
