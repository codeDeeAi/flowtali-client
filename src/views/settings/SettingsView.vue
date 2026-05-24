<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Icon } from '@iconify/vue'
import { useAuthStore } from '@/stores/auth'
import { usePermissions } from '@/composables/usePermissions'
import { SettingsService, type IOrgSettings, type INotificationPrefs } from '@/services/settings.service'

const authStore = useAuthStore()
const orgId     = computed(() => authStore.getCurrentOrganization?.id ?? '')
const org       = computed(() => authStore.getCurrentOrganization)

const { can } = usePermissions()

type Tab = 'general' | 'notifications' | 'security' | 'api'
const activeTab = ref<Tab>('general')

const tabs = [
  { key: 'general'       as Tab, label: 'General',            icon: 'lucide:settings-2'   },
  { key: 'notifications' as Tab, label: 'Notifications',      icon: 'lucide:bell'         },
  { key: 'security'      as Tab, label: 'Security',           icon: 'lucide:shield-check' },
  { key: 'api'           as Tab, label: 'API & Integrations', icon: 'lucide:code-2'       },
]

// ─── General / Security settings ─────────────────────────────────────────────

const settings = ref<IOrgSettings>({
  industry: null, company_size: null, address: null,
  default_currency: 'USD', payment_terms: 'Net 30', default_tax_rate: 0,
  require_mfa: false, ip_allowlist: [],
})
const orgName        = ref('')
const orgLogoUrl     = ref<string | null>(null)
const logoInput      = ref<HTMLInputElement | null>(null)
const isUploadingLogo = ref(false)
const isDeletingLogo  = ref(false)
const isSavingGen = ref(false)
const isSavingSec = ref(false)
const genSaved    = ref(false)
const secSaved    = ref(false)

async function loadSettings() {
  if (!orgId.value) return
  try {
    const res = await SettingsService.getOrgSettings(orgId.value)
    settings.value = res.data.data
  } catch {}
}

async function handleLogoChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file || !orgId.value) return
  isUploadingLogo.value = true
  try {
    const res = await SettingsService.uploadOrgLogo(orgId.value, file)
    orgLogoUrl.value = res.data.data.logo
    authStore.updateCurrentOrgLogo(res.data.data.logo)
  } catch {} finally {
    isUploadingLogo.value = false
    if (logoInput.value) logoInput.value.value = ''
  }
}

async function deleteLogo() {
  if (!orgId.value) return
  isDeletingLogo.value = true
  try {
    await SettingsService.deleteOrgLogo(orgId.value)
    orgLogoUrl.value = null
    authStore.updateCurrentOrgLogo(null)
  } catch {} finally { isDeletingLogo.value = false }
}

async function saveGeneral() {
  if (!orgId.value) return
  isSavingGen.value = true
  genSaved.value    = false
  try {
    const res = await SettingsService.updateGeneralSettings(orgId.value, {
      industry:         settings.value.industry,
      company_size:     settings.value.company_size,
      address:          settings.value.address,
      default_currency: settings.value.default_currency,
      payment_terms:    settings.value.payment_terms,
      default_tax_rate: settings.value.default_tax_rate,
    })
    settings.value = res.data.data
    genSaved.value = true
    setTimeout(() => { genSaved.value = false }, 2500)
  } catch {} finally { isSavingGen.value = false }
}

async function saveSecurity() {
  if (!orgId.value) return
  isSavingSec.value = true
  secSaved.value    = false
  try {
    const res = await SettingsService.updateSecuritySettings(orgId.value, {
      require_mfa:  settings.value.require_mfa,
      ip_allowlist: ipAllowlistText.value
        .split('\n')
        .map(s => s.trim())
        .filter(Boolean),
    })
    settings.value = res.data.data
    // Keep the auth store in sync so ProfileView reflects the updated require_mfa immediately
    const currentOrg = authStore.getCurrentOrganization
    if (currentOrg) {
      authStore.updateOrganization({ ...currentOrg, require_mfa: settings.value.require_mfa })
    }
    secSaved.value = true
    setTimeout(() => { secSaved.value = false }, 2500)
  } catch {} finally { isSavingSec.value = false }
}

