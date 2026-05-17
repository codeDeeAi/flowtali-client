<script lang="ts" setup>
import { ref } from 'vue'
import InputField from '@/components/form/InputField.vue'
import BasicAlert from '@/components/alerts/BasicAlert.vue'
import { useLoaders } from '@/composables/loaders'
import { useFormErrors } from '@/composables/formErrors'
import { AuthService } from '@/services/auth.service'

const email = ref('')
const sent = ref(false)

const { initLoaders, setLoader, getLoader } = useLoaders()
const { getError, setError, clearAllErrors } = useFormErrors()

initLoaders({ isSending: false })

const handleForgot = async () => {
  clearAllErrors()

  if (!email.value) {
    setError('email', 'Email address is required.')
    return
  }

  setLoader('isSending', true)

  try {
    await AuthService.forgotPassword(email.value)
    sent.value = true
  } catch (err: any) {
    const message = err?.response?.data?.message ?? 'Something went wrong. Please try again.'
    setError('general', message)
  } finally {
    setLoader('isSending', false)
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

      <div v-if="!sent">
        <h1 class="font-display text-3xl font-semibold text-cream mb-2">Reset your password</h1>
        <p class="text-cream-faint text-sm mb-7">Enter your email and we'll send you a reset code.</p>

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
            placeholder="ada@studio.io"
            @keyup.enter="handleForgot"
          />
          <button
            class="btn-primary w-full py-3.5 text-sm"
            :disabled="getLoader('isSending')"
            @click="handleForgot"
          >
            <span v-if="!getLoader('isSending')">Send reset code</span>
            <span v-else class="flex items-center justify-center gap-2">
              <svg class="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4" />
              </svg>
              Sending…
            </span>
          </button>
        </div>
      </div>

      <div v-else class="text-center py-4">
        <div class="w-16 h-16 rounded-full bg-amber-dim border border-amber-border flex items-center justify-center mx-auto mb-5">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#E8A83E" stroke-width="2">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
            <polyline points="22,6 12,13 2,6" />
          </svg>
        </div>
        <h2 class="font-display text-2xl font-semibold text-cream mb-2">Check your email</h2>
        <p class="text-cream-muted text-sm mb-6">
          We sent a reset code to <span class="text-amber">{{ email }}</span>
        </p>
        <router-link :to="{ name: 'auth.reset-password', query: { email } }" class="btn-primary text-sm px-6 py-2.5 inline-block mb-3">
          Enter reset code
        </router-link>
        <br />
        <router-link :to="{ name: 'signin' }" class="btn-ghost text-sm px-6 py-2.5">
          Back to sign in
        </router-link>
      </div>
    </div>
  </div>
</template>
