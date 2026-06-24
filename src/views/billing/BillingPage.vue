<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Icon } from '@iconify/vue'
import { useAuthStore } from '@/stores/auth'
import { useSubscriptionStore } from '@/stores/subscription'
import { useNotification } from '@/composables/notification'
import { SubscriptionService, type ISubscriptionPlan, type ISubscriptionTransaction } from '@/services/subscription.service'

const route    = useRoute()
const router   = useRouter()
const auth     = useAuthStore()
const subStore = useSubscriptionStore()
const { notify } = useNotification()

const orgId = computed(() => auth.getCurrentOrganization?.id ?? '')

type BillingTab = 'plans' | 'history'
const activeTab = ref<BillingTab>('plans')

// ── Plans ────────────────────────────────────────────────────────────────────
const plans             = ref<ISubscriptionPlan[]>([])
const recommendedCurrency = ref<'NGN' | 'USD'>('USD')
const billingInterval   = ref<'monthly' | 'annual'>('monthly')
const selectedCurrency  = ref<'NGN' | 'USD'>('USD')
const isLoadingPlans    = ref(true)

// ── Subscription ─────────────────────────────────────────────────────────────
const isInitializing  = ref(false)
const isCancelling    = ref(false)
const showCancelModal = ref(false)

// ── Billing history ──────────────────────────────────────────────────────────
const transactions  = ref<ISubscriptionTransaction[]>([])
const txPage        = ref(1)
const txLastPage    = ref(1)
const isLoadingTx   = ref(false)

// ── Paystack callback handling ────────────────────────────────────────────────
const isVerifying = ref(false)

async function handleCallbackRef() {
  const ref = route.query.ref as string | undefined
  if (!ref || !orgId.value) return

  isVerifying.value = true
  router.replace({ query: {} })

  try {
    const res             = await SubscriptionService.verify(orgId.value, ref)
    subStore.subscription = res.data.data
    notify('Subscription activated successfully!', 'success')
    activeTab.value = 'plans'
  } catch (err: any) {
    notify(err?.response?.data?.message ?? 'Payment verification failed.', 'error')
  } finally {
    isVerifying.value = false
  }
}

async function loadPlans() {
  isLoadingPlans.value = true
  try {
    const country = navigator.language?.includes('-') ? navigator.language.split('-')[1] : undefined
    const res     = await SubscriptionService.getPlans(country)
    plans.value             = res.data.data.plans
    recommendedCurrency.value = res.data.data.recommended_currency
    selectedCurrency.value    = res.data.data.recommended_currency
  } catch {
    notify('Failed to load pricing plans.', 'error')
  } finally {
    isLoadingPlans.value = false
  }
}

async function loadTransactions() {
  if (!orgId.value) return
  isLoadingTx.value = true
  try {
    const res       = await SubscriptionService.getTransactions(orgId.value, txPage.value)
    transactions.value = res.data.data.data
    txLastPage.value   = res.data.data.last_page
  } catch {
    notify('Failed to load billing history.', 'error')
  } finally {
    isLoadingTx.value = false
  }
}

async function upgrade(planSlug: string) {
  if (!orgId.value) return
  isInitializing.value = true
  try {
    const res = await SubscriptionService.initialize(orgId.value, {
      plan:     planSlug,
      interval: billingInterval.value,
      currency: selectedCurrency.value,
      redirect_url: window.location.origin,
    })
    window.location.href = res.data.data.payment_url
  } catch (err: any) {
    notify(err?.response?.data?.message ?? 'Failed to initialize payment.', 'error')
    isInitializing.value = false
  }
}

async function cancelSubscription() {
  if (!orgId.value) return
  isCancelling.value = true
  try {
    const res             = await SubscriptionService.cancel(orgId.value)
    subStore.subscription = res.data.data
    showCancelModal.value = false
    notify('Subscription cancelled. Access continues until the end of your billing period.', 'success')
  } catch (err: any) {
    notify(err?.response?.data?.message ?? 'Failed to cancel subscription.', 'error')
  } finally {
    isCancelling.value = false
  }
}

watch(activeTab, (tab) => {
  if (tab === 'history' && transactions.value.length === 0) loadTransactions()
})

watch(txPage, loadTransactions)

