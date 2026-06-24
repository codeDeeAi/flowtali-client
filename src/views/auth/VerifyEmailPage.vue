<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useLoaders } from '@/composables/loaders'
import { useFormErrors } from '@/composables/formErrors'
import { AuthService } from '@/services/auth.service'
import InputField from '@/components/form/InputField.vue'
import BasicAlert from '@/components/alerts/BasicAlert.vue'

const route = useRoute()
const router = useRouter()
const { initLoaders, setLoader, getLoader } = useLoaders()
const { getError, setError, clearAllErrors } = useFormErrors()

const state = ref<'verifying' | 'success' | 'error' | 'resend'>('verifying')
const resendEmail = ref('')
const resendSent = ref(false)

initLoaders({ isVerifying: false, isResending: false })

const verify = async (userId: string, token: string) => {
  clearAllErrors()
  setLoader('isVerifying', true)
  state.value = 'verifying'

  try {
    await AuthService.verifyEmail(userId, token)
    state.value = 'success'

    // Check if there's a pending invitation token stored in sessionStorage
    const pendingInvitationToken = sessionStorage.getItem('pending_invitation_token')
    if (pendingInvitationToken) {
      sessionStorage.removeItem('pending_invitation_token')
      await router.push(`/invitations/accept?token=${pendingInvitationToken}`)
      return
    }
  } catch (err: any) {
    const message = err?.response?.data?.message ?? 'Verification failed. The link may be expired.'
    setError('general', message)
    state.value = 'error'
  } finally {
    setLoader('isVerifying', false)
  }
}

const handleResend = async () => {
  clearAllErrors()
  if (!resendEmail.value) {
    setError('resend_email', 'Please enter your email address.')
    return
  }

  setLoader('isResending', true)
  try {
    await AuthService.resendEmailVerification(resendEmail.value)
    resendSent.value = true
  } catch (err: any) {
    const message = err?.response?.data?.message ?? 'Failed to resend. Please try again.'
    setError('resend_email', message)
  } finally {
    setLoader('isResending', false)
  }
}

onMounted(() => {
  const userId = String(route.query.user_id ?? '')
  const token = String(route.query.token ?? '')

  if (userId && token) {
    verify(userId, token)
  } else {
    state.value = 'resend'
  }
})
</script>

<template>
  <div class="min-h-screen grid-texture flex flex-col items-center justify-center px-4 py-16 pt-24">
    <div class="auth-card w-full max-w-md p-8 relative text-center">

      <!-- Verifying spinner -->
      <div v-if="state === 'verifying'" class="py-8">
        <svg class="animate-spin w-10 h-10 text-green-700 mx-auto mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4" />
        </svg>
        <p class="text-gray-700">Verifying your email address…</p>
      </div>

      <!-- Success -->
      <div v-else-if="state === 'success'" class="py-4">
        <div class="w-16 h-16 rounded-full bg-green-900/30 border border-green-700/50 flex items-center justify-center mx-auto mb-5">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#4ade80" stroke-width="2.5">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h2 class="font-sans text-2xl font-semibold text-gray-1000 mb-2">Email verified!</h2>
        <p class="text-gray-900 text-sm mb-6">Your email address has been verified. You can now sign in.</p>
        <router-link :to="{ name: 'signin' }" class="btn-primary text-sm px-6 py-2.5 inline-block">
          Sign in to Flowtali
        </router-link>
      </div>

      <!-- Error (link expired/invalid) -->
      <div v-else-if="state === 'error'" class="py-4">
        <div class="w-16 h-16 rounded-full bg-red-900/30 border border-red-700/50 flex items-center justify-center mx-auto mb-5">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#f87171" stroke-width="2.5">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <h2 class="font-sans text-2xl font-semibold text-gray-1000 mb-2">Verification failed</h2>
        <p class="text-gray-900 text-sm mb-6">{{ getError('general').value }}</p>
        <button class="btn-primary text-sm px-6 py-2.5 mb-3" @click="state = 'resend'">
          Resend verification email
        </button>
        <br />
        <router-link :to="{ name: 'signin' }" class="btn-ghost text-sm px-6 py-2.5">
          Back to sign in
        </router-link>
      </div>

      <!-- Resend form (no URL params or after error) -->
      <div v-else class="text-left">
        <router-link :to="{ name: 'signin' }" class="flex items-center gap-2 text-gray-700 text-sm mb-7 hover:text-gray-1000">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Back to sign in
        </router-link>

        <div v-if="!resendSent">
          <h1 class="font-sans text-3xl font-semibold text-gray-1000 mb-1">Verify your email</h1>
          <p class="text-gray-700 text-sm mb-7">
            Please click the verification link in your email. If you need a new one, enter your email below.
          </p>

          <div class="flex flex-col gap-4">
            <InputField
              v-model="resendEmail"
              label-text="Email address"
              type="email"
              :error="getError('resend_email').value || ''"
              input-classes="px-2 py-2 text-sm transition-colors"
              autocomplete="email"
              placeholder="you@example.com"
              @keyup.enter="handleResend"
            />
            <button
              class="btn-primary w-full py-3.5 text-sm"
              :disabled="getLoader('isResending')"
              @click="handleResend"
            >
              <span v-if="!getLoader('isResending')">Resend verification email</span>
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
          <div class="w-16 h-16 rounded-full bg-green-100 border border-green-400 flex items-center justify-center mx-auto mb-5">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
          </div>
          <h2 class="font-sans text-2xl font-semibold text-gray-1000 mb-2">Email sent!</h2>
          <p class="text-gray-900 text-sm mb-6">
            If <span class="text-green-700">{{ resendEmail }}</span> is registered and unverified, a new verification link has been sent.
          </p>
          <router-link :to="{ name: 'signin' }" class="btn-ghost text-sm px-6 py-2.5">
            Back to sign in
          </router-link>
        </div>
      </div>

    </div>
  </div>
</template>
