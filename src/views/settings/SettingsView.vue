<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { Icon } from '@iconify/vue'
import { useAuthStore } from '@/stores/auth'
import { usePermissions } from '@/composables/usePermissions'
import { SettingsService, type IOrgSettings, type INotificationPrefs } from '@/services/settings.service'
import { useRoute } from 'vue-router'
import AiCredentialsSection from './AiCredentialsSection.vue'

const { t } = useI18n()
const authStore = useAuthStore()
const orgId     = computed(() => authStore.getCurrentOrganization?.id ?? '')
const org       = computed(() => authStore.getCurrentOrganization)

const { can } = usePermissions()

type Tab = 'general' | 'notifications' | 'security' | 'api' | 'ai'
const route = useRoute()
const activeTab = ref<Tab>('general')

const tabs = computed(() => [
  { key: 'general'       as Tab, label: t('settings.tabs.general'),       icon: 'lucide:settings-2'   },
  { key: 'ai'            as Tab, label: t('settings.tabs.ai'),            icon: 'lucide:sparkles'     },
  { key: 'notifications' as Tab, label: t('settings.tabs.notifications'), icon: 'lucide:bell'         },
  { key: 'security'      as Tab, label: t('settings.tabs.security'),      icon: 'lucide:shield-check' },
  { key: 'api'           as Tab, label: t('settings.tabs.api'),           icon: 'lucide:code-2'       },
])

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
      name:             orgName.value,
      industry:         settings.value.industry,
      company_size:     settings.value.company_size,
      address:          settings.value.address,
      default_currency: settings.value.default_currency,
      payment_terms:    settings.value.payment_terms,
      default_tax_rate: settings.value.default_tax_rate,
    })
    settings.value = res.data.data
    if (res.data.data.name) orgName.value = res.data.data.name
    const currentOrg = authStore.getCurrentOrganization
    if (currentOrg) authStore.updateOrganization({ ...currentOrg, name: orgName.value })
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
  marketing_emails: { email: true, in_app: false },
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

const notifGroups = computed(() => [
  {
    group: t('settings.notifications.groups.invoices'),
    items: [
      { key: 'invoice_paid'    as keyof INotificationPrefs, label: t('settings.notifications.items.invoice_paid.label'),    desc: t('settings.notifications.items.invoice_paid.desc')    },
      { key: 'invoice_overdue' as keyof INotificationPrefs, label: t('settings.notifications.items.invoice_overdue.label'), desc: t('settings.notifications.items.invoice_overdue.desc') },
      { key: 'invoice_viewed'  as keyof INotificationPrefs, label: t('settings.notifications.items.invoice_viewed.label'),  desc: t('settings.notifications.items.invoice_viewed.desc')  },
    ],
  },
  {
    group: t('settings.notifications.groups.team'),
    items: [
      { key: 'member_joined' as keyof INotificationPrefs, label: t('settings.notifications.items.member_joined.label'), desc: t('settings.notifications.items.member_joined.desc') },
      { key: 'role_changed'  as keyof INotificationPrefs, label: t('settings.notifications.items.role_changed.label'),  desc: t('settings.notifications.items.role_changed.desc')  },
    ],
  },
  {
    group: t('settings.notifications.groups.marketing'),
    items: [
      { key: 'marketing_emails' as keyof INotificationPrefs, label: t('settings.notifications.items.marketing_emails.label'), desc: t('settings.notifications.items.marketing_emails.desc'), emailOnly: true },
    ],
  },
])

// ─── API keys (static placeholder) ───────────────────────────────────────────

const apiKeys = [
  { id: 1, name: 'Production API Key',  masked: 'flw_live_••••••••••••3fa2', lastUsed: '2 days ago' },
  { id: 2, name: 'Development API Key', masked: 'flw_test_••••••••••••9b1d', lastUsed: '1 week ago' },
]

