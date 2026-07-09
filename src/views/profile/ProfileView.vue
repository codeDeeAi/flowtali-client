<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Icon } from '@iconify/vue'
import { useAuthStore } from '@/stores/auth'
import { ProfileService, type IUserProfile, type ISession } from '@/services/profile.service'
import { SettingsService } from '@/services/settings.service'
import { useNotification } from '@/composables/notification'

const router      = useRouter()
const { t, locale } = useI18n()
const authStore   = useAuthStore()
const { notify }  = useNotification()

const liveOrgRequiresMfa = ref(authStore.getCurrentOrganization?.require_mfa === true)
const orgRequiresMfa     = computed(() => liveOrgRequiresMfa.value)

// ── state ──────────────────────────────────────────────────────────────────────
const profile     = ref<IUserProfile | null>(null)
const sessions    = ref<ISession[]>([])
const isLoading   = ref(true)

const profileForm = ref({ first_name: '', last_name: '', phone: '', job_title: '' })
const isSavingProfile = ref(false)

const pwForm = ref({ current_password: '', password: '', password_confirmation: '' })
const isSavingPw   = ref(false)
const showCurrentPw = ref(false)
const showNewPw     = ref(false)
const showConfirmPw = ref(false)

const isUploadingAvatar  = ref(false)
const avatarInput        = ref<HTMLInputElement | null>(null)
const isLoadingSessions  = ref(false)
const isRevokingAll      = ref(false)
const revokingId         = ref<number | null>(null)

// ── Account deletion state ─────────────────────────────────────────────────────
const deleteStep            = ref<'idle' | 'confirm' | 'otp'>('idle')
const deleteOtp             = ref('')
const isDeleteInitiating    = ref(false)
const isDeleteConfirming    = ref(false)

// ── MFA state ──────────────────────────────────────────────────────────────────
const mfaStep           = ref<'idle' | 'otp'>('idle')
const mfaOtp            = ref('')
const isMfaInitiating   = ref(false)
const isMfaSubmitting   = ref(false)
const isMfaDisabling    = ref(false)

// ── computed ───────────────────────────────────────────────────────────────────
const initials = computed(() => {
  if (!profile.value) return '?'
  return `${profile.value.first_name[0] ?? ''}${profile.value.last_name[0] ?? ''}`.toUpperCase()
})

const activeSessions = computed(() => sessions.value.filter(s => {
  if (!s.expires_at) return true
  return new Date(s.expires_at) > new Date()
}))

// ── load ───────────────────────────────────────────────────────────────────────
async function load() {
  isLoading.value = true
  const orgId = authStore.getCurrentOrganization?.id
  try {
    const [profileRes, sessionsRes] = await Promise.all([
      ProfileService.get(),
      ProfileService.listSessions(),
    ])
    profile.value = profileRes.data.data
    sessions.value = sessionsRes.data.data
    profileForm.value = {
      first_name: profile.value.first_name,
      last_name:  profile.value.last_name,
      phone:      profile.value.phone?.[0]?.number ?? '',
      job_title:  profile.value.job_title ?? '',
    }
  } catch {
    notify(t('profile.toasts.loadFailed'), 'error')
  } finally {
    isLoading.value = false
  }

  if (orgId) {
    try {
      const settingsRes = await SettingsService.getOrgSettings(orgId)
      liveOrgRequiresMfa.value = settingsRes.data.data.require_mfa === true
    } catch {}
  }
}

onMounted(load)

// ── avatar ─────────────────────────────────────────────────────────────────────
function triggerAvatarUpload() { avatarInput.value?.click() }

async function handleAvatarChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  isUploadingAvatar.value = true
  try {
    const res = await ProfileService.uploadAvatar(file)
    profile.value = res.data.data
    authStore.updateUserInfo({ avatar: res.data.data.avatar })
    notify(t('profile.toasts.avatarUpdated'), 'success')
  } catch {
    notify(t('profile.toasts.avatarFailed'), 'error')
  } finally {
    isUploadingAvatar.value = false
    if (avatarInput.value) avatarInput.value.value = ''
  }
}

