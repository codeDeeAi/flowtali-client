<script setup lang="ts">
import { ref } from 'vue';
import { Icon } from '@iconify/vue';

type Tab = 'general' | 'notifications' | 'security' | 'api';
const activeTab = ref<Tab>('general');

const tabs = [
  { key: 'general'      as Tab, label: 'General',             icon: 'lucide:settings-2'    },
  { key: 'notifications'as Tab, label: 'Notifications',       icon: 'lucide:bell'          },
  { key: 'security'     as Tab, label: 'Security',            icon: 'lucide:shield-check'  },
  { key: 'api'          as Tab, label: 'API & Integrations',  icon: 'lucide:code-2'        },
];

const notifGroups = [
  {
    group: 'Invoices',
    items: [
      { label: 'Invoice paid',     desc: 'When a client pays an invoice',         email: true,  inApp: true  },
      { label: 'Invoice overdue',  desc: 'When an invoice passes its due date',   email: true,  inApp: true  },
      { label: 'Invoice viewed',   desc: 'When a client views an invoice',        email: false, inApp: true  },
    ],
  },
  {
    group: 'Team',
    items: [
      { label: 'Member joined',   desc: 'When a team member accepts an invite',  email: true,  inApp: false },
      { label: 'Role changed',    desc: 'When a member role is updated',         email: true,  inApp: true  },
    ],
  },
];

const securitySettings = [
  { label: 'Two-Factor Authentication', desc: 'Require 2FA for all team members',                enabled: false, action: null    },
  { label: 'SSO (Single Sign-On)',      desc: 'Use your organization SSO provider',              enabled: false, action: 'Configure' },
  { label: 'Session Timeout',           desc: 'Auto sign out after 24h of inactivity',           enabled: true,  action: null    },
  { label: 'IP Allowlist',              desc: 'Restrict access to specific IP ranges',           enabled: false, action: 'Set up' },
];

const apiKeys = [
  { id: 1, name: 'Production API Key',   masked: 'flw_live_••••••••••••3fa2', lastUsed: '2 days ago' },
  { id: 2, name: 'Development API Key',  masked: 'flw_test_••••••••••••9b1d', lastUsed: '1 week ago' },
];
</script>

