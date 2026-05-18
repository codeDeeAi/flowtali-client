<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { Icon } from '@iconify/vue';
import { useNotification } from '@/composables/notification.ts';
import { useSharedLinksStore } from '@/stores/sharedLinks';
import ShareLinkModal from '@/components/modals/ShareLinkModal.vue';

const router = useRouter();
const route  = useRoute();
const { notify } = useNotification();
const linksStore = useSharedLinksStore();
const showShareModal = ref(false);

interface LineItem { id: number; description: string; qty: number; rate: number; }
interface Invoice {
  id: number; number: string; status: 'Draft' | 'Due' | 'Paid' | 'Overdue'; stamp: string;
  fromName: string; fromEmail: string; fromPhone: string; fromAddress: string;
  toName: string;   toEmail: string;  toPhone: string;  toAddress: string;
  issueDate: string; dueDate: string; currency: string; discount: number; tax: number;
  notes: string; accentColor: string; items: LineItem[];
}

const mockInvoices: Invoice[] = [
  { id: 1, number: 'INV-0042', status: 'Paid',    stamp: 'PAID',
    fromName: 'Acme Design Studio', fromEmail: 'hello@acme.studio', fromPhone: '+1 415 555 0199', fromAddress: '123 Design Street\nSan Francisco, CA 94105',
    toName: 'Globex Corp', toEmail: 'billing@globex.com', toPhone: '+1 212 555 0100', toAddress: '742 Evergreen Terrace\nSpringfield, IL 62701',
    issueDate: '2025-03-15', dueDate: '2025-04-14', currency: 'USD', discount: 0, tax: 0, accentColor: '#E8A83E',
    notes: 'Payment due within 30 days. Thank you for your business.',
    items: [{ id: 1, description: 'Brand Identity Design', qty: 1, rate: 3500 }, { id: 2, description: 'Web Development (40h)', qty: 40, rate: 100 }, { id: 3, description: 'Hosting Setup', qty: 1, rate: 1050 }] },
  { id: 2, number: 'INV-0041', status: 'Due',     stamp: '',
    fromName: 'Acme Design Studio', fromEmail: 'hello@acme.studio', fromPhone: '+1 415 555 0199', fromAddress: '123 Design Street\nSan Francisco, CA 94105',
    toName: 'Pixel Works', toEmail: 'accounts@pxl.io', toPhone: '+44 20 7946 0958', toAddress: '10 Downing St\nLondon SW1A 2AA',
    issueDate: '2025-03-10', dueDate: '2025-04-10', currency: 'GBP', discount: 5, tax: 20, accentColor: '#a78bfa',
    notes: 'Includes 20% VAT. Payment via bank transfer preferred.',
    items: [{ id: 1, description: 'UI Component Library', qty: 1, rate: 2800 }, { id: 2, description: 'Design Review Session', qty: 2, rate: 200 }] },
  { id: 3, number: 'INV-0040', status: 'Overdue', stamp: '',
    fromName: 'Acme Design Studio', fromEmail: 'hello@acme.studio', fromPhone: '+1 415 555 0199', fromAddress: '123 Design Street\nSan Francisco, CA 94105',
    toName: 'Nova Agency', toEmail: 'finance@nova.co', toPhone: '+233 30 295 0100', toAddress: 'Ring Road Central\nAccra, Ghana',
    issueDate: '2025-02-28', dueDate: '2025-03-28', currency: 'USD', discount: 0, tax: 0, accentColor: '#f87171',
    notes: 'This invoice is overdue. Please arrange payment immediately.',
    items: [{ id: 1, description: 'Campaign Visuals', qty: 1, rate: 5800 }] },
  { id: 4, number: 'INV-0039', status: 'Paid',    stamp: 'PAID',
    fromName: 'Acme Design Studio', fromEmail: 'hello@acme.studio', fromPhone: '+1 415 555 0199', fromAddress: '123 Design Street\nSan Francisco, CA 94105',
    toName: 'Bright Minds', toEmail: 'pay@brightminds.io', toPhone: '+1 512 555 0100', toAddress: '1600 Pennsylvania Ave\nAustin, TX 78701',
    issueDate: '2025-02-20', dueDate: '2025-03-20', currency: 'USD', discount: 0, tax: 0, accentColor: '#4ade80',
    notes: 'Thank you for your prompt payment!',
    items: [{ id: 1, description: 'Logo Design', qty: 1, rate: 1200 }] },
  { id: 5, number: 'INV-0038', status: 'Draft',   stamp: 'DRAFT',
    fromName: 'Acme Design Studio', fromEmail: 'hello@acme.studio', fromPhone: '+1 415 555 0199', fromAddress: '123 Design Street\nSan Francisco, CA 94105',
    toName: 'Studio X', toEmail: 'hello@studiox.co', toPhone: '+1 415 555 0199', toAddress: '555 Mission St\nSan Francisco, CA 94105',
    issueDate: '2025-03-18', dueDate: '2025-04-17', currency: 'USD', discount: 0, tax: 0, accentColor: '#e8a83e',
    notes: 'Production design and creative direction for Q2 campaign.',
    items: [{ id: 1, description: 'Production Design', qty: 1, rate: 4200 }, { id: 2, description: 'Creative Direction', qty: 20, rate: 140 }] },
];