// ── profile update ─────────────────────────────────────────────────────────────
async function saveProfile() {
  isSavingProfile.value = true
  try {
    const phone = profileForm.value.phone.trim()
    const res = await ProfileService.update({
      first_name: profileForm.value.first_name,
      last_name:  profileForm.value.last_name,
      job_title:  profileForm.value.job_title || undefined,
      phone:      phone ? [{ number: phone }] : undefined,
    })
    profile.value = res.data.data
    authStore.updateUserInfo?.({
      first_name: profile.value.first_name,
      last_name:  profile.value.last_name,
    })
    notify(t('profile.toasts.profileSaved'), 'success')
  } catch {
    notify(t('profile.toasts.profileFailed'), 'error')
  } finally {
    isSavingProfile.value = false
  }
}

// ── password ───────────────────────────────────────────────────────────────────
async function changePassword() {
  if (pwForm.value.password !== pwForm.value.password_confirmation) {
    notify(t('profile.toasts.pwMismatch'), 'error')
    return
  }
  isSavingPw.value = true
  try {
    await ProfileService.changePassword(
      pwForm.value.current_password,
      pwForm.value.password,
      pwForm.value.password_confirmation,
    )
    pwForm.value = { current_password: '', password: '', password_confirmation: '' }
    notify(t('profile.toasts.pwChanged'), 'success')
  } catch (err: any) {
    const msg = err?.response?.data?.message ?? t('profile.toasts.pwFailed')
    notify(msg, 'error')
  } finally {
    isSavingPw.value = false
  }
}

// ── sessions ───────────────────────────────────────────────────────────────────
async function revokeSession(id: number) {
  revokingId.value = id
  try {
    await ProfileService.revokeSession(id)
    sessions.value = sessions.value.filter(s => s.id !== id)
    notify(t('profile.toasts.sessionRevoked'), 'success')
  } catch {
    notify(t('profile.toasts.sessionRevokeFailed'), 'error')
  } finally {
    revokingId.value = null
  }
}

async function revokeAll() {
  isRevokingAll.value = true
  try {
    const res = await ProfileService.revokeAllSessions()
    const { revoked } = res.data.data
    sessions.value = sessions.value.filter(s => s.is_current)
    notify(t('profile.toasts.signedOutOthers', { count: revoked }), 'success')
  } catch {
    notify(t('profile.toasts.signOutFailed'), 'error')
  } finally {
    isRevokingAll.value = false
  }
}

// ── MFA handlers ──────────────────────────────────────────────────────────────
async function initiateMfa() {
  isMfaInitiating.value = true
  try {
    await ProfileService.initiateMfa()
    mfaStep.value = 'otp'
    mfaOtp.value = ''
    notify(t('profile.toasts.mfaCodeSent'), 'success')
  } catch (err: any) {
    notify(err?.response?.data?.message ?? t('profile.toasts.mfaSendFailed'), 'error')
  } finally {
    isMfaInitiating.value = false
  }
}

async function confirmEnableMfa() {
  if (mfaOtp.value.length !== 6) return
  isMfaSubmitting.value = true
  try {
    const res = await ProfileService.enableMfa(mfaOtp.value)
    profile.value = res.data.data
    authStore.updateMfaEnabled(true)
    mfaStep.value = 'idle'
    mfaOtp.value = ''
    notify(t('profile.toasts.mfaEnabled'), 'success')
  } catch (err: any) {
    notify(err?.response?.data?.message ?? t('profile.toasts.mfaInvalidCode'), 'error')
  } finally {
    isMfaSubmitting.value = false
  }
}

async function disableMfa() {
  isMfaDisabling.value = true
  try {
    const res = await ProfileService.disableMfa()
    profile.value = res.data.data
    authStore.updateMfaEnabled(false)
    notify(t('profile.toasts.mfaDisabled'), 'success')
  } catch (err: any) {
    notify(err?.response?.data?.message ?? t('profile.toasts.mfaDisableFailed'), 'error')
  } finally {
    isMfaDisabling.value = false
  }
}

