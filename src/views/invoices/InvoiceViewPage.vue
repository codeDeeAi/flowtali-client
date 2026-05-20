<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { Icon } from '@iconify/vue'
import { useNotification } from '@/composables/notification.ts'
import { useAuthStore } from '@/stores/auth'
import { InvoiceService, InvoiceSharedLinksService, type IInvoice, type IInvoiceSharedLink } from '@/services/invoice.service'
import ShareLinkModal from '@/components/modals/ShareLinkModal.vue'

const router     = useRouter()
const route      = useRoute()
const { notify } = useNotification()
const authStore  = useAuthStore()
const orgId      = computed(() => authStore.getCurrentOrganization?.id ?? '')
const showShareModal = ref(false)

const invoice  = ref<IInvoice | null>(null)
const links    = ref<IInvoiceSharedLink[]>([])
const loading  = ref(true)
const notFound = ref(false)
const showDeleteConfirm = ref(false)
const isDeleting        = ref(false)
const isMarkingPaid     = ref(false)

onMounted(async () => {
  if (!orgId.value) return
  const id = route.params.id as string
  try {
    const [invRes, linksRes] = await Promise.all([
      InvoiceService.get(orgId.value, id),
      InvoiceSharedLinksService.list(orgId.value, id),
    ])
    invoice.value = invRes.data.data
    links.value   = linksRes.data.data
  } catch {
    notFound.value = true
  } finally {
    loading.value = false
  }
})

async function refreshLinks() {
  if (!invoice.value) return
  try {
    const res = await InvoiceSharedLinksService.list(orgId.value, invoice.value.id)
    links.value = res.data.data
  } catch {}
}