onMounted(async () => {
  // Deep-link support: /app/settings?tab=ai opens the AI tab directly
  // (used by the "Set up AI" CTA on the /app/ai chat view).
  const validTabs: Tab[] = ['general', 'ai', 'notifications', 'security', 'api']
  const q = route.query.tab as Tab | undefined
  if (q && validTabs.includes(q)) activeTab.value = q

  orgName.value    = org.value?.name ?? ''
  orgLogoUrl.value = org.value?.logo ?? null
  await Promise.all([loadSettings(), loadNotifPrefs()])
})
</script>

<template>
  <div class="p-4 md:p-6 space-y-5 min-h-full">

    <!-- Page header -->
    <div>
      <h1 class="page-title">{{ t('settings.title') }}</h1>
      <p class="page-subtitle">{{ t('settings.subtitle') }}</p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">

      <!-- Settings nav -->
      <div class="bg-gray-200 border border-gray-400 rounded-xl p-2 h-fit">
        <button
          v-for="tab in tabs" :key="tab.key"
          :class="[
            'w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors',
            activeTab === tab.key ? 'bg-green-700/10 text-green-700' : 'text-gray-900 hover:text-gray-1000 hover:bg-gray-400',
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
        <div v-if="activeTab === 'general'" class="bg-gray-200 border border-gray-400 rounded-xl p-5 space-y-5">
          <h3 class="text-sm font-semibold text-gray-1000">{{ t('settings.general.orgDetails') }}</h3>

          <!-- Logo upload -->
          <div class="flex items-center gap-5">
            <!-- Preview -->
            <div class="w-16 h-16 rounded-xl border border-gray-500 overflow-hidden bg-gray-400 flex items-center justify-center shrink-0">
              <img v-if="orgLogoUrl" :src="orgLogoUrl" :alt="orgName" class="w-full h-full object-cover" />
              <Icon v-else icon="lucide:building-2" class="w-7 h-7 text-gray-700/40" />
            </div>
            <!-- Actions -->
            <div>
              <div class="text-sm font-medium text-gray-1000 mb-1">{{ t('settings.general.logo') }}</div>
              <div class="text-xs text-gray-700 mb-3">{{ t('settings.general.logoHint') }}</div>
              <div class="flex items-center gap-2">
                <input ref="logoInput" type="file" accept="image/*" class="hidden" @change="handleLogoChange" />
                <button
                  v-if="can('settings.update')"
                  type="button"
                  :disabled="isUploadingLogo"
                  class="flex items-center gap-1.5 text-xs bg-gray-400 hover:bg-gray-500 border border-gray-500 hover:border-gray-500 text-gray-900 hover:text-gray-1000 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                  @click="logoInput?.click()"
                >
                  <Icon v-if="isUploadingLogo" icon="lucide:loader-2" class="w-3.5 h-3.5 animate-spin" />
                  <Icon v-else icon="lucide:upload" class="w-3.5 h-3.5" />
                  {{ isUploadingLogo ? t('settings.general.uploading') : t('settings.general.uploadLogo') }}
                </button>
                <button
                  v-if="orgLogoUrl && can('settings.update')"
                  type="button"
                  :disabled="isDeletingLogo"
                  class="text-xs text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/15 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                  @click="deleteLogo"
                >
                  {{ isDeletingLogo ? t('settings.general.removing') : t('settings.general.remove') }}
                </button>
              </div>
            </div>
          </div>

          <div class="h-px bg-gray-400"></div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="app-label">{{ t('settings.general.orgName') }}</label>
              <input class="app-inp" v-model="orgName" :placeholder="t('settings.general.orgNamePlaceholder')" />
            </div>
            <div>
              <label class="app-label">{{ t('settings.general.industry') }}</label>
              <select v-model="settings.industry" class="app-select">
                <option :value="null">{{ t('settings.general.selectIndustry') }}</option>
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
              <label class="app-label">{{ t('settings.general.companySize') }}</label>
              <select v-model="settings.company_size" class="app-select">
                <option :value="null">{{ t('settings.general.selectSize') }}</option>
                <option>1 (Just me)</option>
                <option>2–10</option>
                <option>11–50</option>
                <option>50+</option>
              </select>
            </div>
            <div class="sm:col-span-2">
              <label class="app-label">{{ t('settings.general.businessAddress') }}</label>
              <textarea v-model="settings.address" class="app-inp" rows="3" :placeholder="t('settings.general.addressPlaceholder')"></textarea>
            </div>
          </div>

          <div class="h-px bg-gray-400"></div>
          <h3 class="text-sm font-semibold text-gray-1000">{{ t('settings.general.defaultInvoiceSettings') }}</h3>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label class="app-label">{{ t('settings.general.defaultCurrency') }}</label>
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
              <label class="app-label">{{ t('settings.general.paymentTerms') }}</label>
              <select v-model="settings.payment_terms" class="app-select">
                <option>Net 30</option>
                <option>Net 15</option>
                <option>Due on receipt</option>
                <option>Net 60</option>
                <option>Net 90</option>
              </select>
            </div>
            <div>
              <label class="app-label">{{ t('settings.general.defaultTaxRate') }}</label>
              <input v-model.number="settings.default_tax_rate" class="app-inp" type="number" min="0" max="100" step="0.01" />
            </div>
          </div>

          <div v-if="can('settings.update')" class="flex items-center gap-3">
            <button
              :disabled="isSavingGen"
              @click="saveGeneral"
              class="bg-green-700 hover:bg-green-800 text-bg-100 font-semibold text-sm px-4 py-2 rounded-lg transition-colors disabled:opacity-60 flex items-center gap-2"
            >
              <Icon v-if="isSavingGen" icon="lucide:loader-2" class="w-3.5 h-3.5 animate-spin" />
              {{ t('settings.general.saveChanges') }}
            </button>
            <span v-if="genSaved" class="text-xs text-green-400 flex items-center gap-1">
              <Icon icon="lucide:check" class="w-3.5 h-3.5" /> {{ t('settings.general.saved') }}
            </span>
          </div>
        </div>

        <!-- ─── Notifications ───────────────────────────────── -->
        <div v-if="activeTab === 'notifications'" class="bg-gray-200 border border-gray-400 rounded-xl p-5">
          <h3 class="text-sm font-semibold text-gray-1000 mb-4">{{ t('settings.notifications.title') }}</h3>
          <div v-for="group in notifGroups" :key="group.group" class="mb-5">
            <div class="text-[10px] font-semibold uppercase tracking-widest text-gray-700 mb-3">{{ group.group }}</div>
            <div v-for="item in group.items" :key="item.key" class="flex items-center justify-between py-3 border-b border-gray-400 last:border-0">
              <div class="flex-1 pr-4">
                <div class="text-sm text-gray-1000">{{ item.label }}</div>
                <div class="text-xs text-gray-700 mt-0.5">{{ item.desc }}</div>
              </div>
              <div class="flex items-center gap-4">
                <label class="flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" v-model="notifPrefs[item.key].email" class="accent-green-700 w-3.5 h-3.5" />
                  <span class="text-xs text-gray-700">{{ t('settings.notifications.email') }}</span>
                </label>
                <label v-if="!('emailOnly' in item && item.emailOnly)" class="flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" v-model="notifPrefs[item.key].in_app" class="accent-green-700 w-3.5 h-3.5" />
                  <span class="text-xs text-gray-700">{{ t('settings.notifications.inApp') }}</span>
                </label>
              </div>
            </div>
          </div>
          <div class="flex items-center gap-3 mt-4">
            <button
              :disabled="isSavingNotif"
              @click="saveNotifPrefs"
              class="bg-green-700 hover:bg-green-800 text-bg-100 font-semibold text-sm px-4 py-2 rounded-lg transition-colors disabled:opacity-60 flex items-center gap-2"
            >
              <Icon v-if="isSavingNotif" icon="lucide:loader-2" class="w-3.5 h-3.5 animate-spin" />
              {{ t('settings.notifications.save') }}
            </button>
            <span v-if="notifSaved" class="text-xs text-green-400 flex items-center gap-1">
              <Icon icon="lucide:check" class="w-3.5 h-3.5" /> {{ t('settings.general.saved') }}
            </span>
          </div>
        </div>

        <!-- ─── Security ────────────────────────────────────── -->
        <div v-if="activeTab === 'security'" class="bg-gray-200 border border-gray-400 rounded-xl p-5 space-y-5">
          <h3 class="text-sm font-semibold text-gray-1000">{{ t('settings.security.title') }}</h3>

          <!-- Two-Factor Authentication -->
          <div class="flex items-start justify-between py-4 border-b border-gray-400">
            <div class="flex-1 pr-4">
              <div class="text-sm font-medium text-gray-1000">{{ t('settings.security.twoFactor') }}</div>
              <div class="text-xs text-gray-700 mt-0.5">{{ t('settings.security.twoFactorDesc') }}</div>
            </div>
            <label class="app-toggle shrink-0">
              <input type="checkbox" v-model="settings.require_mfa" />
              <span class="app-toggle-track"></span>
            </label>
          </div>

          <!-- IP Allowlist -->
          <div>
            <div class="text-sm font-medium text-gray-1000 mb-1">{{ t('settings.security.ipAllowlist') }}</div>
            <div class="text-xs text-gray-700 mb-3">{{ t('settings.security.ipAllowlistDesc') }}</div>
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
              class="bg-green-700 hover:bg-green-800 text-bg-100 font-semibold text-sm px-4 py-2 rounded-lg transition-colors disabled:opacity-60 flex items-center gap-2"
            >
              <Icon v-if="isSavingSec" icon="lucide:loader-2" class="w-3.5 h-3.5 animate-spin" />
              {{ t('settings.security.save') }}
            </button>
            <span v-if="secSaved" class="text-xs text-green-400 flex items-center gap-1">
              <Icon icon="lucide:check" class="w-3.5 h-3.5" /> {{ t('settings.general.saved') }}
            </span>
          </div>
        </div>

        <!-- ─── API ─────────────────────────────────────────── -->
        <div v-if="activeTab === 'api'" class="space-y-4">
          <div class="bg-gray-200 border border-gray-400 rounded-xl p-5">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-sm font-semibold text-gray-1000">{{ t('settings.api.title') }}</h3>
              <button class="flex items-center gap-1.5 bg-green-700 hover:bg-green-800 text-bg-100 font-semibold text-xs px-3 py-1.5 rounded-lg transition-colors">
                <Icon icon="lucide:plus" class="w-3.5 h-3.5" /> {{ t('settings.api.generateKey') }}
              </button>
            </div>
            <div class="bg-green-700/5 border border-green-700/20 rounded-lg p-3 mb-4">
              <div class="flex items-center gap-2 mb-1">
                <Icon icon="lucide:zap" class="w-3.5 h-3.5 text-green-700" />
                <span class="text-xs font-medium text-green-700">{{ t('settings.api.planNote') }}</span>
              </div>
              <p class="text-xs text-gray-700">{{ t('settings.api.planDesc') }}</p>
            </div>
            <div class="space-y-3">
              <div v-for="key in apiKeys" :key="key.id" class="flex items-center gap-3 p-3 border border-gray-400 rounded-lg">
                <div class="flex-1 min-w-0">
                  <div class="text-sm font-medium text-gray-1000 mb-1">{{ key.name }}</div>
                  <div class="font-mono text-xs text-gray-700 bg-gray-100 px-2 py-1 rounded w-fit">{{ key.masked }}</div>
                </div>
                <div class="text-right shrink-0">
                  <span class="status-badge status-active text-[9px]">{{ t('settings.api.active') }}</span>
                  <div class="text-[10px] text-gray-700 mt-1">{{ t('settings.api.lastUsed', { when: key.lastUsed }) }}</div>
                </div>
                <button class="text-xs text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/15 px-2.5 py-1.5 rounded-md transition-colors shrink-0">
                  {{ t('settings.api.revoke') }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- AI tab -->
        <div v-if="activeTab === 'ai'">
          <AiCredentialsSection :org-id="orgId" :org-name="orgName || org?.name || ''" />
        </div>

      </div>
    </div>
  </div>
</template>
