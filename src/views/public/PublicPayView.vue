<script setup lang="ts">
/**
 * The page a client lands on from an invoice's "Pay online" link.
 *
 * Shows who is asking and for how much, takes an email for the receipt, and
 * hands off to the gateway's hosted checkout. On the way back (?reference=…)
 * it asks the API — never the redirect — whether the payment went through.
 */
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Icon } from '@iconify/vue'
import FlowtaliLogo from '@/components/ui/FlowtaliLogo.vue'
import { PayLinkService, apiError } from '@/services/payout.service'
import type { IPayLinkSummary } from '@/types/payout.types'

const route = useRoute()
const { t, locale } = useI18n()
const token = route.params.token as string

const loading  = ref(true)
const missing  = ref(false)
const summary  = ref<IPayLinkSummary | null>(null)
const outcome  = ref<'succeeded' | 'pending' | 'failed' | null>(null)
const checking = ref(false)

const email    = ref('')
const name     = ref('')
const starting = ref(false)
const error    = ref('')
const cancelled = ref(route.query.cancelled === '1')

const accent = computed(() => summary.value?.invoice.accent_color || '#00a344')
const inv = computed(() => summary.value?.invoice)
const isPaid = computed(() => outcome.value === 'succeeded' || inv.value?.status === 'paid')

const money = (amount: number, currency: string) =>
  new Intl.NumberFormat(locale.value, { style: 'currency', currency }).format(amount)

const formatDate = (d: string | null | undefined) =>
  d ? new Date(d.slice(0, 10) + 'T00:00:00').toLocaleDateString(locale.value, { year: 'numeric', month: 'long', day: 'numeric' }) : ''

onMounted(async () => {
  try {
    const reference = route.query.reference as string | undefined
    if (reference && !cancelled.value) {
      checking.value = true
      const { data } = await PayLinkService.verify(token, reference)
      outcome.value = data.data.status
      summary.value = data.data.summary
    } else {
      const { data } = await PayLinkService.get(token)
      summary.value = data.data
    }
    email.value = summary.value?.invoice.to_email ?? ''
    name.value = summary.value?.invoice.to_name ?? ''
  } catch {
    missing.value = true
  } finally {
    loading.value = false
    checking.value = false
  }
})

async function pay() {
  error.value = ''
  if (!/^\S+@\S+\.\S+$/.test(email.value.trim())) {
    error.value = t('pay.emailInvalid')
    return
  }
  starting.value = true
  try {
    const { data } = await PayLinkService.start(token, { email: email.value.trim(), name: name.value.trim() || undefined })
    window.location.href = data.data.checkout_url
  } catch (err) {
    error.value = apiError(err).message ?? t('pay.startFailed')
    starting.value = false
  }
}

async function checkAgain() {
  const reference = route.query.reference as string | undefined
  if (!reference) return
  checking.value = true
  try {
    const { data } = await PayLinkService.verify(token, reference)
    outcome.value = data.data.status
    summary.value = data.data.summary
  } finally {
    checking.value = false
  }
}

</script>

