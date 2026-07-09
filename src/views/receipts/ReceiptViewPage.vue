<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Icon } from '@iconify/vue'
import { useNotification } from '@/composables/notification.ts'
import { useAuthStore } from '@/stores/auth'
import { ReceiptService, ReceiptSharedLinksService, type IReceipt, type IReceiptSharedLink } from '@/services/receipt.service'
import ShareLinkModal from '@/components/modals/ShareLinkModal.vue'

const router     = useRouter()
const route      = useRoute()
const { t, locale } = useI18n()
const { notify } = useNotification()
const authStore  = useAuthStore()
const orgId      = computed(() => authStore.getCurrentOrganization?.id ?? '')
const showShareModal = ref(false)

const receipt  = ref<IReceipt | null>(null)
const links    = ref<IReceiptSharedLink[]>([])
const loading  = ref(true)
const notFound = ref(false)
const showDeleteConfirm = ref(false)
const isDeleting        = ref(false)
const isFinalizing      = ref(false)

onMounted(async () => {
  if (!orgId.value) return
  const id = route.params.id as string
  try {
    const [recRes, linksRes] = await Promise.all([
      ReceiptService.get(orgId.value, id),
      ReceiptSharedLinksService.list(orgId.value, id),
    ])
    receipt.value = recRes.data.data
    links.value   = linksRes.data.data
  } catch {
    notFound.value = true
  } finally {
    loading.value = false
  }
})

async function refreshLinks() {
  if (!receipt.value) return
  try {
    const res = await ReceiptSharedLinksService.list(orgId.value, receipt.value.id)
    links.value = res.data.data
  } catch {}
}