const invoice  = ref<Invoice | null>(null);
const loading  = ref(true);
const notFound = ref(false);
const showDeleteConfirm = ref(false);

onMounted(async () => {
  await new Promise(r => setTimeout(r, 300));
  const id   = Number(route.params.id);
  const data = mockInvoices.find(i => i.id === id);
  if (!data) { notFound.value = true; loading.value = false; return; }
  invoice.value = data;
  loading.value = false;
});

const currencySymbol: Record<string, string> = {
  USD:'$', EUR:'€', GBP:'£', NGN:'₦', CAD:'CA$', AUD:'A$', JPY:'¥', INR:'₹', ZAR:'R',
};
const sym = computed(() => invoice.value ? (currencySymbol[invoice.value.currency] ?? '$') : '$');

const subtotal    = computed(() => invoice.value?.items.reduce((s, i) => s + i.qty * i.rate, 0) ?? 0);
const discountAmt = computed(() => subtotal.value * ((invoice.value?.discount ?? 0) / 100));
const taxAmt      = computed(() => (subtotal.value - discountAmt.value) * ((invoice.value?.tax ?? 0) / 100));
const total       = computed(() => subtotal.value - discountAmt.value + taxAmt.value);
const fmtMoney    = (n: number) => sym.value + n.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const formatDate = (d: string) => {
  if (!d) return '';
  const [y, m, day] = d.split('-');
  if (!y || !m || !day) return d;
  return new Date(+y, +m - 1, +day).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
};

const statusClass: Record<string, string> = {
  Paid: 'status-paid', Due: 'status-due', Overdue: 'status-overdue', Draft: 'status-draft',
};

const markPaid = () => {
  if (!invoice.value) return;
  invoice.value.status = 'Paid';
  invoice.value.stamp  = 'PAID';
  notify(`${invoice.value.number} marked as paid`, 'success');
};

const handlePrint = () => window.print()

// ── Links analytics ──────────────────────────────────────────────────────────
const links = computed(() =>
  invoice.value
    ? linksStore.forResource('invoice', invoice.value.id)
        .slice()
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    : []
)
const totalViews  = computed(() => links.value.reduce((s, l) => s + l.views, 0))
const activeLinks = computed(() => links.value.filter(l => l.isActive && !linksStore.isExpired(l)).length)