// ── Account deletion handlers ─────────────────────────────────────────────────
function openDeleteModal() {
  deleteStep.value = 'confirm'
  deleteOtp.value = ''
}

function closeDeleteModal() {
  deleteStep.value = 'idle'
  deleteOtp.value = ''
}

async function sendDeletionOtp() {
  isDeleteInitiating.value = true
  try {
    await ProfileService.initiateAccountDeletion()
    deleteStep.value = 'otp'
    deleteOtp.value = ''
    notify(t('profile.toasts.delCodeSent'), 'success')
  } catch (err: any) {
    notify(err?.response?.data?.message ?? t('profile.toasts.delSendFailed'), 'error')
  } finally {
    isDeleteInitiating.value = false
  }
}

async function confirmDeletion() {
  if (deleteOtp.value.length !== 6) return
  isDeleteConfirming.value = true
  try {
    await ProfileService.confirmAccountDeletion(deleteOtp.value)
    authStore.logout()
    router.push({ name: 'signin' })
  } catch (err: any) {
    notify(err?.response?.data?.message ?? t('profile.toasts.delFailed'), 'error')
  } finally {
    isDeleteConfirming.value = false
  }
}

// ── helpers ────────────────────────────────────────────────────────────────────
function fmtDate(iso: string | null): string {
  if (!iso) return t('profile.relative.never')
  return new Date(iso).toLocaleDateString(locale.value, { month: 'short', day: 'numeric', year: 'numeric' })
}

function fmtRelative(iso: string | null): string {
  if (!iso) return t('profile.relative.never')
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1)  return t('profile.relative.justNow')
  if (mins < 60) return t('profile.relative.minAgo', { n: mins })
  const hrs = Math.floor(mins / 60)
  if (hrs  < 24) return t('profile.relative.hourAgo', { n: hrs })
  const days = Math.floor(hrs / 24)
  return t('profile.relative.dayAgo', { n: days })
}
</script>

