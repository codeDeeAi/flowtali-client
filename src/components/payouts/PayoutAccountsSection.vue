<script setup lang="ts">
/**
 * Where an org gets paid when a client pays an invoice online.
 *
 * Naira settles through a Paystack subaccount (bank + account number, live at
 * once). Everything else settles through a Bachs connected account, which the
 * org finishes on Bachs's hosted onboarding — Flowtali never sees that bank.
 * The Flowtali fee is stated up front and has to be accepted before adding.
 */
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Icon } from '@iconify/vue'
import { useNotification } from '@/composables/notification'
import { SubAccountService, apiError } from '@/services/payout.service'
import type { ISubAccount, ISubAccountCreateData, PayoutProvider } from '@/types/payout.types'

const props = defineProps<{ orgId: string }>()

const { t } = useI18n()
const { notify } = useNotification()
const route = useRoute()
const router = useRouter()

const loading    = ref(true)
const forbidden  = ref(false)
const accounts   = ref<ISubAccount[]>([])
const createData = ref<ISubAccountCreateData | null>(null)
const busyId     = ref<string | null>(null)

const feePercent = computed(() => createData.value?.platform_fee_percent ?? 0.5)
const fmtFee = (n: number) => `${Number(n).toLocaleString(undefined, { maximumFractionDigits: 2 })}%`

// ── Form ──────────────────────────────────────────────────────────────────────
const showForm   = ref(false)
const saving     = ref(false)
const provider   = ref<PayoutProvider>('paystack')
const acceptFee  = ref(false)
const formError  = ref('')
const form = ref<Record<string, string>>({})

const resolving    = ref(false)
const resolvedName = ref('')

const providerInfo = computed(() => createData.value?.providers.find(p => p.provider === provider.value))
const fieldOptions = (name: string) => providerInfo.value?.fields.find(f => f.name === name)?.options ?? []
const hasLiveBachs = computed(() => accounts.value.some(a => a.provider === 'bachs' && a.status !== 'inactive'))

const canSubmit = computed(() => {
  if (!acceptFee.value || saving.value) return false
  if (provider.value === 'paystack') return !!resolvedName.value
  return !!form.value.country && !!form.value.entity_type && !!form.value.contact_email?.trim()
})

function openForm() {
  provider.value = hasLiveBachs.value ? 'paystack' : provider.value
  resetForm()
  showForm.value = true
}

function resetForm() {
  form.value = provider.value === 'paystack'
    ? { bank_code: '', account_number: '', label: '' }
    : { country: '', entity_type: 'company', contact_email: '', label: '' }
  acceptFee.value = false
  resolvedName.value = ''
  formError.value = ''
}

watch(provider, resetForm)

// Look the account up as soon as there is enough to look up — the org sees the
// bank's name for it before committing, which is what catches a typo.
watch(() => [form.value.bank_code, form.value.account_number], async ([bank, number]) => {
  resolvedName.value = ''
  formError.value = ''
  if (provider.value !== 'paystack' || !bank || !/^\d{10}$/.test(number ?? '')) return
  resolving.value = true
  try {
    const { data } = await SubAccountService.resolve(props.orgId, { provider: 'paystack', bank_code: bank, account_number: number! })
    resolvedName.value = data.data.account_name
  } catch (err) {
    formError.value = apiError(err).message ?? t('orgPref.payouts.resolveFailed')
  } finally {
    resolving.value = false
  }
})

async function save() {
  if (!canSubmit.value) return
  saving.value = true
  formError.value = ''
  try {
    const { data } = await SubAccountService.create(props.orgId, {
      provider: provider.value,
      accept_fee: acceptFee.value,
      ...form.value,
    })
    accounts.value.unshift(data.data)
    showForm.value = false
    notify(t('orgPref.payouts.added'), 'success')
    if (data.data.requires_onboarding) await continueOnboarding(data.data)
  } catch (err) {
    formError.value = apiError(err).message ?? t('orgPref.payouts.addFailed')
  } finally {
    saving.value = false
  }
}

// ── Account actions ───────────────────────────────────────────────────────────
async function continueOnboarding(account: ISubAccount) {
  busyId.value = account.id
  try {
    const { data } = await SubAccountService.onboardingLink(props.orgId, account.id)
    window.location.href = data.data.url
  } catch (err) {
    notify(apiError(err).message ?? t('orgPref.payouts.onboardingFailed'), 'error')
    busyId.value = null
  }
}