<template>
  <div class="p-4 md:p-6 space-y-5 min-h-full">

    <!-- Page header -->
    <div>
      <h1 class="page-title">Settings</h1>
      <p class="page-subtitle">Organization and account configuration</p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">

      <!-- Settings nav -->
      <div class="bg-charcoal-800 border border-charcoal-700 rounded-xl p-2 h-fit">
        <button
          v-for="tab in tabs" :key="tab.key"
          :class="[
            'w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors',
            activeTab === tab.key ? 'bg-amber/10 text-amber' : 'text-cream-muted hover:text-cream hover:bg-charcoal-700',
          ]"
          @click="activeTab = tab.key"
        >
          <Icon :icon="tab.icon" class="w-4 h-4 shrink-0" />
          <span>{{ tab.label }}</span>
        </button>
      </div>

      <!-- Content -->
      <div class="md:col-span-3">

        <!-- General -->
        <div v-if="activeTab === 'general'" class="bg-charcoal-800 border border-charcoal-700 rounded-xl p-5 space-y-5">
          <h3 class="text-sm font-semibold text-cream">Organization Details</h3>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label class="app-label">Organization Name</label><input class="app-inp" value="Acme Design Studio" /></div>
            <div><label class="app-label">Display Name / Alias</label><input class="app-inp" placeholder="How you appear to others" /></div>
            <div><label class="app-label">Industry</label>
              <select class="app-select">
                <option>Design & Creative</option><option>Technology</option><option>Finance</option><option>Consulting</option><option>Other</option>
              </select>
            </div>
            <div><label class="app-label">Company Size</label>
              <select class="app-select">
                <option>1 (Just me)</option><option>2–10</option><option>11–50</option><option>50+</option>
              </select>
            </div>
            <div class="sm:col-span-2"><label class="app-label">Business Address</label><textarea class="app-inp" rows="3" placeholder="123 Street, City, Country"></textarea></div>
          </div>
          <div class="h-px bg-charcoal-700"></div>
          <h3 class="text-sm font-semibold text-cream">Default Invoice Settings</h3>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div><label class="app-label">Default Currency</label>
              <select class="app-select"><option>USD ($)</option><option>EUR (€)</option><option>GBP (£)</option><option>NGN (₦)</option></select>
            </div>
            <div><label class="app-label">Payment Terms</label>
              <select class="app-select"><option>Net 30</option><option>Net 15</option><option>Due on receipt</option><option>Net 60</option></select>
            </div>
            <div><label class="app-label">Default Tax Rate (%)</label><input class="app-inp" value="10" type="number" /></div>
          </div>
          <button class="bg-amber hover:bg-amber-light text-charcoal-900 font-semibold text-sm px-4 py-2 rounded-lg transition-colors">
            Save Changes
          </button>
        </div>

        <!-- Notifications -->
        <div v-if="activeTab === 'notifications'" class="bg-charcoal-800 border border-charcoal-700 rounded-xl p-5">
          <h3 class="text-sm font-semibold text-cream mb-4">Notification Preferences</h3>
          <div v-for="group in notifGroups" :key="group.group" class="mb-5">
            <div class="text-[10px] font-semibold uppercase tracking-widest text-cream-faint mb-3">{{ group.group }}</div>
            <div v-for="item in group.items" :key="item.label" class="flex items-center justify-between py-3 border-b border-charcoal-700 last:border-0">
              <div class="flex-1 pr-4">
                <div class="text-sm text-cream">{{ item.label }}</div>
                <div class="text-xs text-cream-faint mt-0.5">{{ item.desc }}</div>
              </div>
              <div class="flex items-center gap-4">
                <label class="flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" :checked="item.email" class="accent-amber w-3.5 h-3.5" />
                  <span class="text-xs text-cream-faint">Email</span>
                </label>
                <label class="flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" :checked="item.inApp" class="accent-amber w-3.5 h-3.5" />
                  <span class="text-xs text-cream-faint">In-app</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        <!-- Security -->
        <div v-if="activeTab === 'security'" class="bg-charcoal-800 border border-charcoal-700 rounded-xl p-5">
          <h3 class="text-sm font-semibold text-cream mb-4">Security Settings</h3>
          <div v-for="sec in securitySettings" :key="sec.label" class="flex items-center justify-between py-4 border-b border-charcoal-700 last:border-0">
            <div class="flex-1 pr-4">
              <div class="text-sm font-medium text-cream">{{ sec.label }}</div>
              <div class="text-xs text-cream-faint mt-0.5">{{ sec.desc }}</div>
            </div>
            <div class="shrink-0">
              <button v-if="sec.action" class="text-xs text-cream-muted hover:text-cream bg-charcoal-700 hover:bg-charcoal-600 px-3 py-1.5 rounded-md transition-colors">
                {{ sec.action }}
              </button>
              <label v-else class="app-toggle">
                <input type="checkbox" :checked="sec.enabled" />
                <span class="app-toggle-track"></span>
              </label>
            </div>
          </div>
        </div>

        <!-- API -->
        <div v-if="activeTab === 'api'" class="space-y-4">
          <div class="bg-charcoal-800 border border-charcoal-700 rounded-xl p-5">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-sm font-semibold text-cream">API Keys</h3>
              <button class="flex items-center gap-1.5 bg-amber hover:bg-amber-light text-charcoal-900 font-semibold text-xs px-3 py-1.5 rounded-lg transition-colors">
                <Icon icon="lucide:plus" class="w-3.5 h-3.5" /> Generate Key
              </button>
            </div>
            <div class="bg-amber/5 border border-amber/20 rounded-lg p-3 mb-4">
              <div class="flex items-center gap-2 mb-1">
                <Icon icon="lucide:zap" class="w-3.5 h-3.5 text-amber" />
                <span class="text-xs font-medium text-amber">API access is available on Pro and Business plans</span>
              </div>
              <p class="text-xs text-cream-faint">Use API keys to integrate Flowtali with your own systems and automate workflows.</p>
            </div>
            <div class="space-y-3">
              <div v-for="key in apiKeys" :key="key.id" class="flex items-center gap-3 p-3 border border-charcoal-700 rounded-lg">
                <div class="flex-1 min-w-0">
                  <div class="text-sm font-medium text-cream mb-1">{{ key.name }}</div>
                  <div class="font-mono text-xs text-cream-faint bg-charcoal-900 px-2 py-1 rounded w-fit">{{ key.masked }}</div>
                </div>
                <div class="text-right shrink-0">
                  <span class="status-badge status-active text-[9px]">Active</span>
                  <div class="text-[10px] text-cream-faint mt-1">Last used {{ key.lastUsed }}</div>
                </div>
                <button class="text-xs text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/15 px-2.5 py-1.5 rounded-md transition-colors shrink-0">
                  Revoke
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  </div>
</template>
