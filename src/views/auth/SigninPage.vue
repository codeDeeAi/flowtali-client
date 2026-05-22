<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useLoaders } from '@/composables/loaders.ts'
import { signinSchema } from './validation/schema.ts'
import { useFormErrors } from '@/composables/formErrors'
import { useYupForm } from '@/composables/useYupForm.ts'
import InputField from '@/components/form/InputField.vue'
import BasicAlert from '@/components/alerts/BasicAlert.vue'
import PasswordField from '@/components/form/PasswordField.vue'
import { useNotification } from '@/composables/notification.ts'
import { AuthService, type IMfaChallenge } from '@/services/auth.service'
import { useAuthStore } from '@/stores/auth'
import type { ILoginData } from '@/types/auth.types'

const signinForm = ref({ email: '', password: '' })

const { setErrors, clearAllErrors, getError, setError } = useFormErrors()
const { initLoaders, setLoader, getLoader } = useLoaders()
const { notify } = useNotification()
const { validate } = useYupForm()
const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const emailNotVerified = ref(false)

initLoaders({ isSigningIn: false, isGoogleLoading: false })

const canSubmit = computed(() => !!signinForm.value.email && !!signinForm.value.password)

const redirectAfterLogin = () => {
  const dest = route.query.redirect ? String(route.query.redirect) : { name: 'dashboard' }
  router.push(dest)
}

const handleLoginSuccess = (data: ILoginData) => {
  authStore.setAuthData(data)
  notify('Welcome back!', 'success')
  redirectAfterLogin()
}

const handleSignin = async () => {
  clearAllErrors()

  const valid = await validate(signinSchema, signinForm.value)
  if (!valid.valid) {
    setErrors(valid.errors ?? {})
    return
  }

  emailNotVerified.value = false
  setLoader('isSigningIn', true)

  try {
    const res = await AuthService.login(signinForm.value.email, signinForm.value.password)

    if (res.status === 202) {
      const challenge = res.data.data as IMfaChallenge
      const routeName = challenge.type === 'mfa_setup' ? 'auth.mfa-setup' : 'auth.mfa-verify'
      router.push({
        name: routeName,
        query: {
          user_id: challenge.user_id,
          email: challenge.email,
          redirect: route.query.redirect,
        },
      })
      return
    }

    handleLoginSuccess(res.data.data as ILoginData)
  } catch (err: any) {
    const message = err?.response?.data?.message ?? 'Sign in failed. Please try again.'
    if (err?.response?.data?.error === 'email_not_verified') {
      emailNotVerified.value = true
    }
    setError('general', message)
  } finally {
    setLoader('isSigningIn', false)
  }
}

const handleGoogleSignin = async () => {
  setLoader('isGoogleLoading', true)
  try {
    const res = await AuthService.getGoogleRedirectUrl()
    window.location.href = res.data.data.redirect_url
  } catch {
    notify('Could not initiate Google sign-in. Please try again.', 'error')
    setLoader('isGoogleLoading', false)
  }
}
</script>

<template>
  <div class="min-h-screen grid-texture flex flex-col items-center justify-center px-4 py-16 pt-24">
    <div
      class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full pointer-events-none"
      style="background:radial-gradient(circle,rgba(232,168,62,0.07) 0%,transparent 70%)" />
    <div class="auth-card w-full max-w-md p-8 relative">
      <router-link
        :to="{ name: 'home' }"
        class="flex items-center gap-2 text-cream-faint text-sm mb-7 hover:text-cream"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        Back to Flowtali
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

      <h1 class="font-display text-3xl font-semibold text-cream mt-5 mb-1">Welcome back</h1>
      <p class="text-cream-faint text-sm mb-7">Sign in to your Flowtali account.</p>

      <button
        class="w-full flex items-center justify-center gap-3 bg-charcoal-700/60 border border-charcoal-600/80 hover:border-charcoal-500 rounded-lg py-3 text-cream text-sm font-medium transition-all mb-4 disabled:opacity-60"
        :disabled="getLoader('isGoogleLoading')"
        @click="handleGoogleSignin"
      >
        <svg v-if="!getLoader('isGoogleLoading')" width="18" height="18" viewBox="0 0 24 24">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
        </svg>
        <svg v-else class="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4" />
        </svg>
        Continue with Google
      </button>

      <div class="flex items-center gap-3 mb-5">
        <div class="flex-1 h-px bg-charcoal-700/60" />
        <span class="text-cream-faint text-xs">or sign in with email</span>
        <div class="flex-1 h-px bg-charcoal-700/60" />
      </div>

      <BasicAlert type="danger" class="mb-4" v-if="getError('general').value">
        <span>{{ getError('general').value }}</span>
        <router-link v-if="emailNotVerified" :to="{ name: 'auth.verify-email' }" class="block mt-2 text-amber underline text-xs">
          Resend verification email →
        </router-link>
      </BasicAlert>

      <div class="flex flex-col gap-4">
        <InputField
          v-model="signinForm.email"
          label-text="Email address"
          type="email"
          :is-required="true"
          :error="getError('email').value || ''"
          input-classes="px-2 py-2 text-sm transition-colors"
          autocapitalize="none"
          autocomplete="email"
          placeholder=""
        />
        <div>
          <div class="flex items-center justify-between mb-1.5">
            <label class="block text-xs text-cream-faint uppercase tracking-wider">Password</label>
            <router-link :to="{ name: 'forgot-password' }" class="text-amber text-xs hover:underline">
              Forgot password?
            </router-link>
          </div>
          <PasswordField
            v-model="signinForm.password"
            :error="getError('password').value || ''"
            input-classes="px-2 py-2 text-sm transition-colors"
            placeholder="Enter your password"
          />
        </div>

        <button
          class="btn-primary w-full py-3.5 text-sm mt-1"
          @click="handleSignin"
          :disabled="!canSubmit || getLoader('isSigningIn')"
        >
          <span v-if="!getLoader('isSigningIn')">Sign in to Flowtali</span>
          <span v-else class="flex items-center justify-center gap-2">
            <svg class="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4" />
            </svg>
            Signing in…
          </span>
        </button>
      </div>

      <div class="text-center mt-4">
        <router-link :to="{ name: 'auth.magic-login' }" class="text-amber text-sm hover:underline">
          Sign in without password →
        </router-link>
      </div>

      <p class="text-center text-cream-faint text-sm mt-5">
        Don't have an account?
        <router-link :to="{ name: 'signup' }" class="text-amber hover:underline">Sign up free</router-link>
      </p>
    </div>
  </div>
</template>
