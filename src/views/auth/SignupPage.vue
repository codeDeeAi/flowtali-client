<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useLoaders } from '@/composables/loaders.ts'
import { signupSchema } from './validation/schema.ts'
import { useFormErrors } from '@/composables/formErrors'
import { useSeo } from '@/composables/useSeo'
import FlowtaliLogo from '@/components/ui/FlowtaliLogo.vue'

useSeo({
  title: 'Create Account',
  description: 'Get started with Flowtali for free. Create professional invoices and letterheads in minutes — no credit card required.',
  canonical: 'https://flowtali.com/auth/signup',
})
import { useYupForm } from '@/composables/useYupForm.ts'
import InputField from '@/components/form/InputField.vue'
import PasswordField from '@/components/form/PasswordField.vue'
import BasicAlert from '@/components/alerts/BasicAlert.vue'
import { useNotification } from '@/composables/notification.ts'
import { AuthService } from '@/services/auth.service'

const signupForm = ref({
  first_name: '',
  last_name: '',
  email: '',
  password: '',
  agreed: false,
})

const { setErrors, clearAllErrors, getError, setError } = useFormErrors()
const { initLoaders, setLoader, getLoader } = useLoaders()
const { notify } = useNotification()
const { validate } = useYupForm()
const router = useRouter()
const route = useRoute()

const invitationToken = computed(() => route.query.invitation_token as string | undefined)

initLoaders({ isRegistering: false, isGoogleLoading: false })

const canSubmit = computed(
  () =>
    !!signupForm.value.first_name &&
    !!signupForm.value.last_name &&
    !!signupForm.value.email &&
    !!signupForm.value.password &&
    signupForm.value.agreed,
)

const handleSignup = async () => {
  clearAllErrors()

  const valid = await validate(signupSchema, {
    ...signupForm.value,
    agreed: signupForm.value.agreed ? 'true' : '',
  })
  if (!valid.valid) {
    setErrors(valid.errors ?? {})
    return
  }

  setLoader('isRegistering', true)

  try {
    await AuthService.register({
      first_name: signupForm.value.first_name,
      last_name: signupForm.value.last_name,
      email: signupForm.value.email,
      password: signupForm.value.password,
      terms_and_privacy_consent_given: true,
      ...(invitationToken.value ? { invitation_token: invitationToken.value } : {}),
    })

    notify('Account created! Please check your email to verify your account.', 'success')
    router.push({ name: 'signin' })
  } catch (err: any) {
    const message = err?.response?.data?.message ?? 'Registration failed. Please try again.'
    const errors = err?.response?.data?.errors
    if (errors) {
      setErrors(errors)
    }

    notify(message, 'error')

    setError('general', message)
  } finally {
    setLoader('isRegistering', false)
  }
}

const handleGoogleSignup = async () => {
  setLoader('isGoogleLoading', true)
  try {
    const res = await AuthService.getGoogleRedirectUrl()
    window.location.href = res.data.data.redirect_url
  } catch {
    notify('Could not initiate Google sign-up. Please try again.', 'error')
    setLoader('isGoogleLoading', false)
  }
}
</script>

