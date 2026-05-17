<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useLoaders } from '@/composables/loaders'
import { useFormErrors } from '@/composables/formErrors'
import { useYupForm } from '@/composables/useYupForm'
import { useNotification } from '@/composables/notification'
import { AuthService } from '@/services/auth.service'
import InputField from '@/components/form/InputField.vue'
import PasswordField from '@/components/form/PasswordField.vue'
import BasicAlert from '@/components/alerts/BasicAlert.vue'
import { object, string, ref as yupRef } from 'yup'

const route = useRoute()
const router = useRouter()
const { notify } = useNotification()
const { initLoaders, setLoader, getLoader } = useLoaders()
const { getError, setError, setErrors, clearAllErrors } = useFormErrors()
const { validate } = useYupForm()

const form = ref({
  email: '',
  token: '',
  password: '',
  password_confirmation: '',
})

const success = ref(false)

initLoaders({ isResetting: false })

const resetSchema = object({
  email: string().email('Invalid email address').required('Email is required'),
  token: string().required('Reset code is required'),
  password: string()
    .min(8, 'Password must be at least 8 characters')
    .required('New password is required'),
  password_confirmation: string()
    .oneOf([yupRef('password')], 'Passwords do not match')
    .required('Please confirm your password'),
})

const canSubmit = computed(
  () => !!form.value.email && !!form.value.token && !!form.value.password && !!form.value.password_confirmation,
)

const handleReset = async () => {
  clearAllErrors()

  const valid = await validate(resetSchema, form.value)
  if (!valid.valid) {
    setErrors(valid.errors ?? {})
    return
  }

  setLoader('isResetting', true)

  try {
    await AuthService.resetPassword(
      form.value.email,
      form.value.token,
      form.value.password,
      form.value.password_confirmation,
    )
    success.value = true
  } catch (err: any) {
    const message = err?.response?.data?.message ?? 'Password reset failed. Please try again.'
    const errors = err?.response?.data?.errors
    if (errors) {
      setErrors(errors)
    } else {
      setError('general', message)
    }
  } finally {
    setLoader('isResetting', false)
  }
}

onMounted(() => {
  if (route.query.email) form.value.email = String(route.query.email)
  if (route.query.token) form.value.token = String(route.query.token)
})
</script>

<template>
  <div class="min-h-screen grid-texture flex flex-col items-center justify-center px-4 py-16 pt-24">
    <div class="auth-card w-full max-w-md p-8 relative">

      <div v-if="!success">
        <router-link :to="{ name: 'forgot-password' }" class="flex items-center gap-2 text-cream-faint text-sm mb-7 hover:text-cream">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Back
        </router-link>

        <h1 class="font-display text-3xl font-semibold text-cream mb-1">Set new password</h1>
        <p class="text-cream-faint text-sm mb-7">Enter the code from your email and choose a new password.</p>

        <BasicAlert type="danger" class="mb-4" v-if="getError('general').value">
          <span>{{ getError('general').value }}</span>
        </BasicAlert>

        <div class="flex flex-col gap-4">
          <InputField
            v-model="form.email"
            label-text="Email address"
            type="email"
            :error="getError('email').value || ''"
            input-classes="px-2 py-2 text-sm transition-colors"
            autocomplete="email"
            placeholder=""
          />

          <InputField
            v-model="form.token"
            label-text="Reset code"
            type="text"
            :error="getError('token').value || ''"
            input-classes="px-2 py-2 text-sm transition-colors tracking-widest font-mono text-center"
            autocomplete="off"
            placeholder="A1B2C3"
            maxlength="6"
          />

          <PasswordField
            v-model="form.password"
            label-text="New password"
            :error="getError('password').value || ''"
            input-classes="px-2 py-2 text-sm transition-colors"
            placeholder="Min. 8 characters"
            :use-strength-indicator="true"
          />

          <PasswordField
            v-model="form.password_confirmation"
            label-text="Confirm new password"
            :error="getError('password_confirmation').value || ''"
            input-classes="px-2 py-2 text-sm transition-colors"
            placeholder="Repeat your new password"
          />

          <button
            class="btn-primary w-full py-3.5 text-sm mt-1"
            :disabled="!canSubmit || getLoader('isResetting')"
            @click="handleReset"
          >
            <span v-if="!getLoader('isResetting')">Reset password</span>
            <span v-else class="flex items-center justify-center gap-2">
              <svg class="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4" />
              </svg>
              Resetting…
            </span>
          </button>
        </div>
      </div>

      <div v-else class="text-center py-4">
        <div class="w-16 h-16 rounded-full bg-green-900/30 border border-green-700/50 flex items-center justify-center mx-auto mb-5">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#4ade80" stroke-width="2.5">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h2 class="font-display text-2xl font-semibold text-cream mb-2">Password reset!</h2>
        <p class="text-cream-muted text-sm mb-6">Your password has been reset. You can now sign in with your new password.</p>
        <router-link :to="{ name: 'signin' }" class="btn-primary text-sm px-6 py-2.5 inline-block">
          Sign in
        </router-link>
      </div>
    </div>
  </div>
</template>
