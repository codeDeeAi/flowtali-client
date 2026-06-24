<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Icon } from '@iconify/vue'
import { useAuthStore } from '@/stores/auth'
import { ProfileService, type IUserProfile, type ISession } from '@/services/profile.service'
import { SettingsService } from '@/services/settings.service'
import { useNotification } from '@/composables/notification'

const router      = useRouter()
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
    notify('Failed to load profile', 'error')
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
    notify('Avatar updated', 'success')
  } catch {
    notify('Failed to upload avatar', 'error')
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
    notify('Profile saved', 'success')
  } catch {
    notify('Failed to save profile', 'error')
  } finally {
    isSavingProfile.value = false
  }
}

// ── password ───────────────────────────────────────────────────────────────────
async function changePassword() {
  if (pwForm.value.password !== pwForm.value.password_confirmation) {
    notify('Passwords do not match', 'error')
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
    notify('Password changed successfully', 'success')
  } catch (err: any) {
    const msg = err?.response?.data?.message ?? 'Failed to change password'
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
    notify('Session revoked', 'success')
  } catch {
    notify('Failed to revoke session', 'error')
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
    notify(`Signed out of ${revoked} other session(s)`, 'success')
  } catch {
    notify('Failed to sign out sessions', 'error')
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
    notify('Verification code sent to your email', 'success')
  } catch (err: any) {
    notify(err?.response?.data?.message ?? 'Failed to send code', 'error')
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
    notify('Two-factor authentication enabled', 'success')
  } catch (err: any) {
    notify(err?.response?.data?.message ?? 'Invalid code', 'error')
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
    notify('Two-factor authentication disabled', 'success')
  } catch (err: any) {
    notify(err?.response?.data?.message ?? 'Failed to disable 2FA', 'error')
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
    notify('Verification code sent to your email', 'success')
  } catch (err: any) {
    notify(err?.response?.data?.message ?? 'Failed to send verification code', 'error')
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
    notify(err?.response?.data?.message ?? 'Failed to delete account', 'error')
  } finally {
    isDeleteConfirming.value = false
  }
}

// ── helpers ────────────────────────────────────────────────────────────────────
function fmtDate(iso: string | null): string {
  if (!iso) return 'Never'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function fmtRelative(iso: string | null): string {
  if (!iso) return 'Never'
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1)  return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs  < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}
</script>