const symMap: Record<string, string> = { USD: '$', EUR: '€', GBP: '£', NGN: '₦', CAD: 'CA$', AUD: 'A$', JPY: '¥', INR: '₹', ZAR: 'R', CHF: 'Fr', AED: 'د.إ' }
const sym     = computed(() => invoice.value ? (symMap[invoice.value.currency] ?? '$') : '$')
const fmtMoney = (n: number) => sym.value + n.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const formatDate = (d: string | null) => {
  if (!d) return '—'
  const [y = '0', m = '1', day = '1'] = d.split('-')
  return new Date(+y, +m - 1, +day).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

const statusClass: Record<string, string> = {
  paid: 'status-paid', sent: 'status-due', overdue: 'status-overdue', draft: 'status-draft', void: 'status-draft',
}
const statusLabelMap: Record<string, string> = {
  paid: 'Paid', sent: 'Due', overdue: 'Overdue', draft: 'Draft', void: 'Void',
}

const totalViews  = computed(() => links.value.reduce((s, l) => s + l.views, 0))
const activeLinks = computed(() => links.value.filter(l => l.is_active && !(l.expires_at && new Date(l.expires_at) < new Date())).length)

function isExpired(link: IInvoiceSharedLink) {
  return !!link.expires_at && new Date(link.expires_at) < new Date()
}
function linkStatusLabel(link: IInvoiceSharedLink) {
  if (!link.is_active) return { text: 'Revoked', cls: 'text-red-400 bg-red-500/10 border-red-500/20' }
  if (isExpired(link)) return { text: 'Expired', cls: 'text-gray-400 bg-charcoal-700 border-charcoal-600' }
  return { text: 'Active', cls: 'text-green-400 bg-green-500/10 border-green-500/20' }
}
function expiryLabel(link: IInvoiceSharedLink) {
  if (!link.expires_at) return 'Never expires'
  if (isExpired(link)) return `Expired ${fmtDate(link.expires_at)}`
  return `Expires ${fmtDate(link.expires_at)}`
}
function linkUrl(token: string) { return `${window.location.origin}/share/i/${token}` }
function copyLink(token: string) {
  navigator.clipboard.writeText(linkUrl(token)).catch(() => {})
  notify('Link copied to clipboard', 'success')
}
function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
function fmtDateTime(iso: string | null) {
  if (!iso) return 'Never'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const handlePrint = () => window.print()

async function markPaid() {
  if (!invoice.value) return
  isMarkingPaid.value = true
  try {
    const res = await InvoiceService.update(orgId.value, invoice.value.id, { status: 'paid' })
    invoice.value = res.data.data
    notify(`${invoice.value.number} marked as paid`, 'success')
  } catch {
    notify('Failed to update invoice', 'error')
  } finally {
    isMarkingPaid.value = false
  }
}

async function handleDelete() {
  if (!invoice.value) return
  isDeleting.value = true
  try {
    await InvoiceService.delete(orgId.value, invoice.value.id)
    notify(`${invoice.value.number} deleted`, 'success')
    router.push({ name: 'invoices' })
  } catch {
    notify('Failed to delete invoice', 'error')
  } finally {
    isDeleting.value = false
  }
}
</script>

<template>
  <div class="p-4 md:p-6 space-y-5 min-h-full">

    <div v-if="loading" class="flex items-center justify-center py-24">
      <Icon icon="lucide:loader-2" class="w-6 h-6 text-cream-faint animate-spin" />
    </div>

    <div v-else-if="notFound" class="flex flex-col items-center justify-center py-24 text-center">
      <p class="text-cream-faint">Invoice not found</p>
      <button @click="router.push({ name: 'invoices' })" class="mt-4 text-amber text-sm hover:underline">Back to invoices</button>
    </div>

    <template v-else-if="invoice">

      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div class="flex items-center gap-3">
          <button @click="router.push({ name: 'invoices' })" class="p-1.5 rounded-lg hover:bg-charcoal-700 text-cream-faint hover:text-cream transition-colors shrink-0">
            <Icon icon="lucide:arrow-left" class="w-4 h-4" />
          </button>
          <div>
            <div class="flex items-center gap-2 flex-wrap">
              <h1 class="page-title font-mono">{{ invoice.number }}</h1>
              <span :class="['status-badge', statusClass[invoice.status] ?? 'status-draft']">{{ statusLabelMap[invoice.status] ?? invoice.status }}</span>
            </div>
            <p class="page-subtitle">{{ invoice.to_name || '—' }} · Due {{ formatDate(invoice.due_date) }}</p>
          </div>
        </div>
        <div class="flex items-center gap-2 ml-9 sm:ml-0">
          <button @click="handlePrint" class="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-charcoal-700 hover:bg-charcoal-600 border border-charcoal-600 text-cream-faint hover:text-cream rounded-lg transition-colors">
            <Icon icon="lucide:printer" class="w-3.5 h-3.5" /> Print / PDF
          </button>
          <button
            @click="showShareModal = true"
            class="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-charcoal-700 hover:bg-charcoal-600 border border-charcoal-600 text-cream-faint hover:text-cream rounded-lg transition-colors"
          >
            <Icon icon="lucide:share-2" class="w-3.5 h-3.5" /> Share
            <span v-if="activeLinks > 0" class="ml-0.5 px-1.5 py-0.5 bg-amber/20 text-amber text-[9px] font-bold rounded-full">{{ activeLinks }}</span>
          </button>
          <button
            v-if="invoice.status !== 'paid'"
            @click="markPaid"
            :disabled="isMarkingPaid"
            class="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 text-green-400 rounded-lg transition-colors disabled:opacity-50"
          >
            <Icon v-if="isMarkingPaid" icon="lucide:loader-2" class="w-3.5 h-3.5 animate-spin" />
            <Icon v-else icon="lucide:check-circle" class="w-3.5 h-3.5" />
            Mark Paid
          </button>
          <button @click="router.push({ name: 'invoices.edit', params: { id: invoice.id } })" class="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-amber hover:bg-amber-light text-charcoal-900 font-semibold rounded-lg transition-colors">
            <Icon icon="lucide:pencil" class="w-3.5 h-3.5" /> Edit
          </button>
          <button @click="showDeleteConfirm = true" class="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 rounded-lg transition-colors">
            <Icon icon="lucide:trash-2" class="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <!-- Two-column: invoice preview + links analytics -->
      <div class="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-5">

        <!-- Invoice document preview (classic style) -->
        <div class="bg-charcoal-700/30 rounded-xl p-6 flex justify-center">
          <div
            class="print-document w-full max-w-2xl bg-white rounded-lg shadow-2xl overflow-hidden text-gray-800 relative"
            :style="{ fontFamily: invoice.font_family || '\'DM Sans\', sans-serif', fontSize: '13px' }"
          >
            <div class="h-1.5 w-full" :style="{ backgroundColor: invoice.accent_color }"></div>

            <!-- Watermark -->
            <div v-if="invoice.show_watermark && invoice.watermark_text" class="absolute inset-0 flex items-center justify-center pointer-events-none select-none" style="transform:rotate(-35deg);z-index:1">
              <span class="text-7xl font-black tracking-widest opacity-[0.04] text-gray-800 whitespace-nowrap">{{ invoice.watermark_text }}</span>
            </div>
            <!-- Stamp -->
            <div v-if="invoice.stamp" class="absolute inset-0 flex items-center justify-center pointer-events-none select-none" style="transform:rotate(-25deg);z-index:2">
              <div class="text-5xl font-extrabold tracking-widest border-4 px-6 py-3 rounded opacity-[0.15]"
                :style="{ color: invoice.stamp_color ?? '#9ca3af', borderColor: invoice.stamp_color ?? '#9ca3af' }"
              >{{ invoice.stamp }}</div>
            </div>

            <div class="p-10" style="position:relative;z-index:3">
              <div class="flex justify-between items-start mb-8">
                <div class="flex items-start gap-4">
                  <img v-if="invoice.logo_url && invoice.show_logo" :src="invoice.logo_url" alt="Logo" class="h-12 w-auto object-contain" />
                  <div>
                    <div class="text-xl font-bold mb-0.5" :style="{ color: invoice.accent_color }">{{ invoice.from_name }}</div>
                    <div v-if="invoice.from_tagline" class="text-xs text-gray-400 mb-1">{{ invoice.from_tagline }}</div>
                    <div class="text-xs text-gray-400 whitespace-pre-line leading-relaxed">{{ invoice.from_address }}</div>
                    <div v-if="invoice.from_email" class="text-xs text-gray-400 mt-1">{{ invoice.from_email }}</div>
                    <div v-if="invoice.from_phone" class="text-xs text-gray-400">{{ invoice.from_phone }}</div>
                  </div>
                </div>
                <div class="text-right">
                  <div class="text-3xl font-bold text-gray-200 tracking-widest" style="font-family:'Cormorant Garamond',Georgia,serif">INVOICE</div>
                  <div class="font-mono text-sm text-gray-400 mt-1">{{ invoice.number }}</div>
                </div>
              </div>

              <div class="h-px mb-6" :style="{ backgroundColor: invoice.accent_color + '30' }"></div>

              <div class="flex gap-8 mb-8 text-xs">
                <div><div class="text-gray-400 uppercase tracking-widest mb-1" style="font-size:10px">Issue Date</div><div class="font-semibold text-gray-700">{{ formatDate(invoice.issue_date) }}</div></div>
                <div><div class="text-gray-400 uppercase tracking-widest mb-1" style="font-size:10px">Due Date</div><div class="font-semibold text-gray-700">{{ formatDate(invoice.due_date) }}</div></div>
                <div v-if="invoice.currency !== 'USD'"><div class="text-gray-400 uppercase tracking-widest mb-1" style="font-size:10px">Currency</div><div class="font-semibold text-gray-700">{{ invoice.currency }}</div></div>
                <div v-if="invoice.po_number"><div class="text-gray-400 uppercase tracking-widest mb-1" style="font-size:10px">PO Number</div><div class="font-semibold text-gray-700">{{ invoice.po_number }}</div></div>
              </div>

              <div class="mb-8">
                <div class="text-[10px] uppercase tracking-widest text-gray-400 mb-2">Bill To</div>
                <div class="font-semibold text-gray-800">{{ invoice.to_name || '—' }}</div>
                <div v-if="invoice.to_company" class="text-xs text-gray-500">{{ invoice.to_company }}</div>
                <div v-if="invoice.to_email" class="text-xs text-gray-500">{{ invoice.to_email }}</div>
                <div v-if="invoice.to_phone" class="text-xs text-gray-500">{{ invoice.to_phone }}</div>
                <div v-if="invoice.to_address" class="text-xs text-gray-500 whitespace-pre-line mt-1">{{ invoice.to_address }}</div>
              </div>

              <table class="w-full mb-6 text-sm" style="border-collapse:collapse">
                <thead>
                  <tr :style="{ backgroundColor: invoice.accent_color + '18' }">
                    <th class="text-left py-2.5 px-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">Description</th>
                    <th class="text-center py-2.5 px-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">Qty</th>
                    <th class="text-center py-2.5 px-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">Unit</th>
                    <th class="text-right py-2.5 px-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">Rate</th>
                    <th class="text-right py-2.5 px-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="item in invoice.items" :key="item.id" style="border-bottom:1px solid #f3f4f6">
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
                  <div class="flex justify-between text-gray-500"><span>Subtotal</span><span class="font-mono">{{ fmtMoney(invoice.totals.subtotal) }}</span></div>
                  <div v-if="invoice.totals.discount_amt > 0" class="flex justify-between text-gray-500">
                    <span>Discount</span><span class="font-mono text-red-500">-{{ fmtMoney(invoice.totals.discount_amt) }}</span>
                  </div>
                  <div v-if="invoice.totals.taxes_total > 0" class="flex justify-between text-gray-500">
                    <span>Tax</span><span class="font-mono">{{ fmtMoney(invoice.totals.taxes_total) }}</span>
                  </div>
                  <div class="h-px bg-gray-200 my-2"></div>
                  <div class="flex justify-between font-bold text-base">
                    <span>Total</span><span class="font-mono" :style="{ color: invoice.accent_color }">{{ fmtMoney(invoice.totals.total) }}</span>
                  </div>
                </div>
              </div>

              <div v-if="invoice.show_notes && invoice.notes" class="border-t border-gray-100 pt-6">
                <div class="text-[10px] uppercase tracking-widest text-gray-400 mb-1.5">Notes</div>
                <p class="text-xs text-gray-500 leading-relaxed whitespace-pre-line">{{ invoice.notes }}</p>
              </div>

              <div v-if="invoice.show_flowtali_tag" class="mt-8 text-center">
                <div class="text-[10px] text-gray-300">Generated with Flowtali · flowtali.io</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Right: links analytics -->
        <div class="space-y-4">

          <!-- Stats -->
          <div class="bg-charcoal-800 border border-charcoal-700 rounded-xl p-4 space-y-3">
            <div class="flex items-center justify-between">
              <p class="text-xs font-semibold text-cream-muted uppercase tracking-wider">Shared Links</p>
              <button
                @click="showShareModal = true"
                class="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-amber hover:text-amber/80 bg-amber/10 hover:bg-amber/15 rounded-md transition-colors"
              >
                <Icon icon="lucide:plus" class="w-3 h-3" /> New Link
              </button>
            </div>
            <div class="grid grid-cols-3 gap-2">
              <div class="bg-charcoal-900/50 rounded-lg p-2.5 text-center">
                <div class="text-lg font-bold text-cream">{{ links.length }}</div>
                <div class="text-[9px] text-cream-faint uppercase tracking-wide mt-0.5">Total</div>
              </div>
              <div class="bg-charcoal-900/50 rounded-lg p-2.5 text-center">
                <div class="text-lg font-bold text-green-400">{{ activeLinks }}</div>
                <div class="text-[9px] text-cream-faint uppercase tracking-wide mt-0.5">Active</div>
              </div>
              <div class="bg-charcoal-900/50 rounded-lg p-2.5 text-center">
                <div class="text-lg font-bold text-cream">{{ totalViews }}</div>
                <div class="text-[9px] text-cream-faint uppercase tracking-wide mt-0.5">Views</div>
              </div>
            </div>
            <div class="flex items-center gap-3 text-xs text-cream-faint pt-0.5">
              <span class="flex items-center gap-1"><Icon icon="lucide:lock" class="w-3 h-3" />{{ links.filter(l => l.visibility === 'private').length }} private</span>
              <span class="flex items-center gap-1"><Icon icon="lucide:globe" class="w-3 h-3" />{{ links.filter(l => l.visibility === 'public').length }} public</span>
            </div>
          </div>

          <!-- Link list -->
          <div v-if="links.length > 0" class="space-y-2">
            <div
              v-for="link in links" :key="link.id"
              class="bg-charcoal-800 border border-charcoal-700 rounded-xl p-3.5 space-y-2.5"
            >
              <div class="flex items-start justify-between gap-2">
                <div class="min-w-0">
                  <div class="flex items-center gap-1.5 flex-wrap">
                    <span class="text-xs font-semibold text-cream truncate">{{ link.label || 'Shared Link' }}</span>
                    <span :class="['text-[9px] px-1.5 py-0.5 rounded border font-medium', linkStatusLabel(link).cls]">{{ linkStatusLabel(link).text }}</span>
                  </div>
                  <p class="text-[10px] text-cream-faint mt-0.5">{{ expiryLabel(link) }}</p>
                </div>
                <span class="text-[9px] px-1.5 py-0.5 rounded border font-medium text-cream-faint border-charcoal-600 bg-charcoal-700 shrink-0">
                  {{ link.visibility === 'private' ? 'Private' : 'Public' }}
                </span>
              </div>

              <div class="flex items-center gap-1.5">
                <div class="flex-1 min-w-0 bg-charcoal-900/60 border border-charcoal-700 rounded px-2 py-1">
                  <p class="text-[10px] font-mono text-cream-faint truncate">{{ linkUrl(link.token) }}</p>
                </div>
                <button
                  @click="copyLink(link.token)"
                  :disabled="!link.is_active || isExpired(link)"
                  class="p-1 rounded bg-charcoal-700 hover:bg-charcoal-600 border border-charcoal-600 text-cream-faint hover:text-cream transition-colors disabled:opacity-40"
                ><Icon icon="lucide:copy" class="w-3 h-3" /></button>
              </div>

              <div v-if="link.visibility === 'private' && link.access_code" class="flex items-center gap-1.5">
                <Icon icon="lucide:key-round" class="w-3 h-3 text-amber shrink-0" />
                <span class="text-[10px] font-mono text-amber tracking-widest">{{ link.access_code }}</span>
              </div>

              <div class="flex items-center gap-3 text-[10px] text-cream-faint border-t border-charcoal-700/50 pt-2">
                <span class="flex items-center gap-1"><Icon icon="lucide:eye" class="w-3 h-3" /> {{ link.views }}</span>
                <span class="flex items-center gap-1 ml-auto"><Icon icon="lucide:clock" class="w-3 h-3" /> {{ fmtDateTime(link.last_viewed_at) }}</span>
              </div>

              <div v-if="link.view_log.length > 0" class="space-y-1 border-t border-charcoal-700/50 pt-2">
                <p class="text-[9px] uppercase tracking-wider text-cream-faint">Recent Views</p>
                <div v-for="(entry, i) in link.view_log.slice(0, 5)" :key="i" class="flex items-center justify-between text-[10px] text-cream-faint">
                  <span>{{ entry.browser }}</span>
                  <span>{{ fmtDateTime(entry.timestamp) }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Empty state -->
          <div v-else class="bg-charcoal-800 border border-dashed border-charcoal-600 rounded-xl p-6 flex flex-col items-center text-center gap-2">
            <Icon icon="lucide:share-2" class="w-8 h-8 text-cream-faint" />
            <p class="text-xs font-medium text-cream-muted">No shared links yet</p>
            <p class="text-[11px] text-cream-faint">Generate a link to share this invoice with clients</p>
            <button @click="showShareModal = true" class="mt-2 flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-amber/10 hover:bg-amber/15 border border-amber/20 text-amber rounded-lg transition-colors">
              <Icon icon="lucide:plus" class="w-3.5 h-3.5" /> Create Link
            </button>
          </div>

        </div>

      </div><!-- /two-column grid -->

    </template>

    <!-- Share modal -->
    <ShareLinkModal
      v-if="showShareModal && invoice"
      resource-type="invoice"
      :org-id="orgId"
      :resource-id="invoice.id"
      :resource-name="invoice.number"
      @close="showShareModal = false; refreshLinks()"
    />

    <!-- Delete confirm -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showDeleteConfirm && invoice" class="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" @click.self="showDeleteConfirm = false">
          <div class="bg-charcoal-800 border border-charcoal-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl space-y-4">
            <div class="flex items-start gap-3">
              <div class="w-9 h-9 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0">
                <Icon icon="lucide:trash-2" class="w-4 h-4 text-red-400" />
              </div>
              <div>
                <h3 class="text-sm font-semibold text-cream">Delete {{ invoice.number }}?</h3>
                <p class="text-xs text-cream-faint mt-1 leading-relaxed">This invoice will be permanently deleted. This action cannot be undone.</p>
              </div>
            </div>
            <div class="flex justify-end gap-2">
              <button @click="showDeleteConfirm = false" :disabled="isDeleting" class="px-4 py-2 text-xs font-medium text-cream-faint hover:text-cream bg-charcoal-700 hover:bg-charcoal-600 border border-charcoal-600 rounded-lg transition-colors disabled:opacity-50">Cancel</button>
              <button @click="handleDelete" :disabled="isDeleting" class="px-4 py-2 text-xs font-semibold text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1.5">
                <Icon v-if="isDeleting" icon="lucide:loader-2" class="w-3 h-3 animate-spin" />
                Delete
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