async function refresh(account: ISubAccount, quiet = false) {
  busyId.value = account.id
  try {
    const { data } = await SubAccountService.sync(props.orgId, account.id)
    replace(data.data)
    if (!quiet) notify(data.data.status === 'active' ? t('orgPref.payouts.nowActive') : t('orgPref.payouts.stillPending'), data.data.status === 'active' ? 'success' : 'info')
  } catch (err) {
    if (!quiet) notify(apiError(err).message ?? t('orgPref.payouts.refreshFailed'), 'error')
  } finally {
    busyId.value = null
  }
}

async function deactivate(account: ISubAccount) {
  if (!window.confirm(t('orgPref.payouts.confirmDeactivate', { label: account.label }))) return
  busyId.value = account.id
  try {
    const { data } = await SubAccountService.deactivate(props.orgId, account.id)
    replace(data.data)
  } catch (err) {
    notify(apiError(err).message ?? t('orgPref.payouts.deactivateFailed'), 'error')
  } finally {
    busyId.value = null
  }
}

function replace(account: ISubAccount) {
  const i = accounts.value.findIndex(a => a.id === account.id)
  if (i >= 0) accounts.value[i] = account
}

// ── Load + Bachs return / refresh handling ──────────────────────────────────
async function load() {
  if (!props.orgId) return
  loading.value = true
  try {
    const [list, meta] = await Promise.all([
      SubAccountService.list(props.orgId),
      SubAccountService.createData(props.orgId),
    ])
    accounts.value = list.data.data
    createData.value = meta.data.data
  } catch (err) {
    forbidden.value = apiError(err).status === 403
  } finally {
    loading.value = false
  }

  await handleOnboardingReturn()
}

/**
 * Bachs sends the org back with ?payout_return=<id> when it leaves the hosted
 * flow, or ?payout_refresh=<id> when the link it used had expired.
 */
async function handleOnboardingReturn() {
  const returned = route.query.payout_return as string | undefined
  const expired  = route.query.payout_refresh as string | undefined
  const account  = accounts.value.find(a => a.id === (returned ?? expired))
  if (!account) return

  const rest = { ...route.query }
  delete rest.payout_return
  delete rest.payout_refresh
  router.replace({ query: rest })

  if (expired) await continueOnboarding(account)
  else await refresh(account)
}

onMounted(load)

const statusClass: Record<string, string> = {
  active:   'bg-green-700/15 text-green-700',
  pending:  'bg-amber-500/15 text-amber-500',
  inactive: 'bg-gray-400 text-gray-700',
}
</script>