function linkUrl(token: string): string {
  return `${window.location.origin}/share/i/${token}`;
}
function copyLink(token: string) {
  navigator.clipboard.writeText(linkUrl(token)).catch(() => {});
  notify('Link copied to clipboard', 'success');
}
function statusLabel(link: ReturnType<typeof linksStore.forResource>[0]) {
  if (!link.isActive) return { text: 'Revoked', cls: 'text-red-400 bg-red-500/10 border-red-500/20' }
  if (linksStore.isExpired(link)) return { text: 'Expired', cls: 'text-gray-400 bg-charcoal-700 border-charcoal-600' }
  return { text: 'Active', cls: 'text-green-400 bg-green-500/10 border-green-500/20' }
}
function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
function fmtDateTime(iso: string | null): string {
  if (!iso) return 'Never';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function expiryLabel(link: ReturnType<typeof linksStore.forResource>[0]): string {
  if (!link.expiresAt) return 'Never expires';
  if (linksStore.isExpired(link)) return `Expired ${fmtDate(link.expiresAt)}`;
  return `Expires ${fmtDate(link.expiresAt)}`;
}

const handleDelete = () => {
  if (!invoice.value) return;
  notify(`${invoice.value.number} deleted`, 'success');
  router.push({ name: 'invoices' });
};
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
              <span :class="['status-badge', statusClass[invoice.status]]">{{ invoice.status }}</span>
            </div>
            <p class="page-subtitle">{{ invoice.toName }} · Due {{ formatDate(invoice.dueDate) }}</p>
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
            v-if="invoice.status !== 'Paid'"
            @click="markPaid"
            class="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 text-green-400 rounded-lg transition-colors"
          >
            <Icon icon="lucide:check-circle" class="w-3.5 h-3.5" /> Mark Paid
          </button>
          <button @click="router.push({ name: 'invoices.edit', params: { id: invoice.id } })" class="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-amber hover:bg-amber-light text-charcoal-900 font-semibold rounded-lg transition-colors">
            <Icon icon="lucide:pencil" class="w-3.5 h-3.5" /> Edit
          </button>
          <button @click="showDeleteConfirm = true" class="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 rounded-lg transition-colors">
            <Icon icon="lucide:trash-2" class="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <!-- Two-column: invoice + links analytics -->
      <div class="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-5">

      <!-- Invoice document preview -->
      <div class="bg-charcoal-700/30 rounded-xl p-6 flex justify-center">
        <div class="print-document w-full max-w-2xl bg-white rounded-lg shadow-2xl overflow-hidden text-gray-800 relative" style="font-family: 'DM Sans', sans-serif; font-size: 13px;">
          <div class="h-1.5 w-full" :style="{ backgroundColor: invoice.accentColor }"></div>
          <div class="p-10">
            <div class="flex justify-between items-start mb-8">
              <div>
                <div class="text-xl font-bold mb-0.5" :style="{ color: invoice.accentColor }">{{ invoice.fromName }}</div>
                <div class="text-xs text-gray-400 whitespace-pre-line leading-relaxed">{{ invoice.fromAddress }}</div>
                <div v-if="invoice.fromEmail" class="text-xs text-gray-400 mt-1">{{ invoice.fromEmail }}</div>
                <div v-if="invoice.fromPhone" class="text-xs text-gray-400">{{ invoice.fromPhone }}</div>
              </div>
              <div class="text-right">
                <div class="text-3xl font-bold text-gray-700 tracking-wide" style="font-family: 'Cormorant Garamond', serif">INVOICE</div>
                <div class="font-mono text-sm text-gray-400 mt-1">{{ invoice.number }}</div>
              </div>
            </div>
            <div class="flex gap-8 mb-8 text-xs">
              <div><div class="text-gray-400 uppercase tracking-wider mb-1">Issue Date</div><div class="font-medium text-gray-700">{{ formatDate(invoice.issueDate) }}</div></div>
              <div><div class="text-gray-400 uppercase tracking-wider mb-1">Due Date</div><div class="font-medium text-gray-700">{{ formatDate(invoice.dueDate) }}</div></div>
              <div v-if="invoice.currency !== 'USD'"><div class="text-gray-400 uppercase tracking-wider mb-1">Currency</div><div class="font-medium text-gray-700">{{ invoice.currency }}</div></div>
            </div>
            <div class="mb-8">
              <div class="text-[10px] uppercase tracking-widest text-gray-400 mb-2">Bill To</div>
              <div class="font-semibold text-gray-800">{{ invoice.toName }}</div>
              <div v-if="invoice.toEmail" class="text-xs text-gray-500">{{ invoice.toEmail }}</div>
              <div v-if="invoice.toPhone" class="text-xs text-gray-500">{{ invoice.toPhone }}</div>
              <div v-if="invoice.toAddress" class="text-xs text-gray-500 whitespace-pre-line mt-1">{{ invoice.toAddress }}</div>
            </div>
            <table class="w-full mb-6 text-sm">
              <thead>
                <tr :style="{ backgroundColor: invoice.accentColor + '18' }">
                  <th class="text-left py-2.5 px-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">Description</th>
                  <th class="text-center py-2.5 px-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">Qty</th>
                  <th class="text-right py-2.5 px-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">Rate</th>
                  <th class="text-right py-2.5 px-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in invoice.items" :key="item.id" class="border-b border-gray-100">
                  <td class="py-3 px-3 text-gray-700">{{ item.description }}</td>
                  <td class="py-3 px-3 text-center text-gray-500">{{ item.qty }}</td>
                  <td class="py-3 px-3 text-right text-gray-500">{{ fmtMoney(item.rate) }}</td>
                  <td class="py-3 px-3 text-right font-medium text-gray-800">{{ fmtMoney(item.qty * item.rate) }}</td>
                </tr>
              </tbody>
            </table>
            <div class="flex justify-end mb-6">
              <div class="w-56 space-y-1.5 text-sm">
                <div class="flex justify-between text-gray-500"><span>Subtotal</span><span class="font-mono">{{ fmtMoney(subtotal) }}</span></div>
                <div v-if="invoice.discount > 0" class="flex justify-between text-gray-500"><span>Discount ({{ invoice.discount }}%)</span><span class="font-mono text-red-500">-{{ fmtMoney(discountAmt) }}</span></div>
                <div v-if="invoice.tax > 0" class="flex justify-between text-gray-500"><span>Tax ({{ invoice.tax }}%)</span><span class="font-mono">{{ fmtMoney(taxAmt) }}</span></div>
                <div class="h-px bg-gray-200 my-2"></div>
                <div class="flex justify-between font-bold text-base"><span>Total</span><span class="font-mono" :style="{ color: invoice.accentColor }">{{ fmtMoney(total) }}</span></div>
              </div>
            </div>
            <div v-if="invoice.notes" class="border-t border-gray-100 pt-6">
              <div class="text-[10px] uppercase tracking-widest text-gray-400 mb-1.5">Notes</div>
              <p class="text-xs text-gray-500 leading-relaxed">{{ invoice.notes }}</p>
            </div>
            <div class="mt-8 text-center"><div class="text-[10px] text-gray-300">Generated with Flowtali · flowtali.io</div></div>
            <div v-if="invoice.stamp" class="absolute inset-0 flex items-center justify-center pointer-events-none" style="transform:rotate(-25deg)">
              <div class="text-5xl font-extrabold tracking-widest border-4 px-6 py-3 rounded opacity-20"
                :style="{ color: invoice.stamp === 'PAID' ? '#4ade80' : invoice.stamp === 'VOID' ? '#f87171' : '#9ca3af', borderColor: 'currentColor' }"
              >{{ invoice.stamp }}</div>
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
                  <span :class="['text-[9px] px-1.5 py-0.5 rounded border font-medium', statusLabel(link).cls]">{{ statusLabel(link).text }}</span>
                </div>
                <p class="text-[10px] text-cream-faint mt-0.5">{{ expiryLabel(link) }}</p>
              </div>
              <span class="text-[9px] px-1.5 py-0.5 rounded border font-medium text-cream-faint border-charcoal-600 bg-charcoal-700 shrink-0">
                {{ link.visibility === 'private' ? 'Private' : 'Public' }}
              </span>
            </div>

            <!-- URL -->
            <div class="flex items-center gap-1.5">
              <div class="flex-1 min-w-0 bg-charcoal-900/60 border border-charcoal-700 rounded px-2 py-1">
                <p class="text-[10px] font-mono text-cream-faint truncate">{{ linkUrl(link.token) }}</p>
              </div>
              <button
                @click="copyLink(link.token)"
                :disabled="!link.isActive || linksStore.isExpired(link)"
                class="p-1 rounded bg-charcoal-700 hover:bg-charcoal-600 border border-charcoal-600 text-cream-faint hover:text-cream transition-colors disabled:opacity-40"
              ><Icon icon="lucide:copy" class="w-3 h-3" /></button>
            </div>

            <!-- Access code -->
            <div v-if="link.visibility === 'private'" class="flex items-center gap-1.5">
              <Icon icon="lucide:key-round" class="w-3 h-3 text-amber shrink-0" />
              <span class="text-[10px] font-mono text-amber tracking-widest">{{ link.accessCode }}</span>
            </div>

            <!-- Stats -->
            <div class="flex items-center gap-3 text-[10px] text-cream-faint border-t border-charcoal-700/50 pt-2">
              <span class="flex items-center gap-1"><Icon icon="lucide:eye" class="w-3 h-3" /> {{ link.views }}</span>
              <span class="flex items-center gap-1 ml-auto"><Icon icon="lucide:clock" class="w-3 h-3" /> {{ fmtDateTime(link.lastViewedAt) }}</span>
            </div>

            <!-- View log -->
            <div v-if="link.viewLog.length > 0" class="space-y-1 border-t border-charcoal-700/50 pt-2">
              <p class="text-[9px] uppercase tracking-wider text-cream-faint">Recent Views</p>
              <div v-for="(entry, i) in link.viewLog.slice(0, 5)" :key="i" class="flex items-center justify-between text-[10px] text-cream-faint">
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
      :resource-id="invoice.id"
      :resource-name="invoice.number"
      @close="showShareModal = false"
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
              <button @click="showDeleteConfirm = false" class="px-4 py-2 text-xs font-medium text-cream-faint hover:text-cream bg-charcoal-700 hover:bg-charcoal-600 border border-charcoal-600 rounded-lg transition-colors">Cancel</button>
              <button @click="handleDelete" class="px-4 py-2 text-xs font-semibold text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors">Delete</button>
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
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    box-shadow: none !important;
  }
  @page { margin: 0; size: A4; }
}
</style>