// IP allowlist as textarea text
const ipAllowlistText = computed({
  get: () => (settings.value.ip_allowlist ?? []).join('\n'),
  set: (v: string) => {
    settings.value.ip_allowlist = v.split('\n').map(s => s.trim()).filter(Boolean)
  },
})

// ─── Notification prefs ───────────────────────────────────────────────────────

const notifPrefs = ref<INotificationPrefs>({
  invoice_paid:    { email: true,  in_app: true  },
  invoice_overdue: { email: true,  in_app: true  },
  invoice_viewed:  { email: false, in_app: true  },
  member_joined:   { email: true,  in_app: false },
  role_changed:    { email: true,  in_app: true  },
})
const isSavingNotif = ref(false)
const notifSaved    = ref(false)

async function loadNotifPrefs() {
  try {
    const res = await SettingsService.getNotificationPrefs()
    notifPrefs.value = res.data.data
  } catch {}
}

async function saveNotifPrefs() {
  isSavingNotif.value = true
  notifSaved.value    = false
  try {
    const res = await SettingsService.updateNotificationPrefs(notifPrefs.value)
    notifPrefs.value = res.data.data
    notifSaved.value = true
    setTimeout(() => { notifSaved.value = false }, 2500)
  } catch {} finally { isSavingNotif.value = false }
}

const notifGroups = [
  {
    group: 'Invoices',
    items: [
      { key: 'invoice_paid'    as keyof INotificationPrefs, label: 'Invoice paid',    desc: 'When a client pays an invoice'         },
      { key: 'invoice_overdue' as keyof INotificationPrefs, label: 'Invoice overdue', desc: 'When an invoice passes its due date'   },
      { key: 'invoice_viewed'  as keyof INotificationPrefs, label: 'Invoice viewed',  desc: 'When a client views an invoice'        },
    ],
  },
  {
    group: 'Team',
    items: [
      { key: 'member_joined' as keyof INotificationPrefs, label: 'Member joined', desc: 'When a team member accepts an invite'  },
      { key: 'role_changed'  as keyof INotificationPrefs, label: 'Role changed',  desc: 'When a member role is updated'         },
    ],
  },
]

// ─── API keys (static placeholder) ───────────────────────────────────────────

const apiKeys = [
  { id: 1, name: 'Production API Key',  masked: 'flw_live_••••••••••••3fa2', lastUsed: '2 days ago' },
  { id: 2, name: 'Development API Key', masked: 'flw_test_••••••••••••9b1d', lastUsed: '1 week ago' },
]

