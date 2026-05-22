<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Icon } from '@iconify/vue'
import { useAuthStore } from '@/stores/auth'
import { ProfileService, type IUserProfile, type ISession } from '@/services/profile.service'
import { useNotification } from '@/composables/notification'

const authStore   = useAuthStore()
const { notify }  = useNotification()

const orgRequiresMfa = computed(() => authStore.getCurrentOrganization?.require_mfa === true)

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
      <Icon icon="lucide:loader-2" class="w-6 h-6 text-cream-faint animate-spin" />
    </div>

    <template v-else>
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">

        <!-- ── Profile card ──────────────────────────────────────────────── -->
        <div class="bg-charcoal-800 border border-charcoal-700 rounded-xl p-5">
          <!-- Avatar row -->
          <div class="flex items-center gap-4 mb-6">
            <div class="relative shrink-0">
              <div v-if="profile?.avatar"
                class="w-16 h-16 rounded-full overflow-hidden">
                <img :src="profile.avatar" alt="avatar" class="w-full h-full object-cover" />
              </div>
              <div v-else
                class="w-16 h-16 rounded-full bg-amber flex items-center justify-center text-xl font-bold text-charcoal-900">
                {{ initials }}
              </div>
              <div v-if="isUploadingAvatar"
                class="absolute inset-0 rounded-full bg-black/60 flex items-center justify-center">
                <Icon icon="lucide:loader-2" class="w-4 h-4 text-white animate-spin" />
              </div>
            </div>
            <div>
              <div class="font-display text-xl font-semibold text-cream">{{ profile?.full_name }}</div>
              <div class="text-xs text-cream-faint">{{ profile?.email }}</div>
              <input ref="avatarInput" type="file" accept="image/*" class="hidden" @change="handleAvatarChange" />
              <button
                @click="triggerAvatarUpload"
                class="mt-2 text-xs text-cream-muted hover:text-cream bg-charcoal-700 hover:bg-charcoal-600 px-2.5 py-1 rounded-md transition-colors"
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
            class="flex items-center gap-2 bg-amber hover:bg-amber-light disabled:opacity-60 text-charcoal-900 font-semibold text-sm px-4 py-2 rounded-lg transition-colors"
          >
            <Icon v-if="isSavingProfile" icon="lucide:loader-2" class="w-4 h-4 animate-spin" />
            Save Changes
          </button>
        </div>

        <!-- ── Right column ──────────────────────────────────────────────── -->
        <div class="space-y-4">

          <!-- Change password -->
          <div class="bg-charcoal-800 border border-charcoal-700 rounded-xl p-5">
            <h3 class="text-sm font-semibold text-cream mb-4">Change Password</h3>
            <div class="space-y-3 mb-4">
              <div>
                <label class="app-label">Current Password</label>
                <div class="relative">
                  <input class="app-inp pr-10"
                    :type="showCurrentPw ? 'text' : 'password'"
                    v-model="pwForm.current_password"
                    placeholder="••••••••" />
                  <button type="button" class="absolute right-3 top-1/2 -translate-y-1/2 text-cream-faint hover:text-cream" @click="showCurrentPw = !showCurrentPw">
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
                  <button type="button" class="absolute right-3 top-1/2 -translate-y-1/2 text-cream-faint hover:text-cream" @click="showNewPw = !showNewPw">
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
                  <button type="button" class="absolute right-3 top-1/2 -translate-y-1/2 text-cream-faint hover:text-cream" @click="showConfirmPw = !showConfirmPw">
                    <Icon :icon="showConfirmPw ? 'lucide:eye-off' : 'lucide:eye'" class="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
            <button
              @click="changePassword"
              :disabled="isSavingPw || !pwForm.current_password || !pwForm.password"
              class="flex items-center gap-2 text-sm text-cream-muted hover:text-cream bg-charcoal-700 hover:bg-charcoal-600 disabled:opacity-50 px-4 py-2 rounded-lg transition-colors"
            >
              <Icon v-if="isSavingPw" icon="lucide:loader-2" class="w-4 h-4 animate-spin" />
              Update Password
            </button>
          </div>

          <!-- Two-Factor Authentication -->
          <div class="bg-charcoal-800 border border-charcoal-700 rounded-xl p-5">
            <div class="flex items-start justify-between mb-1">
              <h3 class="text-sm font-semibold text-cream">Two-Factor Authentication</h3>
              <span
                :class="[
                  'text-[10px] font-semibold px-2 py-0.5 rounded-full',
                  profile?.mfa_enabled
                    ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                    : 'bg-charcoal-600 text-cream-muted border border-charcoal-500',
                ]"
              >
                {{ profile?.mfa_enabled ? 'Enabled' : 'Disabled' }}
              </span>
            </div>
            <p class="text-xs text-cream-faint mb-4">
              Add an extra layer of security — a one-time code is emailed on every login.
            </p>

            <!-- OTP confirmation step -->
            <div v-if="mfaStep === 'otp'" class="space-y-3">
              <p class="text-xs text-cream-muted">Enter the 6-character code sent to your email:</p>
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
                  class="flex items-center gap-2 bg-amber hover:bg-amber-light disabled:opacity-60 text-charcoal-900 font-semibold text-xs px-4 py-2 rounded-lg transition-colors"
                >
                  <Icon v-if="isMfaSubmitting" icon="lucide:loader-2" class="w-3.5 h-3.5 animate-spin" />
                  Verify & Enable
                </button>
                <button
                  @click="mfaStep = 'idle'"
                  class="text-xs text-cream-muted hover:text-cream bg-charcoal-700 hover:bg-charcoal-600 px-4 py-2 rounded-lg transition-colors"
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
              class="flex items-center gap-2 text-sm text-cream-muted hover:text-cream bg-charcoal-700 hover:bg-charcoal-600 disabled:opacity-50 px-4 py-2 rounded-lg transition-colors"
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
              <p v-if="orgRequiresMfa" class="text-[11px] text-amber/70 flex items-center gap-1.5">
                <Icon icon="lucide:info" class="w-3 h-3 shrink-0" />
                Required by your organization — cannot be disabled.
              </p>
            </div>
          </div>

          <!-- Active sessions -->
          <div class="bg-charcoal-800 border border-charcoal-700 rounded-xl p-5">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-sm font-semibold text-cream">Active Sessions</h3>
              <span class="text-xs text-cream-faint">{{ activeSessions.length }} active</span>
            </div>

            <div v-if="activeSessions.length === 0" class="text-xs text-cream-faint py-2">
              No active sessions found.
            </div>

            <div v-else class="space-y-2 mb-4">
              <div
                v-for="session in activeSessions"
                :key="session.id"
                class="flex items-center justify-between py-2.5 px-3 rounded-lg bg-charcoal-700/50"
              >
                <div class="flex items-center gap-2.5">
                  <div class="w-7 h-7 rounded-full bg-charcoal-600 flex items-center justify-center shrink-0">
                    <Icon icon="lucide:monitor" class="w-3.5 h-3.5 text-cream-muted" />
                  </div>
                  <div>
                    <div class="text-xs font-medium text-cream flex items-center gap-1.5">
                      {{ session.name }}
                      <span v-if="session.is_current"
                        class="text-[10px] font-semibold text-green-400 bg-green-500/10 border border-green-500/20 px-1.5 py-0.5 rounded-full">
                        Current
                      </span>
                    </div>
                    <div class="text-[11px] text-cream-faint mt-0.5">
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
          <div class="bg-charcoal-800 border border-red-500/15 rounded-xl p-5">
            <h3 class="text-sm font-semibold text-red-400 mb-1">Danger Zone</h3>
            <p class="text-xs text-cream-faint mb-4">
              Permanently delete your account and all associated data. This cannot be undone.
            </p>
            <button class="text-xs text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/15 border border-red-500/20 px-4 py-2 rounded-lg transition-colors flex items-center gap-2">
              <Icon icon="lucide:trash-2" class="w-3.5 h-3.5" />
              Delete Account
            </button>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
