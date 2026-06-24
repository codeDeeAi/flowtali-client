<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Icon } from '@iconify/vue'
import { MemberService } from '@/services/member.service.ts'
import { useAuthStore } from '@/stores/auth.ts'
import type { IInvitation } from '@/types/member.types'
import type { ILoginData } from '@/types/auth.types'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const token = computed(() => String(route.query.token ?? ''))
const invitation = ref<IInvitation | null>(null)
const isLoading = ref(true)
const loadError = ref('')
const isAccepting = ref(false)
const acceptError = ref('')
const accepted = ref(false)

const isLoggedIn = computed(() => authStore.isLoggedIn)

const loadInvitation = async () => {
  if (!token.value) {
    loadError.value = 'Invalid invitation link. No token found.'
    isLoading.value = false
    return
  }

  isLoading.value = true
  loadError.value = ''
  try {
    const res = await MemberService.getInvitation(token.value)
    invitation.value = res.data.data
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string } } }
    loadError.value = err?.response?.data?.message ?? 'Failed to load invitation. The link may be invalid or expired.'
  } finally {
    isLoading.value = false
  }
}

const handleAccept = async () => {
  if (!token.value) return
  isAccepting.value = true
  acceptError.value = ''
  try {
    const res = await MemberService.acceptInvitation(token.value)
    const loginData: ILoginData = res.data.data
    authStore.setAuthData(loginData)
    accepted.value = true
    setTimeout(() => {
      router.push({ name: 'dashboard' })
    }, 1500)
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string } } }
    acceptError.value = err?.response?.data?.message ?? 'Failed to accept invitation. Please try again.'
  } finally {
    isAccepting.value = false
  }
}

const goToSignIn = () => {
  const redirect = `/invitations/accept?token=${token.value}`
  router.push({ name: 'signin', query: { redirect } })
}

const goToSignUp = () => {
  router.push({ name: 'signup', query: { invitation_token: token.value } })
}

onMounted(() => {
  loadInvitation()
})
</script>

<template>
  <div class="min-h-screen grid-texture flex flex-col items-center justify-center px-4 py-16 pt-24">
    <div class="auth-card w-full max-w-md p-8 relative text-center">

      <!-- Loading -->
      <div v-if="isLoading" class="py-8">
        <Icon icon="lucide:loader-2" class="w-10 h-10 text-green-700 mx-auto mb-4 animate-spin" />
        <p class="text-gray-700">Loading invitation…</p>
      </div>

      <!-- Load Error -->
      <div v-else-if="loadError" class="py-4">
        <div class="w-16 h-16 rounded-full bg-red-900/30 border border-red-700/50 flex items-center justify-center mx-auto mb-5">
          <Icon icon="lucide:mail-x" class="w-7 h-7 text-red-400" />
        </div>
        <h2 class="font-sans text-2xl font-semibold text-gray-1000 mb-2">Invalid Invitation</h2>
        <p class="text-gray-900 text-sm mb-6">{{ loadError }}</p>
        <router-link :to="{ name: isLoggedIn ? 'dashboard' : 'signin' }" class="btn-primary text-sm px-6 py-2.5 inline-block">
          {{ isLoggedIn ? 'Go to Dashboard' : 'Sign in' }}
        </router-link>
      </div>

      <!-- Accepted -->
      <div v-else-if="accepted" class="py-4">
        <div class="w-16 h-16 rounded-full bg-green-900/30 border border-green-700/50 flex items-center justify-center mx-auto mb-5">
          <Icon icon="lucide:check-circle" class="w-8 h-8 text-green-400" />
        </div>
        <h2 class="font-sans text-2xl font-semibold text-gray-1000 mb-2">Invitation Accepted!</h2>
        <p class="text-gray-900 text-sm">You've joined <strong class="text-gray-1000">{{ invitation?.organization?.name }}</strong>. Redirecting to dashboard…</p>
      </div>

      <!-- Invitation details -->
      <div v-else-if="invitation" class="py-2">
        <!-- Org logo / avatar -->
        <div class="w-16 h-16 rounded-full bg-green-100 border border-green-400 flex items-center justify-center mx-auto mb-5">
          <img v-if="invitation.organization?.logo" :src="invitation.organization.logo" :alt="invitation.organization?.name" class="w-16 h-16 rounded-full object-cover" />
          <Icon v-else icon="lucide:building-2" class="w-8 h-8 text-green-700" />
        </div>

        <h2 class="font-sans text-2xl font-semibold text-gray-1000 mb-2">You're invited!</h2>

        <p class="text-gray-900 text-sm mb-1">
          <span class="text-gray-1000 font-medium">{{ invitation.invited_by?.name ?? 'Someone' }}</span>
          has invited you to join
        </p>
        <p class="text-green-700 font-semibold text-lg mb-2">{{ invitation.organization?.name }}</p>

        <p v-if="invitation.role_ids.length" class="text-xs text-gray-700 mb-6">
          {{ invitation.role_ids.length }} role{{ invitation.role_ids.length !== 1 ? 's' : '' }} assigned
        </p>
        <p v-else class="text-xs text-gray-700 mb-6">No roles pre-assigned</p>

        <!-- Accept error -->
        <div v-if="acceptError" class="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm text-left">
          {{ acceptError }}
        </div>

        <!-- Logged in: accept button -->
        <div v-if="isLoggedIn" class="space-y-3">
          <button
            @click="handleAccept"
            :disabled="isAccepting"
            class="w-full flex items-center justify-center gap-2 py-3 rounded-lg font-semibold text-sm bg-green-700 hover:bg-green-800 text-bg-100 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <Icon v-if="isAccepting" icon="lucide:loader-2" class="w-4 h-4 animate-spin" />
            {{ isAccepting ? 'Accepting…' : 'Accept Invitation' }}
          </button>
          <p class="text-xs text-gray-700">
            Accepting as <span class="text-gray-1000">{{ authStore.user?.first_name }} {{ authStore.user?.last_name }}</span>
          </p>
        </div>

        <!-- Not logged in: sign in / create account -->
        <div v-else class="space-y-3">
          <button
            @click="goToSignIn"
            class="w-full py-3 rounded-lg font-semibold text-sm bg-green-700 hover:bg-green-800 text-bg-100 transition-colors"
          >
            Sign in to accept
          </button>
          <button
            @click="goToSignUp"
            class="w-full py-3 rounded-lg font-semibold text-sm bg-gray-400 hover:bg-gray-500 text-gray-1000 transition-colors"
          >
            Create account &amp; join
          </button>
          <p class="text-xs text-gray-700">
            The invitation was sent to <span class="text-gray-1000">{{ invitation.email }}</span>
          </p>
        </div>
      </div>

    </div>
  </div>
</template>