<template>
  <div class="min-h-screen bg-gray-100 flex flex-col">
    <header class="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shrink-0">
      <FlowtaliLogo variant="full" :size="16" theme="light" />
      <span class="flex items-center gap-1.5 text-xs text-gray-500"><Icon icon="lucide:lock" class="w-3.5 h-3.5" /> {{ t('pay.secure') }}</span>
    </header>

    <main class="flex-1 flex items-start sm:items-center justify-center p-4 sm:p-6">
      <div v-if="loading" class="py-24">
        <Icon icon="lucide:loader-2" class="w-6 h-6 text-gray-400 animate-spin" />
        <p v-if="checking" class="text-xs text-gray-500 mt-3">{{ t('pay.checking') }}</p>
      </div>

      <div v-else-if="missing" class="text-center max-w-sm py-16">
        <div class="w-14 h-14 rounded-2xl bg-gray-200 flex items-center justify-center mx-auto mb-4">
          <Icon icon="lucide:link-2-off" class="w-7 h-7 text-gray-400" />
        </div>
        <h2 class="text-lg font-semibold text-gray-800 mb-2">{{ t('pay.missingTitle') }}</h2>
        <p class="text-sm text-gray-500 leading-relaxed">{{ t('pay.missingBody') }}</p>
      </div>

      <div v-else-if="summary && inv" class="w-full max-w-md bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden">
        <div class="h-1.5" :style="{ background: accent }"></div>

        <div class="p-6 sm:p-8 space-y-6">
          <!-- Who is asking -->
          <div class="flex items-center gap-3">
            <img v-if="inv.logo_url" :src="inv.logo_url" alt="" class="h-10 w-10 rounded-lg object-contain border border-gray-100" />
            <div class="min-w-0">
              <p class="text-xs text-gray-500">{{ t('pay.from') }}</p>
              <p class="text-sm font-semibold text-gray-800 truncate">{{ inv.from_name }}</p>
            </div>
            <span class="ml-auto text-xs font-mono text-gray-500 shrink-0">#{{ inv.number }}</span>
          </div>

          <!-- Amount -->
          <div class="text-center py-2">
            <p class="text-xs uppercase tracking-wider text-gray-500">{{ isPaid ? t('pay.paidAmount') : t('pay.amountDue') }}</p>
            <p class="text-3xl font-bold text-gray-900 mt-1 font-mono">{{ money(inv.total, inv.currency) }}</p>
            <p v-if="inv.due_date && !isPaid" class="text-xs text-gray-500 mt-1">{{ t('pay.due', { date: formatDate(inv.due_date) }) }}</p>
            <p v-if="summary.charge?.converted && !isPaid" class="text-xs text-gray-600 mt-3 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
              {{ t('pay.converted', { amount: money(summary.charge.amount, summary.charge.currency), from: inv.currency, to: summary.charge.currency, rate: summary.charge.fx_rate }) }}
            </p>
          </div>

          <!-- Outcomes -->
          <div v-if="isPaid" class="text-center space-y-2">
            <div class="w-12 h-12 rounded-full bg-green-50 border border-green-200 flex items-center justify-center mx-auto">
              <Icon icon="lucide:check" class="w-6 h-6 text-green-600" />
            </div>
            <p class="text-sm font-semibold text-gray-800">{{ t('pay.successTitle') }}</p>
            <p class="text-xs text-gray-500">{{ outcome === 'succeeded' ? t('pay.successBody') : t('pay.alreadyPaid') }}</p>
          </div>

          <div v-else-if="outcome === 'pending'" class="text-center space-y-3">
            <Icon icon="lucide:clock" class="w-8 h-8 text-amber-500 mx-auto" />
            <p class="text-sm font-semibold text-gray-800">{{ t('pay.pendingTitle') }}</p>
            <p class="text-xs text-gray-500">{{ t('pay.pendingBody') }}</p>
            <button class="text-xs font-medium text-gray-700 border border-gray-300 rounded-lg px-3 py-1.5 hover:bg-gray-50 inline-flex items-center gap-1.5" :disabled="checking" @click="checkAgain">
              <Icon :icon="checking ? 'lucide:loader-2' : 'lucide:refresh-cw'" class="w-3.5 h-3.5" :class="checking ? 'animate-spin' : ''" /> {{ t('pay.checkAgain') }}
            </button>
          </div>

          <div v-else-if="!summary.payable" class="text-center text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded-lg p-4">
            {{ t(`pay.reasons.${summary.reason ?? 'unavailable'}`) }}
          </div>

          <!-- Pay form -->
          <form v-else class="space-y-3" @submit.prevent="pay">
            <div v-if="outcome === 'failed' || cancelled" class="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              {{ outcome === 'failed' ? t('pay.failed') : t('pay.cancelled') }}
            </div>
            <div class="space-y-1">
              <label class="text-xs font-medium text-gray-600">{{ t('pay.email') }} <span class="text-red-500">*</span></label>
              <input v-model="email" type="email" required autocomplete="email" class="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-gray-500 text-gray-800" />
            </div>
            <div class="space-y-1">
              <label class="text-xs font-medium text-gray-600">{{ t('pay.name') }}</label>
              <input v-model="name" type="text" autocomplete="name" class="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-gray-500 text-gray-800" />
            </div>
            <p v-if="error" class="text-xs text-red-500">{{ error }}</p>
            <button
              type="submit"
              :disabled="starting"
              class="w-full py-3 text-sm font-semibold text-white rounded-lg transition-opacity disabled:opacity-60 flex items-center justify-center gap-2"
              :style="{ background: accent }"
            >
              <Icon v-if="starting" icon="lucide:loader-2" class="w-4 h-4 animate-spin" />
              {{ t('pay.payButton', { amount: money(summary.charge?.amount ?? inv.total, summary.charge?.currency ?? inv.currency) }) }}
            </button>
            <p class="text-[11px] text-gray-400 text-center">
              {{ t('pay.processedBy', { provider: summary.provider === 'paystack' ? 'Paystack' : 'Bachs' }) }}
            </p>
          </form>
        </div>
      </div>
    </main>

    <p class="text-xs text-gray-400 text-center pb-6">{{ t('pay.footer') }}</p>
  </div>
</template>