onMounted(async () => {
  await Promise.all([loadPlans(), subStore.load()])
  handleCallbackRef()
})

// ── Helpers ──────────────────────────────────────────────────────────────────
const currentPlanSlug = computed(() => subStore.subscription?.plan?.slug ?? 'starter')

function planPrice(plan: ISubscriptionPlan): string {
  const prices = plan.prices[selectedCurrency.value]
  return billingInterval.value === 'annual' ? prices.annual_per_month : prices.monthly_display
}

function annualSaving(plan: ISubscriptionPlan): string | null {
  if (plan.is_free || billingInterval.value !== 'annual') return null
  const prices    = plan.prices[selectedCurrency.value]
  const monthly12 = prices.monthly * 12
  const annual    = prices.annual
  if (monthly12 === 0 || annual === 0) return null
  const pct = Math.round(((monthly12 - annual) / monthly12) * 100)
  return pct > 0 ? `Save ${pct}%` : null
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    active:    'bg-green-500/10 text-green-400 border-green-500/20',
    trial:     'bg-blue-500/10 text-blue-400 border-blue-500/20',
    past_due:  'bg-green-700/10 text-green-700 border-green-700/20',
    cancelled: 'bg-red-500/10 text-red-400 border-red-500/20',
    expired:   'bg-gray-500 text-gray-700 border-gray-500',
    pending:   'bg-green-700/10 text-green-700 border-green-700/20',
    completed: 'bg-green-500/10 text-green-400 border-green-500/20',
    failed:    'bg-red-500/10 text-red-400 border-red-500/20',
  }
  return 'text-[10px] font-semibold px-2 py-0.5 rounded-full border ' + (map[status] ?? map.expired)
}

function txTypeLabel(type: string) {
  const map: Record<string, string> = {
    new_subscription: 'New Subscription',
    renewal:          'Renewal',
    upgrade:          'Upgrade',
    downgrade:        'Downgrade',
  }
  return map[type] ?? type
}