<template>
  <div v-if="!forbidden" class="bg-gray-200 border border-gray-400 rounded-xl p-5 lg:col-span-2">
    <div class="flex items-center justify-between mb-3">
      <div>
        <h3 class="text-sm font-semibold text-gray-1000">{{ t('orgPref.payouts.title') }}</h3>
        <p class="text-[11px] text-gray-700 mt-0.5">{{ t('orgPref.payouts.subtitle') }}</p>
      </div>
      <button
        class="flex items-center gap-1.5 text-xs text-gray-900 hover:text-gray-1000 bg-gray-400 hover:bg-gray-500 px-2.5 py-1.5 rounded-md transition-colors shrink-0"
        :disabled="loading"
        @click="openForm"
      >
        <Icon icon="lucide:plus" class="w-3 h-3" /> {{ t('orgPref.payouts.add') }}
      </button>
    </div>

    <!-- Fee, stated before anything else -->
    <div class="flex items-start gap-2 p-3 mb-4 rounded-lg border border-green-700/30 bg-green-700/5">
      <Icon icon="lucide:percent" class="w-3.5 h-3.5 text-green-700 mt-0.5 shrink-0" />
      <p class="text-[11.5px] text-gray-900 leading-relaxed">
        {{ t('orgPref.payouts.feeNotice', { fee: fmtFee(feePercent) }) }}
      </p>
    </div>

    <div v-if="loading" class="space-y-2">
      <div v-for="i in 2" :key="i" class="h-14 bg-gray-400 rounded-lg animate-pulse" />
    </div>

    <div v-else class="space-y-2">
      <div
        v-for="account in accounts" :key="account.id"
        class="flex items-center gap-3 p-3.5 border border-gray-400 rounded-lg"
        :class="account.status === 'inactive' ? 'opacity-60' : ''"
      >
        <div class="w-8 h-8 rounded-lg bg-gray-400 flex items-center justify-center shrink-0">
          <Icon :icon="account.provider === 'paystack' ? 'lucide:landmark' : 'lucide:globe'" class="w-4 h-4 text-green-700" />
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 flex-wrap">
            <span class="text-sm font-semibold text-gray-1000 truncate">{{ account.label }}</span>
            <span class="text-[10px] font-medium px-1.5 py-0.5 rounded" :class="statusClass[account.status]">
              {{ t(`orgPref.payouts.status.${account.status}`) }}
            </span>
          </div>
          <div class="text-[11px] text-gray-700 truncate">
            <span class="text-green-700/80 font-medium">{{ account.provider === 'paystack' ? 'Paystack' : 'Bachs' }}</span>
            <span class="mx-1">·</span>
            <span>{{ account.chargeable_currencies.join(', ') }}</span>
            <template v-if="account.account_name">
              <span class="mx-1">·</span>{{ account.account_name }}
              <span v-if="account.account_last4" class="font-mono"> ••{{ account.account_last4 }}</span>
            </template>
            <span class="mx-1">·</span>
            <span>{{ t('orgPref.payouts.feeShort', { fee: fmtFee(account.platform_fee_percent) }) }}</span>
          </div>
          <div v-if="account.status === 'pending' && account.requirements_due.length" class="text-[10.5px] text-amber-500 mt-0.5">
            {{ t('orgPref.payouts.requirementsDue', { n: account.requirements_due.length }) }}
          </div>
        </div>

        <div class="flex items-center gap-1.5 shrink-0">
          <Icon v-if="busyId === account.id" icon="lucide:loader-2" class="w-4 h-4 text-gray-700 animate-spin" />
          <template v-else-if="account.status !== 'inactive'">
            <button
              v-if="account.requires_onboarding"
              class="text-[11px] bg-green-700 hover:bg-green-800 text-bg-100 font-semibold px-2.5 py-1 rounded-md transition-colors"
              @click="continueOnboarding(account)"
            >{{ t('orgPref.payouts.continueOnboarding') }}</button>
            <button
              v-if="account.provider === 'bachs'"
              class="w-6 h-6 flex items-center justify-center rounded text-gray-700 hover:text-gray-1000 hover:bg-gray-400 transition-colors"
              :title="t('orgPref.payouts.refresh')"
              @click="refresh(account)"
            ><Icon icon="lucide:refresh-cw" class="w-3.5 h-3.5" /></button>
            <button
              class="w-6 h-6 flex items-center justify-center rounded text-gray-700 hover:text-red-400 hover:bg-red-500/10 transition-colors"
              :title="t('orgPref.payouts.deactivate')"
              @click="deactivate(account)"
            ><Icon icon="lucide:power" class="w-3.5 h-3.5" /></button>
          </template>
        </div>
      </div>

      <div v-if="!accounts.length && !showForm" class="text-center py-6 text-xs text-gray-700">
        {{ t('orgPref.payouts.empty') }}
      </div>
    </div>

    <!-- Add form -->
    <Transition name="slide-down">
      <div v-if="showForm" class="mt-4 p-4 bg-gray-100 border border-gray-500 rounded-lg space-y-3">
        <div class="flex items-center justify-between">
          <span class="text-xs font-medium text-gray-1000">{{ t('orgPref.payouts.formNew') }}</span>
          <button class="text-gray-700 hover:text-gray-1000" @click="showForm = false">
            <Icon icon="lucide:x" class="w-4 h-4" />
          </button>
        </div>

        <!-- Provider -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button
            v-for="p in (['paystack', 'bachs'] as const)" :key="p"
            type="button"
            class="text-left p-3 rounded-lg border transition-colors disabled:opacity-50"
            :class="provider === p ? 'border-green-700 bg-green-700/5' : 'border-gray-500 hover:border-gray-600'"
            :disabled="p === 'bachs' && hasLiveBachs"
            @click="provider = p"
          >
            <div class="text-xs font-semibold text-gray-1000">{{ t(`orgPref.payouts.providers.${p}.title`) }}</div>
            <div class="text-[11px] text-gray-700 mt-0.5">{{ t(`orgPref.payouts.providers.${p}.body`) }}</div>
            <div v-if="p === 'bachs' && hasLiveBachs" class="text-[10.5px] text-amber-500 mt-1">{{ t('orgPref.payouts.providers.bachs.exists') }}</div>
          </button>
        </div>

        <!-- Paystack -->
        <div v-if="provider === 'paystack'" class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="text-xs text-gray-700 mb-1 block">{{ t('orgPref.payouts.fields.bank') }} <span class="text-red-400">*</span></label>
            <select v-model="form.bank_code" class="app-select w-full text-sm">
              <option value="" disabled>{{ t('orgPref.payouts.fields.bankPh') }}</option>
              <option v-for="o in fieldOptions('bank_code')" :key="o.value" :value="o.value">{{ o.label }}</option>
            </select>
          </div>
          <div>
            <label class="text-xs text-gray-700 mb-1 block">{{ t('orgPref.payouts.fields.accountNumber') }} <span class="text-red-400">*</span></label>
            <input v-model="form.account_number" type="text" inputmode="numeric" maxlength="10" placeholder="0123456789" class="app-inp w-full text-sm font-mono" />
          </div>
          <div class="sm:col-span-2 text-[11.5px] min-h-[18px]">
            <span v-if="resolving" class="text-gray-700 inline-flex items-center gap-1.5"><Icon icon="lucide:loader-2" class="w-3 h-3 animate-spin" /> {{ t('orgPref.payouts.resolving') }}</span>
            <span v-else-if="resolvedName" class="text-green-700 inline-flex items-center gap-1.5"><Icon icon="lucide:badge-check" class="w-3.5 h-3.5" /> {{ resolvedName }}</span>
          </div>
        </div>

        <!-- Bachs -->
        <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="text-xs text-gray-700 mb-1 block">{{ t('orgPref.payouts.fields.country') }} <span class="text-red-400">*</span></label>
            <select v-model="form.country" class="app-select w-full text-sm">
              <option value="" disabled>{{ t('orgPref.payouts.fields.countryPh') }}</option>
              <option v-for="o in fieldOptions('country')" :key="o.value" :value="o.value">{{ o.label }}</option>
            </select>
          </div>
          <div>
            <label class="text-xs text-gray-700 mb-1 block">{{ t('orgPref.payouts.fields.entityType') }} <span class="text-red-400">*</span></label>
            <select v-model="form.entity_type" class="app-select w-full text-sm">
              <option value="company">{{ t('orgPref.payouts.fields.company') }}</option>
              <option value="individual">{{ t('orgPref.payouts.fields.individual') }}</option>
            </select>
          </div>
          <div class="sm:col-span-2">
            <label class="text-xs text-gray-700 mb-1 block">{{ t('orgPref.payouts.fields.contactEmail') }} <span class="text-red-400">*</span></label>
            <input v-model="form.contact_email" type="email" class="app-inp w-full text-sm" />
          </div>
          <p class="sm:col-span-2 text-[11px] text-gray-700 leading-relaxed">{{ t('orgPref.payouts.providers.bachs.onboardingNote') }}</p>
        </div>

        <div>
          <label class="text-xs text-gray-700 mb-1 block">{{ t('orgPref.payouts.fields.label') }}</label>
          <input v-model="form.label" type="text" :placeholder="t('orgPref.payouts.fields.labelPh')" class="app-inp w-full text-sm" />
        </div>

        <!-- Fee consent -->
        <label class="flex items-start gap-2 p-3 rounded-lg border border-gray-500 cursor-pointer">
          <input v-model="acceptFee" type="checkbox" class="mt-0.5 accent-green-700" />
          <span class="text-[11.5px] text-gray-900 leading-relaxed">
            {{ t('orgPref.payouts.acceptFee', { fee: fmtFee(feePercent), processor: provider === 'paystack' ? 'Paystack' : 'Bachs' }) }}
          </span>
        </label>

        <p v-if="formError" class="text-xs text-red-400">{{ formError }}</p>

        <div class="flex justify-end gap-2 pt-1">
          <button class="text-xs text-gray-900 hover:text-gray-1000 px-3 py-1.5 rounded-md hover:bg-gray-400 transition-colors" @click="showForm = false">{{ t('orgPref.common.cancel') }}</button>
          <button
            class="text-xs bg-green-700 hover:bg-green-800 text-bg-100 font-semibold px-3 py-1.5 rounded-md transition-colors disabled:opacity-50"
            :disabled="!canSubmit"
            @click="save"
          >{{ saving ? t('orgPref.common.saving') : (provider === 'bachs' ? t('orgPref.payouts.saveAndOnboard') : t('orgPref.payouts.save')) }}</button>
        </div>
      </div>
    </Transition>
  </div>
</template>