<template>
  <div class="p-4 md:p-6 space-y-5 min-h-full">

    <!-- Header -->
    <div>
      <h1 class="page-title">My Profile</h1>
      <p class="page-subtitle">Manage your personal account settings</p>
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
                Change Photo
              </button>
            </div>
          </div>

          <!-- Form -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
            <div>
              <label class="app-label">First Name</label>
              <input class="app-inp" v-model="profileForm.first_name" />
            </div>
            <div>
              <label class="app-label">Last Name</label>
              <input class="app-inp" v-model="profileForm.last_name" />
            </div>
            <div class="sm:col-span-2">
              <label class="app-label">Email Address</label>
              <input class="app-inp opacity-60 cursor-not-allowed" :value="profile?.email" disabled />
            </div>
            <div class="sm:col-span-2">
              <label class="app-label">Phone Number</label>
              <input class="app-inp" v-model="profileForm.phone" placeholder="+1 415 555 0199" />
            </div>
            <div class="sm:col-span-2">
              <label class="app-label">Job Title</label>
              <input class="app-inp" v-model="profileForm.job_title" placeholder="Creative Director" />
            </div>
          </div>

          <button
            @click="saveProfile"
            :disabled="isSavingProfile"
            class="flex items-center gap-2 bg-green-700 hover:bg-green-800 disabled:opacity-60 text-bg-100 font-semibold text-sm px-4 py-2 rounded-lg transition-colors"
          >
            <Icon v-if="isSavingProfile" icon="lucide:loader-2" class="w-4 h-4 animate-spin" />
            Save Changes
          </button>
        </div>

        <!-- ── Right column ──────────────────────────────────────────────── -->
        <div class="space-y-4">

          <!-- Change password -->
          <div class="bg-gray-200 border border-gray-400 rounded-xl p-5">
            <h3 class="text-sm font-semibold text-gray-1000 mb-4">Change Password</h3>
            <div class="space-y-3 mb-4">
              <div>
                <label class="app-label">Current Password</label>
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
                <label class="app-label">New Password</label>
                <div class="relative">
                  <input class="app-inp pr-10"
                    :type="showNewPw ? 'text' : 'password'"
                    v-model="pwForm.password"
                    placeholder="Min. 8 characters" />
                  <button type="button" class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-700 hover:text-gray-1000" @click="showNewPw = !showNewPw">
                    <Icon :icon="showNewPw ? 'lucide:eye-off' : 'lucide:eye'" class="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div>
                <label class="app-label">Confirm New Password</label>
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
              Update Password
            </button>
          </div>

          <!-- Two-Factor Authentication -->
          <div class="bg-gray-200 border border-gray-400 rounded-xl p-5">
            <div class="flex items-start justify-between mb-1">
              <h3 class="text-sm font-semibold text-gray-1000">Two-Factor Authentication</h3>
              <span
                :class="[
                  'text-[10px] font-semibold px-2 py-0.5 rounded-full',
                  profile?.mfa_enabled
                    ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                    : 'bg-gray-500 text-gray-900 border border-gray-500',
                ]"
              >
                {{ profile?.mfa_enabled ? 'Enabled' : 'Disabled' }}
              </span>
            </div>
            <p class="text-xs text-gray-700 mb-4">
              Add an extra layer of security — a one-time code is emailed on every login.
            </p>

            <!-- OTP confirmation step -->
            <div v-if="mfaStep === 'otp'" class="space-y-3">
              <p class="text-xs text-gray-900">Enter the 6-character code sent to your email:</p>
              <input
                v-model="mfaOtp"
                class="app-inp tracking-widest font-mono text-center"
                placeholder="A1B2C3"
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
                  Verify & Enable
                </button>
                <button
                  @click="mfaStep = 'idle'"
                  class="text-xs text-gray-900 hover:text-gray-1000 bg-gray-400 hover:bg-gray-500 px-4 py-2 rounded-lg transition-colors"
                >
                  Cancel
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
              Enable 2FA
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
                Disable 2FA
              </button>
              <p v-if="orgRequiresMfa" class="text-[11px] text-green-700/70 flex items-center gap-1.5">
                <Icon icon="lucide:info" class="w-3 h-3 shrink-0" />
                Required by your organization — cannot be disabled.
              </p>
            </div>
          </div>

          <!-- Active sessions -->
          <div class="bg-gray-200 border border-gray-400 rounded-xl p-5">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-sm font-semibold text-gray-1000">Active Sessions</h3>
              <span class="text-xs text-gray-700">{{ activeSessions.length }} active</span>
            </div>

            <div v-if="activeSessions.length === 0" class="text-xs text-gray-700 py-2">
              No active sessions found.
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
                        Current
                      </span>
                    </div>
                    <div class="text-[11px] text-gray-700 mt-0.5">
                      Last active {{ fmtRelative(session.last_used_at) }}
                      <span v-if="session.expires_at"> · Expires {{ fmtDate(session.expires_at) }}</span>
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
                  <span v-else>Revoke</span>
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
              Sign out all other sessions
            </button>
          </div>

          <!-- Danger zone -->
          <div class="bg-gray-200 border border-red-500/15 rounded-xl p-5">
            <h3 class="text-sm font-semibold text-red-400 mb-1">Danger Zone</h3>
            <p class="text-xs text-gray-700 mb-4">
              Permanently delete your account and all associated data. This cannot be undone.
            </p>
            <button
              @click="openDeleteModal"
              class="text-xs text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/15 border border-red-500/20 px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
            >
              <Icon icon="lucide:trash-2" class="w-3.5 h-3.5" />
              Delete Account
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
                  <h3 class="text-base font-semibold text-gray-1000">Delete Account</h3>
                  <p class="text-xs text-gray-700">This action is permanent</p>
                </div>
              </div>

              <div class="bg-red-500/5 border border-red-500/15 rounded-lg p-3.5 mb-4">
                <p class="text-xs text-red-400 leading-relaxed">
                  Deleting your account will permanently remove:
                </p>
                <ul class="text-xs text-red-400/80 mt-2 space-y-1 list-disc list-inside">
                  <li>All organizations you own</li>
                  <li>All invoices, clients, and projects</li>
                  <li>Your profile and authentication data</li>
                </ul>
              </div>

              <p class="text-xs text-gray-700 mb-5">
                A verification code will be sent to <strong class="text-gray-900">{{ profile?.email }}</strong> to confirm this action.
              </p>

              <div class="flex gap-2 justify-end">
                <button
                  @click="closeDeleteModal"
                  class="text-xs text-gray-900 hover:text-gray-1000 bg-gray-400 hover:bg-gray-500 px-4 py-2 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  @click="sendDeletionOtp"
                  :disabled="isDeleteInitiating"
                  class="flex items-center gap-2 text-xs text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/15 border border-red-500/20 disabled:opacity-50 px-4 py-2 rounded-lg transition-colors"
                >
                  <Icon v-if="isDeleteInitiating" icon="lucide:loader-2" class="w-3.5 h-3.5 animate-spin" />
                  <Icon v-else icon="lucide:mail" class="w-3.5 h-3.5" />
                  Send Verification Code
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
                  <h3 class="text-base font-semibold text-gray-1000">Confirm Deletion</h3>
                  <p class="text-xs text-gray-700">Enter the code sent to your email</p>
                </div>
              </div>

              <p class="text-xs text-gray-700 mb-4">
                Enter the 6-character verification code sent to <strong class="text-gray-900">{{ profile?.email }}</strong>
              </p>

              <input
                v-model="deleteOtp"
                class="app-inp tracking-widest font-mono text-center mb-2"
                placeholder="A1B2C3"
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
                Resend code
              </button>

              <div class="flex gap-2 justify-end">
                <button
                  @click="closeDeleteModal"
                  class="text-xs text-gray-900 hover:text-gray-1000 bg-gray-400 hover:bg-gray-500 px-4 py-2 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  @click="confirmDeletion"
                  :disabled="deleteOtp.length !== 6 || isDeleteConfirming"
                  class="flex items-center gap-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 px-4 py-2 rounded-lg transition-colors"
                >
                  <Icon v-if="isDeleteConfirming" icon="lucide:loader-2" class="w-3.5 h-3.5 animate-spin" />
                  <Icon v-else icon="lucide:trash-2" class="w-3.5 h-3.5" />
                  Delete My Account
                </button>
              </div>
            </template>

          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>