function formatDate(dt: string) {
  return new Date(dt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function featureLabel(key: string, val: boolean | number | null): string {
  const labels: Record<string, string> = {
    invoices_per_month:       val === null ? 'Unlimited invoices'    : `${val} invoices/month`,
    receipts_per_month:       val === null ? 'Unlimited receipts'    : `${val} receipts/month`,
    letterheads_per_month:    val === null ? 'Unlimited letterheads' : `${val} letterheads/month`,
    projects_limit:           val === null ? 'Unlimited projects'    : `${val} active project`,
    team_members:             typeof val === 'number' && val > 1 ? `Up to ${val} team members` : 'Solo (1 member)',
    custom_branding:          'Custom branding & logo',
    remove_flowtali_branding: 'Remove Flowtali branding',
    all_currencies:           'All 11 currencies',
    all_letterhead_templates: 'All 8 letterhead templates',
    stamp_watermark:          'Stamps & watermarks',
    priority_support:         'Priority support',
    team_roles:               'Team roles & permissions',
    invoice_analytics:        'Invoice analytics',
  }
  return labels[key] ?? key.replace(/_/g, ' ')
}
</script>

<template>
  <div class="p-4 md:p-6 space-y-5 min-h-full">

    <!-- Verifying overlay -->
    <div v-if="isVerifying" class="fixed inset-0 bg-gray-100/80 flex items-center justify-center z-50">
      <div class="bg-gray-200 border border-gray-400 rounded-2xl p-8 flex flex-col items-center gap-4 text-center max-w-sm mx-4">
        <Icon icon="lucide:loader-2" class="w-8 h-8 text-green-700 animate-spin" />
        <div>
          <p class="text-gray-1000 font-semibold">Verifying payment…</p>
          <p class="text-gray-700 text-sm mt-1">Please wait while we confirm your payment with Paystack.</p>
        </div>
      </div>
    </div>

    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div>
        <h1 class="page-title">Billing</h1>
        <p class="page-subtitle">Manage your subscription and billing history</p>
      </div>

      <!-- Current plan badge -->
      <div v-if="subStore.subscription" class="flex items-center gap-2 bg-gray-200 border border-gray-400 rounded-xl px-4 py-2.5">
        <Icon icon="lucide:zap" class="w-4 h-4 text-green-700 shrink-0" />
        <div>
          <div class="text-xs text-gray-700">Current plan</div>
          <div class="text-sm font-semibold text-gray-1000 capitalize">{{ subStore.subscription.plan?.name ?? 'Starter' }}</div>
        </div>
        <span :class="statusBadge(subStore.subscription.status)" class="ml-2">
          {{ subStore.subscription.status }}
        </span>
      </div>
    </div>

    <!-- Active period banner (for paid plans) -->
    <div
      v-if="subStore.subscription?.current_period_end && !subStore.isStarter"
      class="bg-gray-200 border rounded-xl p-4 flex items-center justify-between gap-4"
      :class="subStore.subscription.status === 'cancelled' ? 'border-green-700/30' : 'border-gray-400'"
    >
      <div class="flex items-center gap-3">
        <Icon
          :icon="subStore.subscription.status === 'cancelled' ? 'lucide:alert-circle' : 'lucide:calendar-check'"
          class="w-4 h-4 shrink-0"
          :class="subStore.subscription.status === 'cancelled' ? 'text-green-700' : 'text-green-400'"
        />
        <div>
          <p class="text-sm text-gray-1000">
            <span v-if="subStore.subscription.status === 'cancelled'">
              Subscription cancelled — access until
            </span>
            <span v-else>
              {{ subStore.subscription.billing_interval === 'annual' ? 'Annual' : 'Monthly' }} plan renews on
            </span>
            <span class="font-semibold"> {{ formatDate(subStore.subscription.current_period_end) }}</span>
          </p>
          <p class="text-xs text-gray-700 mt-0.5">Billing currency: {{ subStore.subscription.billing_currency }}</p>
        </div>
      </div>
      <button
        v-if="subStore.subscription.status === 'active'"
        @click="showCancelModal = true"
        class="text-xs text-red-400 hover:text-red-300 transition-colors whitespace-nowrap shrink-0"
      >
        Cancel plan
      </button>
    </div>

    <!-- Tabs -->
    <div class="flex gap-1 bg-gray-200 border border-gray-400 rounded-xl p-1 w-fit">
      <button
        v-for="tab in [{ key: 'plans', label: 'Plans', icon: 'lucide:zap' }, { key: 'history', label: 'Billing History', icon: 'lucide:receipt' }]"
        :key="tab.key"
        @click="activeTab = tab.key as BillingTab"
        :class="[
          'flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-colors',
          activeTab === tab.key
            ? 'bg-gray-400 text-gray-1000'
            : 'text-gray-700 hover:text-gray-1000',
        ]"
      >
        <Icon :icon="tab.icon" class="w-3.5 h-3.5" />
        {{ tab.label }}
      </button>
    </div>

    <!-- ── PLANS TAB ────────────────────────────────────────────── -->
    <template v-if="activeTab === 'plans'">

      <!-- Controls -->
      <div class="flex flex-wrap items-center gap-3">
        <!-- Interval toggle -->
        <div class="flex items-center gap-2 bg-gray-200 border border-gray-400 rounded-lg p-1">
          <button
            v-for="iv in [{ key: 'monthly', label: 'Monthly' }, { key: 'annual', label: 'Annual' }]"
            :key="iv.key"
            @click="billingInterval = iv.key as 'monthly' | 'annual'"
            :class="[
              'px-3 py-1.5 rounded text-xs font-medium transition-colors',
              billingInterval === iv.key ? 'bg-green-700 text-bg-100' : 'text-gray-700 hover:text-gray-1000',
            ]"
          >
            {{ iv.label }}
            <span v-if="iv.key === 'annual'" class="ml-1 text-[10px] opacity-70">-17%</span>
          </button>
        </div>

        <!-- Currency toggle -->
        <div class="flex items-center gap-2 bg-gray-200 border border-gray-400 rounded-lg p-1">
          <button
            v-for="cur in ['USD', 'NGN']"
            :key="cur"
            @click="selectedCurrency = cur as 'USD' | 'NGN'"
            :class="[
              'px-3 py-1.5 rounded text-xs font-medium transition-colors',
              selectedCurrency === cur ? 'bg-gray-500 text-gray-1000' : 'text-gray-700 hover:text-gray-1000',
            ]"
          >
            {{ cur }}
            <span v-if="cur === recommendedCurrency" class="ml-1 text-[10px] text-green-700">(detected)</span>
          </button>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="isLoadingPlans" class="flex items-center justify-center py-16">
        <Icon icon="lucide:loader-2" class="w-6 h-6 text-gray-700 animate-spin" />
      </div>

      <!-- Plan grid -->
      <div v-else class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div
          v-for="plan in plans" :key="plan.slug"
          class="rounded-2xl p-6 border transition-all duration-200 relative"
          :class="[
            plan.slug === 'pro' ? 'border-green-700/30 bg-green-700/[0.03]' : 'bg-gray-200 border-gray-400',
            currentPlanSlug === plan.slug ? 'ring-1 ring-green-700/40' : '',
          ]"
        >
          <!-- Popular badge -->
          <div v-if="plan.slug === 'pro'" class="absolute -top-2.5 left-1/2 -translate-x-1/2">
            <span class="text-[10px] font-bold px-3 py-1 rounded-full bg-green-700 text-bg-100 whitespace-nowrap">Most popular</span>
          </div>

          <!-- Current plan badge -->
          <div v-if="currentPlanSlug === plan.slug" class="flex items-center gap-1.5 mb-3">
            <Icon icon="lucide:check-circle" class="w-3.5 h-3.5 text-green-400" />
            <span class="text-[11px] text-green-400 font-medium">Current plan</span>
          </div>

          <div class="mb-4">
            <h3 class="text-gray-1000 font-semibold text-base">{{ plan.name }}</h3>
            <p class="text-gray-700 text-xs mt-0.5">{{ plan.description }}</p>
          </div>

          <!-- Price -->
          <div class="mb-5">
            <div class="flex items-end gap-1">
              <span class="text-3xl font-bold text-gray-1000">
                {{ plan.is_free ? 'Free' : planPrice(plan) }}
              </span>
              <span v-if="!plan.is_free" class="text-gray-700 text-sm mb-0.5">/mo</span>
            </div>
            <div v-if="billingInterval === 'annual' && !plan.is_free" class="text-xs text-gray-700 mt-1">
              Billed {{ plan.prices[selectedCurrency].annual_display }}/year
              <span v-if="annualSaving(plan)" class="text-green-400 font-medium ml-1">{{ annualSaving(plan) }}</span>
            </div>
          </div>

          <!-- CTA -->
          <button
            v-if="currentPlanSlug !== plan.slug"
            @click="plan.is_free ? null : upgrade(plan.slug)"
            :disabled="isInitializing || plan.is_free"
            :class="[
              'w-full py-2.5 rounded-lg text-sm font-semibold transition-colors mb-5',
              plan.slug === 'pro'
                ? 'bg-green-700 hover:bg-green-800 text-bg-100 disabled:opacity-50'
                : 'bg-gray-400 hover:bg-gray-500 text-gray-1000 disabled:opacity-50',
            ]"
          >
            <Icon v-if="isInitializing" icon="lucide:loader-2" class="w-3.5 h-3.5 animate-spin inline mr-1.5" />
            {{ plan.is_free ? 'Downgrade to Free' : `Upgrade to ${plan.name}` }}
          </button>
          <div v-else class="w-full py-2.5 rounded-lg text-sm text-center text-gray-700 border border-gray-500 mb-5 cursor-default">
            Current plan
          </div>

          <div class="border-t border-gray-400 pt-4 space-y-2.5">
            <template v-for="(val, key) in plan.features" :key="key">
              <div class="flex items-center gap-2 text-xs">
                <Icon
                  :icon="val === false || val === 0 ? 'lucide:x' : 'lucide:check'"
                  :class="val === false || val === 0 ? 'text-gray-500' : 'text-green-400'"
                  class="w-3.5 h-3.5 shrink-0"
                />
                <span :class="val === false || val === 0 ? 'text-gray-700/50' : 'text-gray-900'">
                  {{ featureLabel(String(key), val) }}
                </span>
              </div>
            </template>
          </div>
        </div>
      </div>
    </template>

    <!-- ── HISTORY TAB ──────────────────────────────────────────── -->
    <template v-else-if="activeTab === 'history'">
      <div v-if="isLoadingTx" class="flex items-center justify-center py-16">
        <Icon icon="lucide:loader-2" class="w-6 h-6 text-gray-700 animate-spin" />
      </div>

      <div v-else-if="transactions.length === 0" class="flex flex-col items-center justify-center py-16 text-center">
        <div class="w-12 h-12 rounded-full bg-gray-400 flex items-center justify-center mb-4">
          <Icon icon="lucide:receipt" class="w-6 h-6 text-gray-700" />
        </div>
        <p class="text-gray-700 text-sm">No billing history yet</p>
        <p class="text-gray-700/60 text-xs mt-1">Your payment history will appear here after your first upgrade.</p>
      </div>

      <div v-else class="bg-gray-200 border border-gray-400 rounded-xl overflow-hidden">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-gray-400">
              <th class="text-left text-[11px] text-gray-700 font-medium px-5 py-3">Date</th>
              <th class="text-left text-[11px] text-gray-700 font-medium px-5 py-3">Type</th>
              <th class="text-left text-[11px] text-gray-700 font-medium px-5 py-3">Reference</th>
              <th class="text-right text-[11px] text-gray-700 font-medium px-5 py-3">Amount</th>
              <th class="text-right text-[11px] text-gray-700 font-medium px-5 py-3">Status</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-400">
            <tr v-for="tx in transactions" :key="tx.id" class="hover:bg-gray-400/30 transition-colors">
              <td class="px-5 py-3.5 text-xs text-gray-700">{{ formatDate(tx.created_at) }}</td>
              <td class="px-5 py-3.5 text-xs text-gray-1000">{{ txTypeLabel(tx.type) }}</td>
              <td class="px-5 py-3.5">
                <span class="text-[11px] text-gray-700 font-mono">{{ tx.tx_ref }}</span>
              </td>
              <td class="px-5 py-3.5 text-right text-sm font-semibold text-gray-1000">{{ tx.formatted_amount }}</td>
              <td class="px-5 py-3.5 text-right">
                <span :class="statusBadge(tx.status)">{{ tx.status }}</span>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Pagination -->
        <div v-if="txLastPage > 1" class="flex items-center justify-between px-5 py-3 border-t border-gray-400">
          <button
            :disabled="txPage <= 1"
            @click="txPage--"
            class="text-xs text-gray-700 hover:text-gray-1000 disabled:opacity-30 transition-colors"
          >← Prev</button>
          <span class="text-xs text-gray-700">Page {{ txPage }} of {{ txLastPage }}</span>
          <button
            :disabled="txPage >= txLastPage"
            @click="txPage++"
            class="text-xs text-gray-700 hover:text-gray-1000 disabled:opacity-30 transition-colors"
          >Next →</button>
        </div>
      </div>
    </template>

    <!-- ── Cancel modal ─────────────────────────────────────────── -->
    <Teleport to="body">
      <div v-if="showCancelModal" class="fixed inset-0 bg-gray-100/70 flex items-center justify-center z-50 p-4">
        <div class="bg-gray-200 border border-gray-400 rounded-2xl p-6 max-w-sm w-full space-y-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
              <Icon icon="lucide:alert-triangle" class="w-5 h-5 text-red-400" />
            </div>
            <div>
              <h3 class="text-gray-1000 font-semibold text-sm">Cancel subscription?</h3>
              <p class="text-gray-700 text-xs mt-0.5">You'll keep access until your current period ends.</p>
            </div>
          </div>
          <p class="text-gray-700 text-xs leading-relaxed">
            After cancellation, your account will automatically downgrade to the Starter plan at the end of your billing period. You will not be charged again.
          </p>
          <div class="flex gap-3 pt-1">
            <button
              @click="showCancelModal = false"
              class="flex-1 py-2 rounded-lg bg-gray-400 hover:bg-gray-500 text-gray-900 text-sm transition-colors"
            >
              Keep plan
            </button>
            <button
              @click="cancelSubscription"
              :disabled="isCancelling"
              class="flex-1 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-sm font-semibold transition-colors disabled:opacity-50"
            >
              <Icon v-if="isCancelling" icon="lucide:loader-2" class="w-3.5 h-3.5 animate-spin inline mr-1" />
              {{ isCancelling ? 'Cancelling…' : 'Yes, cancel' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