<template>
  <div class="min-h-screen grid-texture flex flex-col items-center justify-center px-4 py-16 pt-24">
    <div
      class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full pointer-events-none"
      style="background:radial-gradient(circle,rgba(0,200,83,0.07) 0%,transparent 70%)" />
    <div class="auth-card w-full max-w-md p-8 relative">
      <router-link :to="{ name: 'home' }"
        class="flex items-center gap-2 text-gray-700 text-sm mb-7 hover:text-gray-1000 transition-colors">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        Back to Flowtali
      </router-link>

      <div class="mb-2">
        <FlowtaliLogo variant="full" :size="22" />
      </div>

      <h1 class="font-sans text-3xl font-semibold text-gray-1000 mt-5 mb-1">Create your account</h1>
      <p class="text-gray-700 text-sm mb-7">Free for 14 days — no credit card needed.</p>

      <button
        class="w-full flex items-center justify-center gap-3 bg-gray-400/60 border border-gray-500/80 hover:border-gray-500 rounded-lg py-3 text-gray-1000 text-sm font-medium transition-all mb-4 disabled:opacity-60"
        :disabled="getLoader('isGoogleLoading')" @click="handleGoogleSignup">
        <svg v-if="!getLoader('isGoogleLoading')" width="18" height="18" viewBox="0 0 24 24">
          <path
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            fill="#4285F4" />
          <path
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            fill="#34A853" />
          <path
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            fill="#FBBC05" />
          <path
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            fill="#EA4335" />
        </svg>
        <svg v-else class="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4" />
        </svg>
        Continue with Google
      </button>

      <div class="flex items-center gap-3 mb-4">
        <div class="flex-1 h-px bg-gray-400/60" />
        <span class="text-gray-700 text-xs">or sign up with email</span>
        <div class="flex-1 h-px bg-gray-400/60" />
      </div>

      <BasicAlert type="danger" class="mb-4" v-if="getError('general').value">
        <span>{{ getError('general').value }}</span>
      </BasicAlert>

      <div class="flex flex-col gap-4">
        <div class="grid grid-cols-2 gap-3">
          <InputField v-model="signupForm.first_name" label-text="First Name" type="text" :is-required="true"
            :error="getError('first_name').value || ''" input-classes="px-2 py-2 text-sm transition-colors"
            autocapitalize="none" autocomplete="given-name" placeholder="" />
          <InputField v-model="signupForm.last_name" label-text="Last Name" type="text" :is-required="true"
            :error="getError('last_name').value || ''" input-classes="px-2 py-2 text-sm transition-colors"
            autocapitalize="none" autocomplete="family-name" placeholder="" />
        </div>

        <InputField v-model="signupForm.email" label-text="Email address" type="email" :is-required="true"
          :error="getError('email').value || ''" input-classes="px-2 py-2 text-sm transition-colors"
          autocapitalize="none" autocomplete="email" placeholder="" />

        <PasswordField v-model="signupForm.password" label-text="Password" :is-required="true"
          :error="getError('password').value || ''" input-classes="px-2 py-2 text-sm transition-colors"
          placeholder="Min. 8 characters" :use-strength-indicator="true" />

        <label class="flex items-start gap-3 cursor-pointer">
          <div class="relative mt-0.5">
            <input type="checkbox" v-model="signupForm.agreed" class="sr-only" />
            <div class="w-4 h-4 rounded border transition-colors"
              :class="signupForm.agreed ? 'bg-green-700 border-green-700' : 'border-gray-500 bg-gray-400'">
              <svg v-if="signupForm.agreed" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#000000"
                stroke-width="3" class="absolute top-0.5 left-0.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
          </div>
          <span class="text-gray-700 text-sm">
            I agree to Flowtali's
            <router-link :to="{ name: 'terms' }" target="_blank" class="text-green-700 hover:underline">Terms</router-link>
            and
            <router-link :to="{ name: 'privacy' }" target="_blank" class="text-green-700 hover:underline">Privacy Policy</router-link>
          </span>
        </label>
        <p v-if="getError('agreed').value" class="text-red-400 text-xs -mt-2">{{ getError('agreed').value }}</p>

        <button class="btn-primary w-full py-3.5 text-sm mt-1"
          :class="!canSubmit ? 'opacity-50 cursor-not-allowed' : ''"
          :disabled="!canSubmit || getLoader('isRegistering')" @click="handleSignup">
          <span v-if="!getLoader('isRegistering')">Create account</span>
          <span v-else class="flex items-center justify-center gap-2">
            <svg class="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4" />
            </svg>
            Creating account…
          </span>
        </button>
      </div>
    </div>

    <p class="text-center text-gray-700 text-sm mt-6">
      Already have an account?
      <router-link :to="{ name: 'signin' }" class="text-green-700 hover:underline">Sign in</router-link>
    </p>
  </div>
</template>