<template>
  <div class="p-4 md:p-6 space-y-5 min-h-full">

    <!-- Header -->
    <div>
      <h1 class="page-title">{{ t('profile.title') }}</h1>
      <p class="page-subtitle">{{ t('profile.subtitle') }}</p>
    </div>

    <!-- Loading skeleton -->
    <div v-if="isLoading" class="flex items-center justify-center h-48">
      <Icon icon="lucide:loader-2" class="w-6 h-6 text-gray-700 animate-spin" />
    </div>

    <template v-else>
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">

        <!-- ── Profile card ──────────────────────────────────────────────── -->
        <div class="bg-gray-200 border border-gray-400 rounded-xl p-5">
          <!-- Avatar row -->
          <div class="flex items-center gap-4 mb-6">
            <div class="relative shrink-0">
              <div v-if="profile?.avatar"
                class="w-16 h-16 rounded-full overflow-hidden">
                <img :src="profile.avatar" alt="avatar" class="w-full h-full object-cover" />
              </div>
              <div v-else
                class="w-16 h-16 rounded-full bg-green-700 flex items-center justify-center text-xl font-bold text-bg-100">
                {{ initials }}
              </div>
              <div v-if="isUploadingAvatar"
                class="absolute inset-0 rounded-full bg-black/60 flex items-center justify-center">
                <Icon icon="lucide:loader-2" class="w-4 h-4 text-white animate-spin" />
              </div>
            </div>
            <div>
              <div class="font-sans text-xl font-semibold text-gray-1000">{{ profile?.full_name }}</div>
              <div class="text-xs text-gray-700">{{ profile?.email }}</div>
              <input ref="avatarInput" type="file" accept="image/*" class="hidden" @change="handleAvatarChange" />
              <button
                @click="triggerAvatarUpload"
                class="mt-2 text-xs text-gray-900 hover:text-gray-1000 bg-gray-400 hover:bg-gray-500 px-2.5 py-1 rounded-md transition-colors"
              >
                {{ t('profile.changePhoto') }}
              </button>
            </div>
          </div>

          <!-- Form -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
            <div>
              <label class="app-label">{{ t('profile.fields.firstName') }}</label>
              <input class="app-inp" v-model="profileForm.first_name" />
            </div>
            <div>
              <label class="app-label">{{ t('profile.fields.lastName') }}</label>
              <input class="app-inp" v-model="profileForm.last_name" />
            </div>
            <div class="sm:col-span-2">
              <label class="app-label">{{ t('profile.fields.email') }}</label>
              <input class="app-inp opacity-60 cursor-not-allowed" :value="profile?.email" disabled />
            </div>
            <div class="sm:col-span-2">
              <label class="app-label">{{ t('profile.fields.phone') }}</label>
              <input class="app-inp" v-model="profileForm.phone" :placeholder="t('profile.placeholders.phone')" />
            </div>
            <div class="sm:col-span-2">
              <label class="app-label">{{ t('profile.fields.jobTitle') }}</label>
              <input class="app-inp" v-model="profileForm.job_title" :placeholder="t('profile.placeholders.jobTitle')" />
            </div>
          </div>

          <button
            @click="saveProfile"
            :disabled="isSavingProfile"
            class="flex items-center gap-2 bg-green-700 hover:bg-green-800 disabled:opacity-60 text-bg-100 font-semibold text-sm px-4 py-2 rounded-lg transition-colors"
          >
            <Icon v-if="isSavingProfile" icon="lucide:loader-2" class="w-4 h-4 animate-spin" />
            {{ t('profile.saveChanges') }}
          </button>
        </div>

        <!-- ── Right column ──────────────────────────────────────────────── -->
        <div class="space-y-4">

          <!-- Change password -->
          <div class="bg-gray-200 border border-gray-400 rounded-xl p-5">
            <h3 class="text-sm font-semibold text-gray-1000 mb-4">{{ t('profile.password.title') }}</h3>
            <div class="space-y-3 mb-4">
              <div>
                <label class="app-label">{{ t('profile.password.current') }}</label>
                <div class="relative">
                  <input class="app-inp pr-10"
                    :type="showCurrentPw ? 'text' : 'password'"
                    v-model="pwForm.current_password"
                    placeholder="••••••••" />
                  <button type="button" class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-700 hover:text-gray-1000" @click="showCurrentPw = !showCurrentPw">
                    <Icon :icon="showCurrentPw ? 'lucide:eye-off' : 'lucide:eye'" class="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div>
                <label class="app-label">{{ t('profile.password.new') }}</label>
                <div class="relative">
                  <input class="app-inp pr-10"
                    :type="showNewPw ? 'text' : 'password'"
                    v-model="pwForm.password"
                    :placeholder="t('profile.placeholders.newPassword')" />
                  <button type="button" class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-700 hover:text-gray-1000" @click="showNewPw = !showNewPw">
                    <Icon :icon="showNewPw ? 'lucide:eye-off' : 'lucide:eye'" class="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div>
                <label class="app-label">{{ t('profile.password.confirm') }}</label>
                <div class="relative">
                  <input class="app-inp pr-10"
                    :type="showConfirmPw ? 'text' : 'password'"
                    v-model="pwForm.password_confirmation"
                    placeholder="••••••••" />
                  <button type="button" class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-700 hover:text-gray-1000" @click="showConfirmPw = !showConfirmPw">
                    <Icon :icon="showConfirmPw ? 'lucide:eye-off' : 'lucide:eye'" class="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
            <button
              @click="changePassword"
              :disabled="isSavingPw || !pwForm.current_password || !pwForm.password"
              class="flex items-center gap-2 text-sm text-gray-900 hover:text-gray-1000 bg-gray-400 hover:bg-gray-500 disabled:opacity-50 px-4 py-2 rounded-lg transition-colors"
            >
              <Icon v-if="isSavingPw" icon="lucide:loader-2" class="w-4 h-4 animate-spin" />
              {{ t('profile.password.update') }}
            </button>
          </div>

          <!-- Two-Factor Authentication -->
          <div class="bg-gray-200 border border-gray-400 rounded-xl p-5">
            <div class="flex items-start justify-between mb-1">
              <h3 class="text-sm font-semibold text-gray-1000">{{ t('profile.mfa.title') }}</h3>
              <span
                :class="[
                  'text-[10px] font-semibold px-2 py-0.5 rounded-full',
                  profile?.mfa_enabled
                    ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                    : 'bg-gray-500 text-gray-900 border border-gray-500',
                ]"
              >
                {{ profile?.mfa_enabled ? t('profile.mfa.enabled') : t('profile.mfa.disabled') }}
              </span>
            </div>
            <p class="text-xs text-gray-700 mb-4">
              {{ t('profile.mfa.desc') }}
            </p>

            <!-- OTP confirmation step -->
            <div v-if="mfaStep === 'otp'" class="space-y-3">
              <p class="text-xs text-gray-900">{{ t('profile.mfa.enterCode') }}</p>
              <input
                v-model="mfaOtp"
                class="app-inp tracking-widest font-mono text-center"
                :placeholder="t('profile.placeholders.otp')"
                maxlength="6"
                autocomplete="one-time-code"
                @keyup.enter="confirmEnableMfa"
              />
              <div class="flex gap-2">
                <button
                  @click="confirmEnableMfa"
                  :disabled="mfaOtp.length !== 6 || isMfaSubmitting"
                  class="flex items-center gap-2 bg-green-700 hover:bg-green-800 disabled:opacity-60 text-bg-100 font-semibold text-xs px-4 py-2 rounded-lg transition-colors"
                >
                  <Icon v-if="isMfaSubmitting" icon="lucide:loader-2" class="w-3.5 h-3.5 animate-spin" />
                  {{ t('profile.mfa.verifyEnable') }}
                </button>
                <button
                  @click="mfaStep = 'idle'"
                  class="text-xs text-gray-900 hover:text-gray-1000 bg-gray-400 hover:bg-gray-500 px-4 py-2 rounded-lg transition-colors"
                >
                  {{ t('profile.mfa.cancel') }}
                </button>
              </div>
            </div>

            <!-- Enable button -->
            <button
              v-else-if="!profile?.mfa_enabled"
              @click="initiateMfa"
              :disabled="isMfaInitiating"
              class="flex items-center gap-2 text-sm text-gray-900 hover:text-gray-1000 bg-gray-400 hover:bg-gray-500 disabled:opacity-50 px-4 py-2 rounded-lg transition-colors"
            >
              <Icon v-if="isMfaInitiating" icon="lucide:loader-2" class="w-4 h-4 animate-spin" />
              <Icon v-else icon="lucide:shield-check" class="w-4 h-4" />
              {{ t('profile.mfa.enable') }}
            </button>

            <!-- Disable button (locked when org enforces MFA) -->
            <div v-else class="flex flex-col gap-2">
              <button
                @click="disableMfa"
                :disabled="isMfaDisabling || orgRequiresMfa"
                class="flex items-center gap-2 text-xs text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/15 border border-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 rounded-lg transition-colors"
              >
                <Icon v-if="isMfaDisabling" icon="lucide:loader-2" class="w-3.5 h-3.5 animate-spin" />
                <Icon v-else icon="lucide:shield-off" class="w-3.5 h-3.5" />
                {{ t('profile.mfa.disable') }}
              </button>
              <p v-if="orgRequiresMfa" class="text-[11px] text-green-700/70 flex items-center gap-1.5">
                <Icon icon="lucide:info" class="w-3 h-3 shrink-0" />
                {{ t('profile.mfa.requiredByOrg') }}
              </p>
            </div>
          </div>

          <!-- Active sessions -->
          <div class="bg-gray-200 border border-gray-400 rounded-xl p-5">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-sm font-semibold text-gray-1000">{{ t('profile.sessions.title') }}</h3>
              <span class="text-xs text-gray-700">{{ t('profile.sessions.activeCount', { count: activeSessions.length }) }}</span>
            </div>

            <div v-if="activeSessions.length === 0" class="text-xs text-gray-700 py-2">
              {{ t('profile.sessions.none') }}
            </div>

            <div v-else class="space-y-2 mb-4">
              <div
                v-for="session in activeSessions"
                :key="session.id"
                class="flex items-center justify-between py-2.5 px-3 rounded-lg bg-gray-400/50"
              >
                <div class="flex items-center gap-2.5">
                  <div class="w-7 h-7 rounded-full bg-gray-500 flex items-center justify-center shrink-0">
                    <Icon icon="lucide:monitor" class="w-3.5 h-3.5 text-gray-900" />
                  </div>
                  <div>
                    <div class="text-xs font-medium text-gray-1000 flex items-center gap-1.5">
                      {{ session.name }}
                      <span v-if="session.is_current"
                        class="text-[10px] font-semibold text-green-400 bg-green-500/10 border border-green-500/20 px-1.5 py-0.5 rounded-full">
                        {{ t('profile.sessions.current') }}
                      </span>
                    </div>
                    <div class="text-[11px] text-gray-700 mt-0.5">
                      {{ t('profile.sessions.lastActive', { when: fmtRelative(session.last_used_at) }) }}
                      <span v-if="session.expires_at"> · {{ t('profile.sessions.expires', { date: fmtDate(session.expires_at) }) }}</span>
                    </div>
                  </div>
                </div>
                <button
                  v-if="!session.is_current"
                  @click="revokeSession(session.id)"
                  :disabled="revokingId === session.id"
                  class="text-xs text-red-400 hover:text-red-300 disabled:opacity-50 transition-colors"
                >
                  <Icon v-if="revokingId === session.id" icon="lucide:loader-2" class="w-3.5 h-3.5 animate-spin" />
                  <span v-else>{{ t('profile.sessions.revoke') }}</span>
                </button>
              </div>
            </div>

            <button
              @click="revokeAll"
              :disabled="isRevokingAll || activeSessions.filter(s => !s.is_current).length === 0"
              class="w-full flex items-center justify-center gap-1.5 text-xs text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/15 border border-red-500/20 disabled:opacity-50 px-4 py-2 rounded-lg transition-colors"
            >
              <Icon v-if="isRevokingAll" icon="lucide:loader-2" class="w-3.5 h-3.5 animate-spin" />
              <Icon v-else icon="lucide:log-out" class="w-3.5 h-3.5" />
              {{ t('profile.sessions.signOutAll') }}
            </button>
          </div>

          <!-- Danger zone -->
          <div class="bg-gray-200 border border-red-500/15 rounded-xl p-5">
            <h3 class="text-sm font-semibold text-red-400 mb-1">{{ t('profile.danger.title') }}</h3>
            <p class="text-xs text-gray-700 mb-4">
              {{ t('profile.danger.desc') }}
            </p>
            <button
              @click="openDeleteModal"
              class="text-xs text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/15 border border-red-500/20 px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
            >
              <Icon icon="lucide:trash-2" class="w-3.5 h-3.5" />
              {{ t('profile.danger.deleteAccount') }}
            </button>
          </div>
        </div>
      </div>
    </template>

    <!-- Account deletion modal -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="deleteStep !== 'idle'"
          class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          @click.self="closeDeleteModal"
        >
          <div class="bg-gray-200 border border-gray-400 rounded-xl w-full max-w-md p-6 shadow-xl">

            <!-- Step 1: Initial confirmation -->
            <template v-if="deleteStep === 'confirm'">
              <div class="flex items-center gap-3 mb-4">
                <div class="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
                  <Icon icon="lucide:alert-triangle" class="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <h3 class="text-base font-semibold text-gray-1000">{{ t('profile.deleteModal.title') }}</h3>
                  <p class="text-xs text-gray-700">{{ t('profile.deleteModal.permanent') }}</p>
                </div>
              </div>

              <div class="bg-red-500/5 border border-red-500/15 rounded-lg p-3.5 mb-4">
                <p class="text-xs text-red-400 leading-relaxed">
                  {{ t('profile.deleteModal.removeIntro') }}
                </p>
                <ul class="text-xs text-red-400/80 mt-2 space-y-1 list-disc list-inside">
                  <li>{{ t('profile.deleteModal.removeOrgs') }}</li>
                  <li>{{ t('profile.deleteModal.removeDocs') }}</li>
                  <li>{{ t('profile.deleteModal.removeProfile') }}</li>
                </ul>
              </div>

              <p class="text-xs text-gray-700 mb-5">
                {{ t('profile.deleteModal.codeSentBefore') }}<strong class="text-gray-900">{{ profile?.email }}</strong>{{ t('profile.deleteModal.codeSentAfter') }}
              </p>

              <div class="flex gap-2 justify-end">
                <button
                  @click="closeDeleteModal"
                  class="text-xs text-gray-900 hover:text-gray-1000 bg-gray-400 hover:bg-gray-500 px-4 py-2 rounded-lg transition-colors"
                >
                  {{ t('profile.mfa.cancel') }}
                </button>
                <button
                  @click="sendDeletionOtp"
                  :disabled="isDeleteInitiating"
                  class="flex items-center gap-2 text-xs text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/15 border border-red-500/20 disabled:opacity-50 px-4 py-2 rounded-lg transition-colors"
                >
                  <Icon v-if="isDeleteInitiating" icon="lucide:loader-2" class="w-3.5 h-3.5 animate-spin" />
                  <Icon v-else icon="lucide:mail" class="w-3.5 h-3.5" />
                  {{ t('profile.deleteModal.sendCode') }}
                </button>
              </div>
            </template>

            <!-- Step 2: OTP entry -->
            <template v-if="deleteStep === 'otp'">
              <div class="flex items-center gap-3 mb-4">
                <div class="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
                  <Icon icon="lucide:shield-alert" class="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <h3 class="text-base font-semibold text-gray-1000">{{ t('profile.deleteModal.confirmTitle') }}</h3>
                  <p class="text-xs text-gray-700">{{ t('profile.deleteModal.confirmSubtitle') }}</p>
                </div>
              </div>

              <p class="text-xs text-gray-700 mb-4">
                {{ t('profile.deleteModal.enterCodeBefore') }}<strong class="text-gray-900">{{ profile?.email }}</strong>
              </p>

              <input
                v-model="deleteOtp"
                class="app-inp tracking-widest font-mono text-center mb-2"
                :placeholder="t('profile.placeholders.otp')"
                maxlength="6"
                autocomplete="one-time-code"
                @keyup.enter="confirmDeletion"
              />

              <button
                @click="sendDeletionOtp"
                :disabled="isDeleteInitiating"
                class="text-xs text-gray-700 hover:text-gray-900 mb-5 flex items-center gap-1 transition-colors"
              >
                <Icon v-if="isDeleteInitiating" icon="lucide:loader-2" class="w-3 h-3 animate-spin" />
                {{ t('profile.deleteModal.resend') }}
              </button>

              <div class="flex gap-2 justify-end">
                <button
                  @click="closeDeleteModal"
                  class="text-xs text-gray-900 hover:text-gray-1000 bg-gray-400 hover:bg-gray-500 px-4 py-2 rounded-lg transition-colors"
                >
                  {{ t('profile.mfa.cancel') }}
                </button>
                <button
                  @click="confirmDeletion"
                  :disabled="deleteOtp.length !== 6 || isDeleteConfirming"
                  class="flex items-center gap-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 px-4 py-2 rounded-lg transition-colors"
                >
                  <Icon v-if="isDeleteConfirming" icon="lucide:loader-2" class="w-3.5 h-3.5 animate-spin" />
                  <Icon v-else icon="lucide:trash-2" class="w-3.5 h-3.5" />
                  {{ t('profile.deleteModal.deleteMyAccount') }}
                </button>
              </div>
            </template>

          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>