const symMap: Record<string, string> = { USD: '$', EUR: '€', GBP: '£', NGN: '₦', CAD: 'CA$', AUD: 'A$', JPY: '¥', INR: '₹', ZAR: 'R', CHF: 'Fr', AED: 'د.إ' }
const sym     = computed(() => receipt.value ? (symMap[receipt.value.currency] ?? '$') : '$')
const fmtMoney = (n: number) => sym.value + n.toLocaleString(locale.value, { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const formatDate = (d: string | null) => {
  if (!d) return '—'
  const [y = '0', m = '1', day = '1'] = d.split('-')
  return new Date(+y, +m - 1, +day).toLocaleDateString(locale.value, { year: 'numeric', month: 'long', day: 'numeric' })
}

const statusClass: Record<string, string> = {
  finalized: 'status-paid', draft: 'status-draft', void: 'status-draft',
}
const statusLabel = (status: string) => t(`common.status.${status}`)

const totalViews  = computed(() => links.value.reduce((s, l) => s + l.views, 0))
const activeLinks = computed(() => links.value.filter(l => l.is_active && !(l.expires_at && new Date(l.expires_at) < new Date())).length)

function isExpired(link: IReceiptSharedLink) {
  return !!link.expires_at && new Date(link.expires_at) < new Date()
}
function linkStatusLabel(link: IReceiptSharedLink) {
  if (!link.is_active) return { text: t('invoiceView.links.statusRevoked'), cls: 'text-red-400 bg-red-500/10 border-red-500/20' }
  if (isExpired(link)) return { text: t('invoiceView.links.statusExpired'), cls: 'text-amber-400 bg-amber-500/10 border-amber-500/20' }
  return { text: t('invoiceView.links.statusActive'), cls: 'text-green-400 bg-green-500/10 border-green-500/20' }
}
function expiryLabel(link: IReceiptSharedLink) {
  if (!link.expires_at) return t('invoiceView.links.neverExpires')
  if (isExpired(link)) return t('invoiceView.links.expiredOn', { date: fmtDate(link.expires_at) })
  return t('invoiceView.links.expiresOn', { date: fmtDate(link.expires_at) })
}
function linkUrl(token: string) { return `${window.location.origin}/share/r/${token}` }
function copyLink(token: string) {
  navigator.clipboard.writeText(linkUrl(token)).catch(() => {})
  notify(t('invoiceView.toasts.linkCopied'), 'success')
}
function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString(locale.value, { month: 'short', day: 'numeric', year: 'numeric' })
}
function fmtDateTime(iso: string | null) {
  if (!iso) return t('invoiceView.links.never')
  return new Date(iso).toLocaleDateString(locale.value, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const handlePrint = () => window.print()

async function finalizeReceipt() {
  if (!receipt.value) return
  isFinalizing.value = true
  try {
    const res = await ReceiptService.update(orgId.value, receipt.value.id, { status: 'finalized' })
    receipt.value = res.data.data
    notify(t('receipts.toasts.finalized', { number: receipt.value.number }), 'success')
  } catch {
    notify(t('receipts.toasts.updateFailed'), 'error')
  } finally {
    isFinalizing.value = false
  }
}

async function handleDelete() {
  if (!receipt.value) return
  isDeleting.value = true
  try {
    await ReceiptService.delete(orgId.value, receipt.value.id)
    notify(t('receipts.toasts.deleted', { number: receipt.value.number }), 'success')
    router.push({ name: 'receipts' })
  } catch {
    notify(t('receipts.toasts.deleteFailed'), 'error')
  } finally {
    isDeleting.value = false
  }
}
</script>

<template>
  <div class="p-4 md:p-6 space-y-5 min-h-full">

    <div v-if="loading" class="flex items-center justify-center py-24">
      <Icon icon="lucide:loader-2" class="w-6 h-6 text-gray-700 animate-spin" />
    </div>

    <div v-else-if="notFound" class="flex flex-col items-center justify-center py-24 text-center">
      <p class="text-gray-700">{{ t('receipts.notFound') }}</p>
      <button @click="router.push({ name: 'receipts' })" class="mt-4 text-green-700 text-sm hover:underline">{{ t('receipts.back') }}</button>
    </div>

    <template v-else-if="receipt">

      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div class="flex items-center gap-3">
          <button @click="router.push({ name: 'receipts' })" class="p-1.5 rounded-lg hover:bg-gray-400 text-gray-700 hover:text-gray-1000 transition-colors shrink-0">
            <Icon icon="lucide:arrow-left" class="w-4 h-4" />
          </button>
          <div>
            <div class="flex items-center gap-2 flex-wrap">
              <h1 class="page-title font-mono">{{ receipt.number }}</h1>
              <span :class="['status-badge', statusClass[receipt.status] ?? 'status-draft']">{{ statusLabel(receipt.status) }}</span>
            </div>
            <p class="page-subtitle">{{ receipt.to_name || '—' }} · {{ receipt.paid_at ? t('receiptView.paidOn', { date: formatDate(receipt.paid_at) }) : t('receiptView.noPaymentDate') }}</p>
          </div>
        </div>
        <div class="flex items-center flex-wrap gap-2 ml-9 sm:ml-0">
          <button @click="handlePrint" class="flex items-center gap-1.5 px-2 sm:px-3 py-2 text-xs font-medium bg-gray-400 hover:bg-gray-500 border border-gray-500 text-gray-700 hover:text-gray-1000 rounded-lg transition-colors" :title="t('invoiceView.actions.print')">
            <Icon icon="lucide:printer" class="w-3.5 h-3.5" /><span class="hidden sm:inline"> {{ t('invoiceView.actions.print') }}</span>
          </button>
          <button
            @click="showShareModal = true"
            class="flex items-center gap-1.5 px-2 sm:px-3 py-2 text-xs font-medium bg-gray-400 hover:bg-gray-500 border border-gray-500 text-gray-700 hover:text-gray-1000 rounded-lg transition-colors"
            :title="t('invoiceView.actions.share')"
          >
            <Icon icon="lucide:share-2" class="w-3.5 h-3.5" /><span class="hidden sm:inline"> {{ t('invoiceView.actions.share') }}</span>
            <span v-if="activeLinks > 0" class="ml-0.5 px-1.5 py-0.5 bg-green-700/20 text-green-700 text-[9px] font-bold rounded-full">{{ activeLinks }}</span>
          </button>
          <button
            v-if="receipt.status !== 'finalized'"
            @click="finalizeReceipt"
            :disabled="isFinalizing"
            class="flex items-center gap-1.5 px-2 sm:px-3 py-2 text-xs font-medium bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 text-green-400 rounded-lg transition-colors disabled:opacity-50"
            :title="t('receipts.actions.finalize')"
          >
            <Icon v-if="isFinalizing" icon="lucide:loader-2" class="w-3.5 h-3.5 animate-spin" />
            <Icon v-else icon="lucide:check-circle" class="w-3.5 h-3.5" />
            <span class="hidden sm:inline">{{ t('receipts.actions.finalize') }}</span>
          </button>
          <button @click="router.push({ name: 'receipts.edit', params: { id: receipt.id } })" class="flex items-center gap-1.5 px-2 sm:px-3 py-2 text-xs font-medium bg-green-700 hover:bg-green-800 text-bg-100 font-semibold rounded-lg transition-colors">
            <Icon icon="lucide:pencil" class="w-3.5 h-3.5" /> {{ t('invoiceView.actions.edit') }}
          </button>
          <button @click="showDeleteConfirm = true" class="flex items-center gap-1.5 px-2 py-2 text-xs font-medium bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 rounded-lg transition-colors" :title="t('invoiceView.actions.delete')">
            <Icon icon="lucide:trash-2" class="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <!-- Two-column: receipt preview + links analytics -->
      <div class="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-5">

        <!-- Receipt document preview -->
        <div class="bg-gray-400/30 rounded-xl p-3 sm:p-6 overflow-x-auto">
          <div
            class="print-document min-w-[560px] w-full max-w-2xl mx-auto bg-white rounded-lg shadow-2xl overflow-hidden text-gray-800 relative"
            :style="{ fontFamily: receipt.font_family || 'Geist Sans, sans-serif', fontSize: '13px' }"
          >
            <div class="h-1.5 w-full" :style="{ backgroundColor: receipt.accent_color }"></div>

            <!-- Watermark -->
            <div v-if="receipt.show_watermark && receipt.watermark_text" class="absolute inset-0 flex items-center justify-center pointer-events-none select-none" style="transform:rotate(-35deg);z-index:1">
              <span class="text-7xl font-black tracking-widest opacity-[0.04] text-gray-800 whitespace-nowrap">{{ receipt.watermark_text }}</span>
            </div>
            <!-- Stamp -->
            <div v-if="receipt.stamp" class="absolute inset-0 flex items-center justify-center pointer-events-none select-none" style="transform:rotate(-25deg);z-index:2">
              <div class="text-5xl font-extrabold tracking-widest border-4 px-6 py-3 rounded opacity-[0.15]"
                :style="{ color: receipt.stamp_color ?? '#9ca3af', borderColor: receipt.stamp_color ?? '#9ca3af' }"
              >{{ receipt.stamp }}</div>
            </div>

            <div class="p-10" style="position:relative;z-index:3">
              <div class="flex justify-between items-start mb-8">
                <div class="flex items-start gap-4">
                  <img v-if="receipt.logo_url && receipt.show_logo" :src="receipt.logo_url" alt="Logo" class="h-12 w-auto object-contain" />
                  <div>
                    <div class="text-xl font-bold mb-0.5" :style="{ color: receipt.accent_color }">{{ receipt.from_name }}</div>
                    <div v-if="receipt.from_tagline" class="text-xs text-gray-400 mb-1">{{ receipt.from_tagline }}</div>
                    <div class="text-xs text-gray-400 whitespace-pre-line leading-relaxed">{{ receipt.from_address }}</div>
                    <div v-if="receipt.from_email" class="text-xs text-gray-400 mt-1">{{ receipt.from_email }}</div>
                    <div v-if="receipt.from_phone" class="text-xs text-gray-400">{{ receipt.from_phone }}</div>
                  </div>
                </div>
                <div class="text-right">
                  <div class="text-3xl font-bold text-gray-200 tracking-widest" style="font-family:var(--font-sans)">{{ t('document.receiptWord') }}</div>
                  <div class="font-mono text-sm text-gray-400 mt-1">{{ receipt.number }}</div>
                </div>
              </div>

              <div class="h-px mb-6" :style="{ backgroundColor: receipt.accent_color + '30' }"></div>

              <!-- Dates and payment info -->
              <div class="flex gap-8 mb-8 text-xs">
                <div><div class="text-gray-400 uppercase tracking-widest mb-1" style="font-size:10px">{{ t('document.issueDate') }}</div><div class="font-semibold text-gray-700">{{ formatDate(receipt.issue_date) }}</div></div>
                <div v-if="receipt.paid_at"><div class="text-gray-400 uppercase tracking-widest mb-1" style="font-size:10px">{{ t('document.paymentDate') }}</div><div class="font-semibold text-gray-700">{{ formatDate(receipt.paid_at) }}</div></div>
                <div v-if="receipt.payment_method"><div class="text-gray-400 uppercase tracking-widest mb-1" style="font-size:10px">{{ t('document.paymentMethod') }}</div><div class="font-semibold text-gray-700">{{ receipt.payment_method }}</div></div>
                <div v-if="receipt.reference_number"><div class="text-gray-400 uppercase tracking-widest mb-1" style="font-size:10px">{{ t('document.refInvoice') }}</div><div class="font-semibold text-gray-700">{{ receipt.reference_number }}</div></div>
                <div v-if="receipt.currency !== 'USD'"><div class="text-gray-400 uppercase tracking-widest mb-1" style="font-size:10px">{{ t('document.currency') }}</div><div class="font-semibold text-gray-700">{{ receipt.currency }}</div></div>
              </div>

              <div class="mb-8">
                <div class="text-[10px] uppercase tracking-widest text-gray-400 mb-2">{{ t('document.receiptTo') }}</div>
                <div class="font-semibold text-gray-800">{{ receipt.to_name || '—' }}</div>
                <div v-if="receipt.to_company" class="text-xs text-gray-500">{{ receipt.to_company }}</div>
                <div v-if="receipt.to_email" class="text-xs text-gray-500">{{ receipt.to_email }}</div>
                <div v-if="receipt.to_phone" class="text-xs text-gray-500">{{ receipt.to_phone }}</div>
                <div v-if="receipt.to_address" class="text-xs text-gray-500 whitespace-pre-line mt-1">{{ receipt.to_address }}</div>
              </div>

              <table class="w-full mb-6 text-sm" style="border-collapse:collapse">
                <thead>
                  <tr :style="{ backgroundColor: receipt.accent_color + '18' }">
                    <th class="text-left py-2.5 px-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">{{ t('document.table.description') }}</th>
                    <th class="text-center py-2.5 px-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">{{ t('document.table.qty') }}</th>
                    <th class="text-center py-2.5 px-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">{{ t('document.table.unit') }}</th>
                    <th class="text-right py-2.5 px-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">{{ t('document.table.rate') }}</th>
                    <th class="text-right py-2.5 px-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">{{ t('document.table.amount') }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="item in receipt.items" :key="item.id" style="border-bottom:1px solid #f3f4f6">
                    <td class="py-3 px-3 text-gray-700">{{ item.description }}</td>
                    <td class="py-3 px-3 text-center text-gray-500">{{ item.qty }}</td>
                    <td class="py-3 px-3 text-center text-gray-400 text-xs">{{ item.unit }}</td>
                    <td class="py-3 px-3 text-right text-gray-500">{{ fmtMoney(item.rate) }}</td>
                    <td class="py-3 px-3 text-right font-medium text-gray-800">{{ fmtMoney(item.qty * item.rate) }}</td>
                  </tr>
                </tbody>
              </table>

              <div class="flex justify-end mb-6">
                <div class="w-56 space-y-1.5 text-sm">
                  <div class="flex justify-between text-gray-500"><span>{{ t('document.subtotal') }}</span><span class="font-mono">{{ fmtMoney(receipt.totals.subtotal) }}</span></div>
                  <div v-if="receipt.totals.discount_amt > 0" class="flex justify-between text-gray-500">
                    <span>{{ t('document.discount') }}</span><span class="font-mono text-red-500">-{{ fmtMoney(receipt.totals.discount_amt) }}</span>
                  </div>
                  <div v-if="receipt.totals.taxes_total > 0" class="flex justify-between text-gray-500">
                    <span>{{ t('document.tax') }}</span><span class="font-mono">{{ fmtMoney(receipt.totals.taxes_total) }}</span>
                  </div>
                  <div class="h-px bg-gray-200 my-2"></div>
                  <div class="flex justify-between font-bold text-base">
                    <span>{{ t('document.amountReceived') }}</span><span class="font-mono" :style="{ color: receipt.accent_color }">{{ fmtMoney(receipt.totals.total) }}</span>
                  </div>
                </div>
              </div>

              <div v-if="receipt.show_notes && receipt.notes" class="border-t border-gray-100 pt-6">
                <div class="text-[10px] uppercase tracking-widest text-gray-400 mb-1.5">{{ t('document.notes') }}</div>
                <p class="text-xs text-gray-500 leading-relaxed whitespace-pre-line">{{ receipt.notes }}</p>
              </div>

              <div v-if="receipt.show_flowtali_tag" class="mt-8 text-center">
                <div class="text-[10px] text-gray-300">{{ t('document.generatedWith') }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Right: links analytics -->
        <div class="space-y-4">

          <!-- Stats -->
          <div class="bg-gray-200 border border-gray-400 rounded-xl p-4 space-y-3">
            <div class="flex items-center justify-between">
              <p class="text-xs font-semibold text-gray-900 uppercase tracking-wider">{{ t('invoiceView.links.title') }}</p>
              <button
                @click="showShareModal = true"
                class="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-green-700 hover:text-green-700/80 bg-green-700/10 hover:bg-green-700/15 rounded-md transition-colors"
              >
                <Icon icon="lucide:plus" class="w-3 h-3" /> {{ t('invoiceView.links.newLink') }}
              </button>
            </div>
            <div class="grid grid-cols-3 gap-2">
              <div class="bg-gray-100/50 rounded-lg p-2.5 text-center">
                <div class="text-lg font-bold text-gray-1000">{{ links.length }}</div>
                <div class="text-[9px] text-gray-700 uppercase tracking-wide mt-0.5">{{ t('invoiceView.links.total') }}</div>
              </div>
              <div class="bg-gray-100/50 rounded-lg p-2.5 text-center">
                <div class="text-lg font-bold text-green-400">{{ activeLinks }}</div>
                <div class="text-[9px] text-gray-700 uppercase tracking-wide mt-0.5">{{ t('invoiceView.links.active') }}</div>
              </div>
              <div class="bg-gray-100/50 rounded-lg p-2.5 text-center">
                <div class="text-lg font-bold text-gray-1000">{{ totalViews }}</div>
                <div class="text-[9px] text-gray-700 uppercase tracking-wide mt-0.5">{{ t('invoiceView.links.views') }}</div>
              </div>
            </div>
            <div class="flex items-center gap-3 text-xs text-gray-700 pt-0.5">
              <span class="flex items-center gap-1"><Icon icon="lucide:lock" class="w-3 h-3" />{{ t('invoiceView.links.private', { count: links.filter(l => l.visibility === 'private').length }) }}</span>
              <span class="flex items-center gap-1"><Icon icon="lucide:globe" class="w-3 h-3" />{{ t('invoiceView.links.public', { count: links.filter(l => l.visibility === 'public').length }) }}</span>
            </div>
          </div>

          <!-- Link list -->
          <div v-if="links.length > 0" class="space-y-2">
            <div
              v-for="link in links" :key="link.id"
              class="bg-gray-200 border border-gray-400 rounded-xl p-3.5 space-y-2.5"
            >
              <div class="flex items-start justify-between gap-2">
                <div class="min-w-0">
                  <div class="flex items-center gap-1.5 flex-wrap">
                    <span class="text-xs font-semibold text-gray-1000 truncate">{{ link.label || t('invoiceView.links.defaultLabel') }}</span>
                    <span :class="['text-[9px] px-1.5 py-0.5 rounded border font-medium', linkStatusLabel(link).cls]">{{ linkStatusLabel(link).text }}</span>
                  </div>
                  <p class="text-[10px] text-gray-700 mt-0.5">{{ expiryLabel(link) }}</p>
                </div>
                <span class="text-[9px] px-1.5 py-0.5 rounded border font-medium text-gray-700 border-gray-500 bg-gray-400 shrink-0">
                  {{ link.visibility === 'private' ? t('invoiceView.links.visibilityPrivate') : t('invoiceView.links.visibilityPublic') }}
                </span>
              </div>

              <div class="flex items-center gap-1.5">
                <div class="flex-1 min-w-0 bg-gray-100/60 border border-gray-400 rounded px-2 py-1">
                  <p class="text-[10px] font-mono text-gray-700 truncate">{{ linkUrl(link.token) }}</p>
                </div>
                <button
                  @click="copyLink(link.token)"
                  :disabled="!link.is_active || isExpired(link)"
                  class="p-1 rounded bg-gray-400 hover:bg-gray-500 border border-gray-500 text-gray-700 hover:text-gray-1000 transition-colors disabled:opacity-40"
                ><Icon icon="lucide:copy" class="w-3 h-3" /></button>
              </div>

              <div v-if="link.visibility === 'private' && link.access_code" class="flex items-center gap-1.5">
                <Icon icon="lucide:key-round" class="w-3 h-3 text-green-700 shrink-0" />
                <span class="text-[10px] font-mono text-green-700 tracking-widest">{{ link.access_code }}</span>
              </div>

              <div class="flex items-center gap-3 text-[10px] text-gray-700 border-t border-gray-400/50 pt-2">
                <span class="flex items-center gap-1"><Icon icon="lucide:eye" class="w-3 h-3" /> {{ link.views }}</span>
                <span class="flex items-center gap-1 ml-auto"><Icon icon="lucide:clock" class="w-3 h-3" /> {{ fmtDateTime(link.last_viewed_at) }}</span>
              </div>

              <div v-if="link.view_log.length > 0" class="space-y-1 border-t border-gray-400/50 pt-2">
                <p class="text-[9px] uppercase tracking-wider text-gray-700">{{ t('invoiceView.links.recentViews') }}</p>
                <div v-for="(entry, i) in link.view_log.slice(0, 5)" :key="i" class="flex items-center justify-between text-[10px] text-gray-700">
                  <span>{{ entry.browser }}</span>
                  <span>{{ fmtDateTime(entry.timestamp) }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Empty state -->
          <div v-else class="bg-gray-200 border border-dashed border-gray-500 rounded-xl p-6 flex flex-col items-center text-center gap-2">
            <Icon icon="lucide:share-2" class="w-8 h-8 text-gray-700" />
            <p class="text-xs font-medium text-gray-900">{{ t('invoiceView.links.emptyTitle') }}</p>
            <p class="text-[11px] text-gray-700">{{ t('receiptView.linksEmptyBody') }}</p>
            <button @click="showShareModal = true" class="mt-2 flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-green-700/10 hover:bg-green-700/15 border border-green-700/20 text-green-700 rounded-lg transition-colors">
              <Icon icon="lucide:plus" class="w-3.5 h-3.5" /> {{ t('invoiceView.links.createLink') }}
            </button>
          </div>

        </div>

      </div><!-- /two-column grid -->

    </template>

    <!-- Share modal -->
    <ShareLinkModal
      v-if="showShareModal && receipt"
      resource-type="receipt"
      :org-id="orgId"
      :resource-id="receipt.id"
      :resource-name="receipt.number"
      @close="showShareModal = false; refreshLinks()"
    />

    <!-- Delete confirm -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showDeleteConfirm && receipt" class="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" @click.self="showDeleteConfirm = false">
          <div class="bg-gray-200 border border-gray-400 rounded-2xl p-6 w-full max-w-sm shadow-2xl space-y-4">
            <div class="flex items-start gap-3">
              <div class="w-9 h-9 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0">
                <Icon icon="lucide:trash-2" class="w-4 h-4 text-red-400" />
              </div>
              <div>
                <h3 class="text-sm font-semibold text-gray-1000">{{ t('receipts.deleteModal.title', { number: receipt.number }) }}</h3>
                <p class="text-xs text-gray-700 mt-1 leading-relaxed">{{ t('receipts.deleteModal.body') }}</p>
              </div>
            </div>
            <div class="flex justify-end gap-2">
              <button @click="showDeleteConfirm = false" :disabled="isDeleting" class="px-4 py-2 text-xs font-medium text-gray-700 hover:text-gray-1000 bg-gray-400 hover:bg-gray-500 border border-gray-500 rounded-lg transition-colors disabled:opacity-50">{{ t('receipts.deleteModal.cancel') }}</button>
              <button @click="handleDelete" :disabled="isDeleting" class="px-4 py-2 text-xs font-semibold text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1.5">
                <Icon v-if="isDeleting" icon="lucide:loader-2" class="w-3 h-3 animate-spin" />
                {{ t('receipts.deleteModal.confirm') }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.modal-enter-active, .modal-leave-active { transition: opacity 0.2s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
</style>

<style>
@media print {
  body * { visibility: hidden; }
  .print-document, .print-document * {
    visibility: visible;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  .print-document {
    position: fixed; top: 0; left: 0; width: 100%; height: 100%; box-shadow: none !important;
  }
  @page { margin: 0; size: A4; }
}
</style>
