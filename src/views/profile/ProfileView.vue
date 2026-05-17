<script setup lang="ts">
import { Icon } from '@iconify/vue';
</script>

<template>
  <div class="p-4 md:p-6 space-y-5 min-h-full">

    <!-- Page header -->
    <div>
      <h1 class="page-title">My Profile</h1>
      <p class="page-subtitle">Manage your personal account settings</p>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">

      <!-- Profile details -->
      <div class="bg-charcoal-800 border border-charcoal-700 rounded-xl p-5">
        <!-- Avatar row -->
        <div class="flex items-center gap-4 mb-6">
          <div class="w-16 h-16 rounded-full bg-amber flex items-center justify-center text-2xl font-bold text-charcoal-900 shrink-0">
            AL
          </div>
          <div>
            <div class="font-display text-xl font-semibold text-cream">Ada Lovelace</div>
            <div class="text-xs text-cream-faint">ada@acmestudio.io</div>
            <button class="mt-2 text-xs text-cream-muted hover:text-cream bg-charcoal-700 hover:bg-charcoal-600 px-2.5 py-1 rounded-md transition-colors">
              Change Photo
            </button>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
          <div><label class="app-label">First Name</label><input class="app-inp" value="Ada" /></div>
          <div><label class="app-label">Last Name</label><input class="app-inp" value="Lovelace" /></div>
          <div class="sm:col-span-2"><label class="app-label">Email Address</label><input class="app-inp" value="ada@acmestudio.io" /></div>
          <div class="sm:col-span-2"><label class="app-label">Phone Number</label><input class="app-inp" placeholder="+1 415 555 0199" /></div>
          <div class="sm:col-span-2"><label class="app-label">Job Title / Role</label><input class="app-inp" placeholder="Creative Director" /></div>
        </div>

        <button class="bg-amber hover:bg-amber-light text-charcoal-900 font-semibold text-sm px-4 py-2 rounded-lg transition-colors">
          Save Changes
        </button>
      </div>

      <!-- Right column -->
      <div class="space-y-4">

        <!-- Change password -->
        <div class="bg-charcoal-800 border border-charcoal-700 rounded-xl p-5">
          <h3 class="text-sm font-semibold text-cream mb-4">Change Password</h3>
          <div class="space-y-3 mb-4">
            <div><label class="app-label">Current Password</label><input class="app-inp" type="password" placeholder="••••••••" /></div>
            <div><label class="app-label">New Password</label><input class="app-inp" type="password" placeholder="Min. 8 characters" /></div>
            <div><label class="app-label">Confirm New Password</label><input class="app-inp" type="password" placeholder="••••••••" /></div>
          </div>
          <button class="text-sm text-cream-muted hover:text-cream bg-charcoal-700 hover:bg-charcoal-600 px-4 py-2 rounded-lg transition-colors">
            Update Password
          </button>
        </div>

        <!-- 2FA -->
        <div class="bg-charcoal-800 border border-charcoal-700 rounded-xl p-5">
          <h3 class="text-sm font-semibold text-cream mb-4">Two-Factor Authentication</h3>
          <div class="flex items-center justify-between py-3 border-b border-charcoal-700 mb-3">
            <div>
              <div class="text-sm text-cream">Authenticator App</div>
              <div class="text-xs text-cream-faint mt-0.5">Use Google Authenticator or similar</div>
            </div>
            <label class="app-toggle">
              <input type="checkbox" checked />
              <span class="app-toggle-track"></span>
            </label>
          </div>
          <div class="flex items-center justify-between mb-4">
            <span class="text-xs text-cream-faint">Active sessions</span>
            <span class="text-xs font-mono text-cream">3 sessions</span>
          </div>
          <button class="w-full text-xs text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/15 border border-red-500/20 px-4 py-2 rounded-lg transition-colors">
            Sign out all other sessions
          </button>
        </div>

        <!-- Danger zone -->
        <div class="bg-charcoal-800 border border-red-500/15 rounded-xl p-5">
          <h3 class="text-sm font-semibold text-red-400 mb-1">Danger Zone</h3>
          <p class="text-xs text-cream-faint mb-4">Permanently delete your account and all data. This cannot be undone.</p>
          <button class="text-xs text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/15 border border-red-500/20 px-4 py-2 rounded-lg transition-colors flex items-center gap-2">
            <Icon icon="lucide:trash-2" class="w-3.5 h-3.5" /> Delete Account
          </button>
        </div>
      </div>

    </div>
  </div>
</template>