onMounted(async () => {
  orgName.value    = org.value?.name ?? ''
  orgLogoUrl.value = org.value?.logo ?? null
  await Promise.all([loadSettings(), loadNotifPrefs()])
})
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

        <!-- ─── General ─────────────────────────────────────── -->
        <div v-if="activeTab === 'general'" class="bg-charcoal-800 border border-charcoal-700 rounded-xl p-5 space-y-5">
          <h3 class="text-sm font-semibold text-cream">Organization Details</h3>

          <!-- Logo upload -->
          <div class="flex items-center gap-5">
            <!-- Preview -->
            <div class="w-16 h-16 rounded-xl border border-charcoal-600 overflow-hidden bg-charcoal-700 flex items-center justify-center shrink-0">
              <img v-if="orgLogoUrl" :src="orgLogoUrl" :alt="orgName" class="w-full h-full object-cover" />
              <Icon v-else icon="lucide:building-2" class="w-7 h-7 text-cream-faint/40" />
            </div>
            <!-- Actions -->
            <div>
              <div class="text-sm font-medium text-cream mb-1">Organization Logo</div>
              <div class="text-xs text-cream-faint mb-3">PNG, JPG or WebP · max 2 MB</div>
              <div class="flex items-center gap-2">
                <input ref="logoInput" type="file" accept="image/*" class="hidden" @change="handleLogoChange" />
                <button
                  v-if="can('settings.update')"
                  type="button"
                  :disabled="isUploadingLogo"
                  class="flex items-center gap-1.5 text-xs bg-charcoal-700 hover:bg-charcoal-600 border border-charcoal-600 hover:border-charcoal-500 text-cream-muted hover:text-cream px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                  @click="logoInput?.click()"
                >
                  <Icon v-if="isUploadingLogo" icon="lucide:loader-2" class="w-3.5 h-3.5 animate-spin" />
                  <Icon v-else icon="lucide:upload" class="w-3.5 h-3.5" />
                  {{ isUploadingLogo ? 'Uploading…' : 'Upload logo' }}
                </button>
                <button
                  v-if="orgLogoUrl && can('settings.update')"
                  type="button"
                  :disabled="isDeletingLogo"
                  class="text-xs text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/15 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                  @click="deleteLogo"
                >
                  {{ isDeletingLogo ? 'Removing…' : 'Remove' }}
                </button>
              </div>
            </div>
          </div>

          <div class="h-px bg-charcoal-700"></div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="app-label">Organization Name</label>
              <input class="app-inp" :value="orgName" disabled title="Change from the organization page" />
            </div>
            <div>
              <label class="app-label">Industry</label>
              <select v-model="settings.industry" class="app-select">
                <option :value="null">Select industry…</option>
                <option>Design & Creative</option>
                <option>Technology</option>
                <option>Finance</option>
                <option>Consulting</option>
                <option>Marketing</option>
                <option>Legal</option>
                <option>Healthcare</option>
                <option>Education</option>
                <option>Other</option>
              </select>
            </div>
            <div>
              <label class="app-label">Company Size</label>
              <select v-model="settings.company_size" class="app-select">
                <option :value="null">Select size…</option>
                <option>1 (Just me)</option>
                <option>2–10</option>
                <option>11–50</option>
                <option>50+</option>
              </select>
            </div>
            <div class="sm:col-span-2">
              <label class="app-label">Business Address</label>
              <textarea v-model="settings.address" class="app-inp" rows="3" placeholder="123 Street, City, Country"></textarea>
            </div>
          </div>

          <div class="h-px bg-charcoal-700"></div>
          <h3 class="text-sm font-semibold text-cream">Default Invoice Settings</h3>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label class="app-label">Default Currency</label>
              <select v-model="settings.default_currency" class="app-select">
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="NGN">NGN (₦)</option>
                <option value="CAD">CAD (C$)</option>
                <option value="AUD">AUD (A$)</option>
              </select>
            </div>
            <div>
              <label class="app-label">Payment Terms</label>
              <select v-model="settings.payment_terms" class="app-select">
                <option>Net 30</option>
                <option>Net 15</option>
                <option>Due on receipt</option>
                <option>Net 60</option>
                <option>Net 90</option>
              </select>
            </div>
            <div>
              <label class="app-label">Default Tax Rate (%)</label>
              <input v-model.number="settings.default_tax_rate" class="app-inp" type="number" min="0" max="100" step="0.01" />
            </div>
          </div>

          <div v-if="can('settings.update')" class="flex items-center gap-3">
            <button
              :disabled="isSavingGen"
              @click="saveGeneral"
              class="bg-amber hover:bg-amber-light text-charcoal-900 font-semibold text-sm px-4 py-2 rounded-lg transition-colors disabled:opacity-60 flex items-center gap-2"
            >
              <Icon v-if="isSavingGen" icon="lucide:loader-2" class="w-3.5 h-3.5 animate-spin" />
              Save Changes
            </button>
            <span v-if="genSaved" class="text-xs text-green-400 flex items-center gap-1">
              <Icon icon="lucide:check" class="w-3.5 h-3.5" /> Saved
            </span>
          </div>
        </div>

        <!-- ─── Notifications ───────────────────────────────── -->
        <div v-if="activeTab === 'notifications'" class="bg-charcoal-800 border border-charcoal-700 rounded-xl p-5">
          <h3 class="text-sm font-semibold text-cream mb-4">Notification Preferences</h3>
          <div v-for="group in notifGroups" :key="group.group" class="mb-5">
            <div class="text-[10px] font-semibold uppercase tracking-widest text-cream-faint mb-3">{{ group.group }}</div>
            <div v-for="item in group.items" :key="item.key" class="flex items-center justify-between py-3 border-b border-charcoal-700 last:border-0">
              <div class="flex-1 pr-4">
                <div class="text-sm text-cream">{{ item.label }}</div>
                <div class="text-xs text-cream-faint mt-0.5">{{ item.desc }}</div>
              </div>
              <div class="flex items-center gap-4">
                <label class="flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" v-model="notifPrefs[item.key].email" class="accent-amber w-3.5 h-3.5" />
                  <span class="text-xs text-cream-faint">Email</span>
                </label>
                <label class="flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" v-model="notifPrefs[item.key].in_app" class="accent-amber w-3.5 h-3.5" />
                  <span class="text-xs text-cream-faint">In-app</span>
                </label>
              </div>
            </div>
          </div>
          <div class="flex items-center gap-3 mt-4">
            <button
              :disabled="isSavingNotif"
              @click="saveNotifPrefs"
              class="bg-amber hover:bg-amber-light text-charcoal-900 font-semibold text-sm px-4 py-2 rounded-lg transition-colors disabled:opacity-60 flex items-center gap-2"
            >
              <Icon v-if="isSavingNotif" icon="lucide:loader-2" class="w-3.5 h-3.5 animate-spin" />
              Save Preferences
            </button>
            <span v-if="notifSaved" class="text-xs text-green-400 flex items-center gap-1">
              <Icon icon="lucide:check" class="w-3.5 h-3.5" /> Saved
            </span>
          </div>
        </div>

        <!-- ─── Security ────────────────────────────────────── -->
        <div v-if="activeTab === 'security'" class="bg-charcoal-800 border border-charcoal-700 rounded-xl p-5 space-y-5">
          <h3 class="text-sm font-semibold text-cream">Security Settings</h3>

          <!-- Two-Factor Authentication -->
          <div class="flex items-start justify-between py-4 border-b border-charcoal-700">
            <div class="flex-1 pr-4">
              <div class="text-sm font-medium text-cream">Two-Factor Authentication</div>
              <div class="text-xs text-cream-faint mt-0.5">Require 2FA for all organization members</div>
            </div>
            <label class="app-toggle shrink-0">
              <input type="checkbox" v-model="settings.require_mfa" />
              <span class="app-toggle-track"></span>
            </label>
          </div>

          <!-- IP Allowlist -->
          <div>
            <div class="text-sm font-medium text-cream mb-1">IP Allowlist</div>
            <div class="text-xs text-cream-faint mb-3">Restrict access to specific IP ranges. Leave empty to allow all IPs. Enter one IP or CIDR block per line.</div>
            <textarea
              v-model="ipAllowlistText"
              class="app-inp font-mono text-xs"
              rows="4"
              placeholder="192.168.1.0/24&#10;10.0.0.1"
            ></textarea>
          </div>

          <div v-if="can('settings.security')" class="flex items-center gap-3">
            <button
              :disabled="isSavingSec"
              @click="saveSecurity"
              class="bg-amber hover:bg-amber-light text-charcoal-900 font-semibold text-sm px-4 py-2 rounded-lg transition-colors disabled:opacity-60 flex items-center gap-2"
            >
              <Icon v-if="isSavingSec" icon="lucide:loader-2" class="w-3.5 h-3.5 animate-spin" />
              Save Security Settings
            </button>
            <span v-if="secSaved" class="text-xs text-green-400 flex items-center gap-1">
              <Icon icon="lucide:check" class="w-3.5 h-3.5" /> Saved
            </span>
          </div>
        </div>

        <!-- ─── API ─────────────────────────────────────────── -->
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
